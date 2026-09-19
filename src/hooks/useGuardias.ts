/**
 * React hook that loads guard records, normalizes them into municipalities and
 * keeps a live "now" clock for real-time availability updates.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { fetchGuardiaRecords } from '../api/client'
import { normalizeMunicipalities } from '../domain/normalize'
import { MADRID_TIMEZONE } from '../domain/types'
import type { Municipality } from '../domain/types'

export type GuardiasStatus = 'loading' | 'ready' | 'error'

export interface GuardiasState {
  status: GuardiasStatus
  municipalities: Municipality[]
  /** Current instant pinned to Europe/Madrid. */
  now: DateTime
  /** Error when status === 'error'. */
  error: Error | null
  refresh: () => void
}

/** How often the "now" clock ticks (drives open/closed transitions). */
const NOW_TICK_MS = 30 * 1000

/** How often data is re-fetched in the background. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const RETRY_DELAY_MS = 8 * 1000

export function useGuardias(): GuardiasState {
  const [status, setStatus] = useState<GuardiasStatus>('loading')
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [now, setNow] = useState<DateTime>(() => DateTime.now().setZone(MADRID_TIMEZONE))
  const [reloadToken, setReloadToken] = useState(0)
  const requestSeq = useRef(0)

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const seq = ++requestSeq.current

    async function load() {
      try {
        const records = await fetchGuardiaRecords({ now: DateTime.now() })
        if (cancelled || seq !== requestSeq.current) return
        setMunicipalities(normalizeMunicipalities(records))
        setStatus('ready')
        setError(null)
      } catch (cause) {
        if (cancelled || seq !== requestSeq.current) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // Retry automatically a few seconds after a failure.
  useEffect(() => {
    if (status !== 'error') return
    const timer = window.setTimeout(() => setReloadToken((t) => t + 1), RETRY_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  // Background refresh every 5 minutes and when the tab regains focus.
  useEffect(() => {
    const interval = window.setInterval(() => setReloadToken((t) => t + 1), REFRESH_INTERVAL_MS)
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        setReloadToken((t) => t + 1)
      }
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Keep a live clock so availability flips as shifts open/close.
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(DateTime.now().setZone(MADRID_TIMEZONE)),
      NOW_TICK_MS,
    )
    return () => window.clearInterval(timer)
  }, [])

  const errorValue = status === 'error' ? (error ?? new Error('Unknown error')) : null

  return { status, municipalities, now, error: errorValue, refresh }
}
