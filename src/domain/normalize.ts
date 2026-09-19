/**
 * Normalization of raw COF Cádiz records into the internal Pharmacy model.
 */

import { DateTime } from 'luxon'
import type { GuardiaContacto, GuardiaRecord, GuardiaHorario } from '../api/types'
import type {
  Pharmacy,
  ShiftInterval,
  ShiftKind,
  Municipality,
} from './types'
import { dateTimeOn, parseApiDate } from './time'
import { toMunicipalityDisplayName, toMunicipalityId } from './municipality'

/**
 * Classify the raw schedule description into a ShiftKind.
 *
 * The API uses free-form `tipo` strings; observed variants:
 * - "Atención Permanente (Localizada)"          -> onCallOnly
 * - "Día y Noche (24 horas)" / "DURANTE LAS 24 HORAS" -> fullDay
 * - "SERVICIO DIURNO ..." / "DIURNO ..."        -> day
 * - "SERVICIO NOCTURNO ..."                     -> night
 */
export function classifyShiftKind(horario: GuardiaHorario): ShiftKind {
  const label = horario.tipo.trim().toLowerCase()

  if (label.includes('localizada') && !label.includes('nocturno')) {
    return 'onCallOnly'
  }
  if (label.includes('nocturno')) return 'night'
  if (label.includes('diurno')) return 'day'
  if (label.includes('24')) return 'fullDay'

  // Fall back to comparing times: a shift ending on the next day is a night
  // shift; a same-day shift starting around 9 is a day shift.
  if (horario.cierre_dia_siguiente) return 'night'
  return 'day'
}

/**
 * Convert one raw schedule block into a real time interval.
 * Returns null for unparseable times (defensive: skip instead of crashing).
 */
export function toShiftInterval(
  horario: GuardiaHorario,
  shiftDate: DateTime,
): ShiftInterval | null {
  let start: DateTime
  let end: DateTime

  try {
    start = dateTimeOn(shiftDate, horario.hora_apertura)
    end = horario.cierre_dia_siguiente
      ? dateTimeOn(shiftDate.plus({ days: 1 }), horario.hora_cierre)
      : dateTimeOn(shiftDate, horario.hora_cierre)
  } catch {
    return null
  }

  const kind = classifyShiftKind(horario)
  const isOnCallOnly = kind === 'onCallOnly'

  // Defensive: "localizada" blocks carry 00:00–00:00 (+1d); treat them as a
  // full 24h phone window instead of a zero-length interval.
  if (isOnCallOnly && end <= start) {
    end = start.plus({ days: 1 })
  }

  return { start, end, kind, isOnCallOnly, label: horario.tipo.trim() }
}

/** Choose the best contact record (first with an address or a phone). */
function pickContact(record: GuardiaRecord): GuardiaContacto | undefined {
  const contacts = record.contactos_profesionales ?? []
  return contacts.find((c) => c.direccion) ?? contacts[0]
}

function parseCoordinates(raw: string | undefined): { lat: number; lng: number } | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const [lat, lng] = parsed as [unknown, unknown]
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng }
      }
    }
  } catch {
    // Ignore malformed coordinates.
  }
  return null
}

/**
 * Normalize one raw API record into a Pharmacy. Records whose schedules all
 * fail to parse still produce a Pharmacy (with an empty interval list).
 */
export function normalizePharmacy(record: GuardiaRecord): Pharmacy {
  const contact = pickContact(record)
  const shiftDate = parseApiDate(record.fecha)
  const rawMunicipality = contact?.municipio ?? record.zona_guardia
  const municipalityName = toMunicipalityDisplayName(rawMunicipality)

  return {
    soe: record.soe,
    // Prefer the commercial "nombre" (e.g. "Farmacia X") over the fiscal name.
    pharmacyName: record.nombre || record.nombre_fiscal || '',
    municipalityId: toMunicipalityId(rawMunicipality),
    municipalityName,
    guardZone: record.zona_guardia,
    address: contact?.direccion ?? '',
    phone: contact?.telefono ?? '',
    coordinates: parseCoordinates(contact?.coordenadas),
    intervals: (record.horarios ?? [])
      .map((h) => toShiftInterval(h, shiftDate))
      .filter((i): i is ShiftInterval => i !== null),
  }
}

/**
 * Group pharmacies by municipality, preserving the API ordering inside each
 * group and returning municipalities sorted alphabetically by display name.
 */
export function groupByMunicipality(pharmacies: Pharmacy[]): Municipality[] {
  const byId = new Map<string, Municipality>()

  for (const pharmacy of pharmacies) {
    const existing = byId.get(pharmacy.municipalityId)
    if (existing) {
      existing.pharmacies.push(pharmacy)
    } else {
      byId.set(pharmacy.municipalityId, {
        id: pharmacy.municipalityId,
        name: pharmacy.municipalityName,
        pharmacies: [pharmacy],
      })
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  )
}

/**
 * Normalize a full raw payload (already merged across dates) into
 * municipalities. Deduplicates pharmacies by SOE + date interval set.
 */
export function normalizeMunicipalities(records: GuardiaRecord[]): Municipality[] {
  const pharmacies = records.map(normalizePharmacy)
  return groupByMunicipality(dedupePharmacies(pharmacies))
}

/** Remove exact duplicates (same SOE and identical interval set). */
function dedupePharmacies(pharmacies: Pharmacy[]): Pharmacy[] {
  const seen = new Map<string, Pharmacy>()
  for ( const pharmacy of pharmacies) {
    const key = pharmacyKey(pharmacy)
    const previous = seen.get(key)
    if (!previous || previous.intervals.length < pharmacy.intervals.length) {
      seen.set(key, pharmacy)
    }
  }
  return [...seen.values()]
}

function pharmacyKey(pharmacy: Pharmacy): string {
  return [
    pharmacy.soe,
    pharmacy.intervals
      .map((i) => `${i.start.toISO()}|${i.end.toISO()}`)
      .sort()
      .join(';'),
  ].join('#')
}
