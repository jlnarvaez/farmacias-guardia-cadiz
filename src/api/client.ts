/**
 * Data access for the public COF Cádiz guard endpoint, with a two-tier cache
 * (in-memory + localStorage, TTL ~15 minutes) and merging of today/yesterday
 * payloads so overnight shifts remain visible in the early morning.
 */

import { DateTime } from 'luxon'
import type { GuardiaRecord, GuardiaResponse } from '../api/types'
import { MADRID_TIMEZONE } from '../domain/types'

const ENDPOINT = 'https://www.cofcadiz.es/wp-json/vcomm/v1/farmacias/guardia'

const DEFAULT_QUERY: Record<string, string> = {
  estilo: 'completo',
  servicios: '',
  tipo: '',
  orden: 'soe DESC,hora_entrada ASC',
  b: '',
  limit: '1000',
}

/** How long a cached payload stays fresh. */
export const CACHE_TTL_MS = 15 * 60 * 1000

const CACHE_KEY = 'farmacias-guardia-cadiz:guardias:v1'

interface CacheEntry {
  fetchedAtMs: number
  records: GuardiaRecord[]
}

interface FetchGuardiasOptions {
  now?: DateTime
  /** Skip both caches and force a network round-trip. */
  forceRefresh?: boolean
  fetchImpl?: typeof fetch
}

function buildUrl(date: string): string {
  const params = new URLSearchParams({ ...DEFAULT_QUERY, fecha: date })
  return `${ENDPOINT}?${params.toString()}`
}

function isoDate(date: DateTime): string {
  return date.toISODate() as string
}

async function fetchDate(
  date: DateTime,
  fetchImpl: typeof fetch,
): Promise<GuardiaRecord[]> {
  const response = await fetchImpl(buildUrl(isoDate(date)), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`COF endpoint returned ${response.status} for ${isoDate(date)}`)
  }
  const payload = (await response.json()) as GuardiaResponse
  return payload.informacion ?? []
}

function readCache(): CacheEntry | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (
      typeof parsed.fetchedAtMs !== 'number' ||
      !Array.isArray(parsed.records)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage may be unavailable (private mode, quota); cache is optional.
  }
}

/** True when the cache entry is younger than the TTL. */
export function isCacheFresh(entry: CacheEntry | null, nowMs: number): boolean {
  return entry !== null && nowMs - entry.fetchedAtMs < CACHE_TTL_MS
}

/** Load raw guard records for today and yesterday, merged and deduplicated. */
export async function fetchGuardiaRecords(
  options: FetchGuardiasOptions = {},
): Promise<GuardiaRecord[]> {
  const { now = DateTime.now(), forceRefresh = false, fetchImpl = fetch } = options

  if (!forceRefresh) {
    const cached = readCache()
    if (isCacheFresh(cached, Date.now())) {
      return cached!.records
    }
  }

  const madridNow = now.setZone(MADRID_TIMEZONE)
  const today = madridNow.startOf('day')
  const yesterday = today.minus({ days: 1 })

  // Both dates are independent requests; yesterday may legitimately fail
  // without invalidating today's data.
  const [todayResult, yesterdayResult] = await Promise.allSettled([
    fetchDate(today, fetchImpl),
    fetchDate(yesterday, fetchImpl),
  ])

  const errors: unknown[] = []
  if (todayResult.status === 'rejected') errors.push(todayResult.reason)
  if (yesterdayResult.status === 'rejected') errors.push(yesterdayResult.reason)

  if (errors.length === 2) {
    throw errors[0]
  }

  const todayRecords = todayResult.status === 'fulfilled' ? todayResult.value : []
  const yesterdayRecords =
    yesterdayResult.status === 'fulfilled' ? yesterdayResult.value : []

  const records = mergeRecords(todayRecords, yesterdayRecords)

  writeCache({ fetchedAtMs: Date.now(), records })
  return records
}

/**
 * Merge today's and yesterday's records. Yesterday's records are only useful
 * for their overnight shifts (early-morning window); duplicates (same SOE
 * appearing on both days) keep both entries, since the intervals differ.
 */
export function mergeRecords(
  today: GuardiaRecord[],
  yesterday: GuardiaRecord[],
): GuardiaRecord[] {
  return [...today, ...yesterday]
}
