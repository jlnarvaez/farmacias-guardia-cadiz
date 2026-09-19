/**
 * Internal domain model for pharmacies on guard duty and their shift intervals.
 */

import type { DateTime } from 'luxon'

/** Timezone everything is computed in, regardless of the user's device. */
export const MADRID_TIMEZONE = 'Europe/Madrid'

/** Kind of guard shift, classified from the API `tipo` description. */
export type ShiftKind = 'day' | 'night' | 'fullDay' | 'onCallOnly'

export interface ShiftInterval {
  /** Real start instant in Europe/Madrid. */
  start: DateTime
  /** Real end instant in Europe/Madrid (exclusive). */
  end: DateTime
  kind: ShiftKind
  /**
   * True for "Atención Permanente (Localizada)": the pharmacist is reachable
   * by phone 24h, but the physical pharmacy is not open to the public.
   */
  isOnCallOnly: boolean
  /** Original schedule description from the API, kept for display. */
  label: string
}

export interface Pharmacy {
  /** Unique COF code for the pharmacy on duty. */
  soe: string
  pharmacyName: string
  /** Normalized municipality key (slug, used for routing and grouping). */
  municipalityId: string
  /** Municipality display name, e.g. "Los Barrios". */
  municipalityName: string
  /** Raw guard zone from the API, e.g. "LOS BARRIOS". */
  guardZone: string
  address: string
  phone: string
  coordinates: { lat: number; lng: number } | null
  intervals: ShiftInterval[]
}

export interface Municipality {
  /** Normalized id shared with Pharmacy.municipalityId. */
  id: string
  /** Display name in Spanish, e.g. "Alcalá de los Gazules". */
  name: string
  /** Pharmacies on guard in this municipality (across the loaded dates). */
  pharmacies: Pharmacy[]
}
