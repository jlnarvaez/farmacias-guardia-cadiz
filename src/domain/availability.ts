/**
 * Core availability engine: given the normalized pharmacies and an instant,
 * decide which shifts are physically open, which are phone-only, and which
 * will open within the next 12 hours. Closed shifts never appear in listings.
 */

import { DateTime } from 'luxon'
import type { Municipality, Pharmacy, ShiftInterval } from './types'

export type ShiftStatus = 'openNow' | 'onCallNow' | 'opensSoon'

/**
 * Only shifts opening within this window are listed as upcoming; anything
 * further away (or already closed) is hidden from the listings.
 */
export const UPCOMING_WINDOW_HOURS = 12

export interface ShiftWithStatus {
  interval: ShiftInterval
  status: ShiftStatus
}

export interface MunicipalityAvailability {
  municipality: Municipality
  /** Pharmacies whose physical door is open at the queried instant. */
  openNow: Pharmacy[]
  /** Pharmacies with a 24h phone-only service active right now. */
  onCallNow: Pharmacy[]
  /**
   * Shifts that open within the next 12 hours, sorted by start time. Closed
   * shifts and shifts further away are intentionally excluded.
   */
  upcoming: { pharmacy: Pharmacy; shift: ShiftWithStatus }[]
}

/**
 * Return the physical (non phone-only) interval that contains `now`, if any.
 * A pharmacy may list overlapping blocks; the one covering `now` is shown.
 */
export function findActivePhysicalInterval(
  intervals: ShiftInterval[],
  now: DateTime,
): ShiftInterval | null {
  for (const interval of intervals) {
    if (interval.isOnCallOnly) continue
    if (now >= interval.start && now < interval.end) return interval
  }
  return null
}

/**
 * Return the phone-only interval that contains `now`, if any. When a pharmacy
 * has several phone-only windows, the one covering `now` wins.
 */
export function findActiveOnCallInterval(
  intervals: ShiftInterval[],
  now: DateTime,
): ShiftInterval | null {
  for (const interval of intervals) {
    if (!interval.isOnCallOnly) continue
    if (now >= interval.start && now < interval.end) return interval
  }
  return null
}

/**
 * Pick the next physical shift of the pharmacy that opens within the window
 * after `now`. Returns null when the pharmacy has no such shift.
 */
export function findNextOpeningShift(
  intervals: ShiftInterval[],
  now: DateTime,
  windowHours: number = UPCOMING_WINDOW_HOURS,
): ShiftInterval | null {
  const limit = now.plus({ hours: windowHours })
  let best: ShiftInterval | null = null
  for (const interval of intervals) {
    if (interval.isOnCallOnly) continue
    if (interval.start <= now || interval.start > limit) continue
    if (best === null || interval.start < best.start) best = interval
  }
  return best
}

/**
 * Compute the availability for one municipality at a precise instant.
 *
 * The `today` argument is kept for API compatibility with previous callers
 * and tests; current listing rules only depend on `now`.
 */
export function getMunicipalityAvailability(
  municipality: Municipality,
  now: DateTime,
): MunicipalityAvailability {
  const openNow: Pharmacy[] = []
  const onCallNow: Pharmacy[] = []
  const upcoming: { pharmacy: Pharmacy; shift: ShiftWithStatus }[] = []

  for (const pharmacy of municipality.pharmacies) {
    const activePhysical = findActivePhysicalInterval(pharmacy.intervals, now)
    const activeOnCall = findActiveOnCallInterval(pharmacy.intervals, now)

    if (activePhysical) openNow.push(pharmacy)
    if (activeOnCall) onCallNow.push(pharmacy)

    // Pharmacies already open (physically or by phone) are fully represented
    // in the "open now" sections; no extra upcoming row for them.
    if (activePhysical || activeOnCall) continue

    const nextShift = findNextOpeningShift(pharmacy.intervals, now)
    if (nextShift) {
      upcoming.push({
        pharmacy,
        shift: { interval: nextShift, status: 'opensSoon' },
      })
    }
  }

  upcoming.sort((a, b) =>
    a.shift.interval.start.toMillis() - b.shift.interval.start.toMillis(),
  )

  return { municipality, openNow, onCallNow, upcoming }
}

/**
 * Aggregate availability across all municipalities: which pharmacies are
 * physically open right now, indexed by municipality id.
 */
export function getActivePharmacies(
  municipalities: Municipality[],
  now: DateTime,
): Map<string, MunicipalityAvailability> {
  const result = new Map<string, MunicipalityAvailability>()
  for (const municipality of municipalities) {
    result.set(municipality.id, getMunicipalityAvailability(municipality, now))
  }
  return result
}
