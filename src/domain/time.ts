/**
 * Time parsing helpers built on Luxon, always pinned to Europe/Madrid.
 */

import { DateTime } from 'luxon'
import { MADRID_TIMEZONE } from './types'

/** Parse "HH:MM:SS" (or "HH:MM") into { hour, minute }. */
export function parseTimeOfDay(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim())
  if (!match) {
    throw new Error(`Invalid time of day: "${time}"`)
  }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

/** Parse an API date "YYYY-MM-DD" into a Luxon DateTime at midnight Madrid. */
export function parseApiDate(date: string): DateTime {
  const parsed = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: MADRID_TIMEZONE })
  if (!parsed.isValid) {
    throw new Error(`Invalid API date: "${date}"`)
  }
  return parsed.startOf('day')
}

/** Combine a date + "HH:MM:SS" into a full DateTime in Europe/Madrid. */
export function dateTimeOn(date: DateTime, time: string): DateTime {
  const { hour, minute } = parseTimeOfDay(time)
  return date.set({ hour, minute, second: 0, millisecond: 0 })
}

/** Today in Europe/Madrid (independent of the device timezone). */
export function todayInMadrid(now: DateTime = DateTime.now()): DateTime {
  return now.setZone(MADRID_TIMEZONE).startOf('day')
}

/**
 * Human label for the time remaining until a future instant: whole hours
 * while the remainder is significant (>= 10 min), otherwise minutes.
 * Examples: "2 h", "45 min". Returns null for past instants.
 */
export function formatTimeUntil(target: DateTime, now: DateTime): string | null {
  const diffMinutes = Math.round(target.diff(now, 'minutes').minutes)
  if (diffMinutes < 0) return null
  if (diffMinutes < 10) return `${diffMinutes} min`
  const totalMinutes = Math.floor(diffMinutes / 5) * 5
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

/** "09:00" style label in Europe/Madrid, locale-independent. */
export function formatClock(time: DateTime): string {
  return time.toFormat('HH:mm')
}

/**
 * Marker for a close time that does not fall on the current Madrid calendar
 * day: "mañana" for the next day, otherwise the short Spanish weekday
 * ("mié"). Returns null when the instant is on the same day as `now`.
 */
export function nextDayLabel(target: DateTime, now: DateTime): string | null {
  const targetDay = target.startOf('day')
  const nowDay = now.startOf('day')
  if (targetDay.equals(nowDay)) return null
  const diffDays = Math.round(targetDay.diff(nowDay, 'days').days)
  if (diffDays === 1) return 'mañana'
  return target.setLocale('es').toFormat('ccc')
}
