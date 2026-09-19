/**
 * Unit tests for the shift availability engine, covering the edge cases from
 * the plan: overnight shifts seen the next morning, day/night transitions,
 * double-shift vs 24h municipalities and phone-only "localizada" shifts.
 *
 * All instants are constructed in Europe/Madrid so tests are deterministic
 * regardless of the machine timezone.
 */

import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { classifyShiftKind, toShiftInterval } from '../src/domain/normalize'
import {
  getMunicipalityAvailability,
  findActivePhysicalInterval,
  findActiveOnCallInterval,
  findNextOpeningShift,
} from '../src/domain/availability'
import { formatTimeUntil, nextDayLabel } from '../src/domain/time'
import { MADRID_TIMEZONE, type Municipality, type Pharmacy } from '../src/domain/types'

const TZ = MADRID_TIMEZONE

function at(date: string, time: string): DateTime {
  return DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone: TZ })
}

function makePharmacy(overrides: Partial<Pharmacy> = {}): Pharmacy {
  return {
    soe: 'TEST1',
    pharmacyName: 'Farmacia Test',
    municipalityId: 'cadiz',
    municipalityName: 'Cádiz',
    guardZone: 'CADIZ',
    address: 'C/ Falsa 123',
    phone: '956000000',
    coordinates: null,
    intervals: [],
    ...overrides,
  }
}

function makeMunicipality(pharmacies: Pharmacy[]): Municipality {
  return {
    id: 'cadiz',
    name: 'Cádiz',
    pharmacies,
  }
}

describe('classifyShiftKind', () => {
  it('classifies localizada schedules as onCallOnly', () => {
    expect(
      classifyShiftKind({
        tipo: 'Atención Permanente (Localizada)',
        hora_apertura: '00:00:00',
        hora_cierre: '00:00:00',
        cierre_dia_siguiente: true,
      }),
    ).toBe('onCallOnly')
  })

  it('classifies day, night and 24h schedules', () => {
    expect(
      classifyShiftKind({
        tipo: 'SERVICIO DIURNO (De 9,00 a 22,00 h)',
        hora_apertura: '09:00:00',
        hora_cierre: '22:00:00',
        cierre_dia_siguiente: false,
      }),
    ).toBe('day')

    expect(
      classifyShiftKind({
        tipo: 'SERVICIO NOCTURNO (de 22,00 a 9,00 h)',
        hora_apertura: '22:00:00',
        hora_cierre: '09:00:00',
        cierre_dia_siguiente: true,
      }),
    ).toBe('night')

    expect(
      classifyShiftKind({
        tipo: 'Día y Noche (24 horas)',
        hora_apertura: '09:00:00',
        hora_cierre: '09:00:00',
        cierre_dia_siguiente: true,
      }),
    ).toBe('fullDay')
  })
})

describe('toShiftInterval', () => {
  it('computes same-day intervals when cierre_dia_siguiente is false', () => {
    const interval = toShiftInterval(
      {
        tipo: 'SERVICIO DIURNO',
        hora_apertura: '09:00:00',
        hora_cierre: '22:00:00',
        cierre_dia_siguiente: false,
      },
      at('2026-09-17', '00:00'),
    )

    expect(interval).not.toBeNull()
    expect(interval!.start.equals(at('2026-09-17', '09:00'))).toBe(true)
    expect(interval!.end.equals(at('2026-09-17', '22:00'))).toBe(true)
  })

  it('computes next-day end when cierre_dia_siguiente is true', () => {
    const interval = toShiftInterval(
      {
        tipo: 'SERVICIO NOCTURNO',
        hora_apertura: '22:00:00',
        hora_cierre: '09:00:00',
        cierre_dia_siguiente: true,
      },
      at('2026-09-17', '00:00'),
    )

    expect(interval).not.toBeNull()
    expect(interval!.start.equals(at('2026-09-17', '22:00'))).toBe(true)
    expect(interval!.end.equals(at('2026-09-18', '09:00'))).toBe(true)
  })

  it('expands localizada 00:00-00:00 into a full 24h phone window', () => {
    const interval = toShiftInterval(
      {
        tipo: 'Atención Permanente (Localizada)',
        hora_apertura: '00:00:00',
        hora_cierre: '00:00:00',
        cierre_dia_siguiente: true,
      },
      at('2026-09-17', '00:00'),
    )

    expect(interval).not.toBeNull()
    expect(interval!.isOnCallOnly).toBe(true)
    expect(interval!.end.equals(at('2026-09-18', '00:00'))).toBe(true)
  })
})

describe('interval lookup helpers', () => {
  const dayShift = {
    tipo: 'SERVICIO DIURNO (De 9,00 a 22,00 h)',
    hora_apertura: '09:00:00',
    hora_cierre: '22:00:00',
    cierre_dia_siguiente: false,
  }
  const localizada = {
    tipo: 'Atención Permanente (Localizada)',
    hora_apertura: '00:00:00',
    hora_cierre: '00:00:00',
    cierre_dia_siguiente: true,
  }

  it('findActivePhysicalInterval returns only the interval covering now', () => {
    const intervals = [
      toShiftInterval(dayShift, at('2026-09-17', '00:00'))!,
      toShiftInterval(localizada, at('2026-09-17', '00:00'))!,
    ]

    expect(findActivePhysicalInterval(intervals, at('2026-09-17', '12:00'))?.start.hour).toBe(9)
    expect(findActivePhysicalInterval(intervals, at('2026-09-17', '23:00'))).toBeNull()
    // The localizada window is active but must never be returned as physical.
    expect(findActivePhysicalInterval(intervals, at('2026-09-18', '02:00'))).toBeNull()
  })

  it('findActiveOnCallInterval returns only the localizada window', () => {
    const intervals = [
      toShiftInterval(dayShift, at('2026-09-17', '00:00'))!,
      toShiftInterval(localizada, at('2026-09-17', '00:00'))!,
    ]

    // The localizada window (17th 00:00 → 18th 00:00) is active at 23:00,
    // after the day shift has ended.
    expect(findActiveOnCallInterval(intervals, at('2026-09-17', '23:00'))?.isOnCallOnly).toBe(true)
    expect(findActiveOnCallInterval(intervals, at('2026-09-18', '09:00'))).toBeNull()
  })

  it('findNextOpeningShift picks the earliest shift inside the window', () => {
    const intervals = [
      toShiftInterval(
        { ...dayShift, hora_apertura: '20:00:00', hora_cierre: '22:00:00' },
        at('2026-09-17', '00:00'),
      )!,
      toShiftInterval(
        { ...dayShift, hora_apertura: '16:00:00', hora_cierre: '18:00:00' },
        at('2026-09-17', '00:00'),
      )!,
    ]

    expect(findNextOpeningShift(intervals, at('2026-09-17', '15:00'))?.start.hour).toBe(16)
    // Shifts already started are not "next".
    expect(findNextOpeningShift(intervals, at('2026-09-17', '17:00'))?.start.hour).toBe(20)
    expect(findNextOpeningShift(intervals, at('2026-09-17', '21:00'))).toBeNull()
  })
})

describe('nextDayLabel', () => {
  it('marks next-day and same-weekday closes, null for today', () => {
    const now = at('2026-09-17', '12:00')
    expect(nextDayLabel(at('2026-09-17', '22:00'), now)).toBeNull()
    expect(nextDayLabel(at('2026-09-18', '09:30'), now)).toBe('mañana')
    // 2026-09-19 is a Saturday.
    expect(nextDayLabel(at('2026-09-19', '14:00'), now)).toBe('sáb')
  })
})

describe('formatTimeUntil', () => {
  it('formats hours and minutes', () => {
    const now = at('2026-09-17', '15:00')
    expect(formatTimeUntil(at('2026-09-17', '22:00'), now)).toBe('7 h')
    expect(formatTimeUntil(at('2026-09-17', '16:30'), now)).toBe('1 h 30 min')
    expect(formatTimeUntil(at('2026-09-17', '15:05'), now)).toBe('5 min')
    expect(formatTimeUntil(at('2026-09-17', '14:00'), now)).toBeNull()
  })
})

describe('getMunicipalityAvailability — plan edge cases', () => {
  const dayShift = {
    tipo: 'SERVICIO DIURNO (De 9,00 a 22,00 h)',
    hora_apertura: '09:00:00',
    hora_cierre: '22:00:00',
    cierre_dia_siguiente: false,
  }
  const nightShift = {
    tipo: 'SERVICIO NOCTURNO (de 22,00 a 9,00 h)',
    hora_apertura: '22:00:00',
    hora_cierre: '09:00:00',
    cierre_dia_siguiente: true,
  }

  function doubleShiftMunicipality(): Municipality {
    // Mirrors the merged API payload: records for the 17th (today when
    // querying the 17th) and for the 16th/18th (yesterday/today payloads when
    // querying the 18th early in the morning).
    return makeMunicipality([
      makePharmacy({
        soe: 'DAY',
        intervals: [toShiftInterval(dayShift, at('2026-09-17', '00:00'))!],
      }),
      makePharmacy({
        soe: 'NIGHT',
        intervals: [
          toShiftInterval(nightShift, at('2026-09-17', '00:00'))!,
          toShiftInterval(nightShift, at('2026-09-18', '00:00'))!,
        ],
      }),
    ])
  }

  it('17/09 23:00 shows the night shift of today as open; closed shift dropped', () => {
    const entry = getMunicipalityAvailability(
      doubleShiftMunicipality(),
      at('2026-09-17', '23:00'),
    )

    expect(entry.openNow.map((p) => p.soe)).toEqual(['NIGHT'])
    // The day shift is already closed: it must not be listed. Tonight's shift
    // (the 18th record, 22:00) is 23h away, outside the 12h window.
    expect(entry.upcoming).toHaveLength(0)
  })

  it('18/09 01:00 still shows the previous night shift as open', () => {
    const entry = getMunicipalityAvailability(
      doubleShiftMunicipality(),
      at('2026-09-18', '01:00'),
    )

    expect(entry.openNow.map((p) => p.soe)).toEqual(['NIGHT'])
    // Today's nightly shift (22:00 on the 18th) is 21h away: outside the window.
    expect(entry.upcoming).toHaveLength(0)

    // At 11:00 the same-day night shift (22:00) IS within the 12h window.
    const entryAt11 = getMunicipalityAvailability(
      doubleShiftMunicipality(),
      at('2026-09-18', '11:00'),
    )
    expect(entryAt11.upcoming.map(({ shift }) => shift.status)).toEqual(['opensSoon'])
    expect(entryAt11.upcoming[0].shift.interval.start.hour).toBe(22)
  })

  it('17/09 15:00 shows the day shift plus tonight as upcoming', () => {
    const entry = getMunicipalityAvailability(
      doubleShiftMunicipality(),
      at('2026-09-17', '15:00'),
    )

    expect(entry.openNow.map((p) => p.soe)).toEqual(['DAY'])
    // Night shift of today (22:00) opens within the 12h window (7h away).
    expect(entry.upcoming.map(({ shift }) => shift.status)).toEqual(['opensSoon'])
    expect(entry.upcoming[0].pharmacy.soe).toBe('NIGHT')
  })

  it('excludes pharmacies opening in more than 12h and closed pharmacies', () => {
    const municipality = makeMunicipality([
      makePharmacy({
        soe: 'LATER',
        intervals: [
          toShiftInterval(
            {
              tipo: 'SERVICIO DIURNO',
              hora_apertura: '09:00:00',
              hora_cierre: '14:00:00',
              cierre_dia_siguiente: false,
            },
            at('2026-09-18', '00:00'),
          )!,
        ],
      }),
      makePharmacy({
        soe: 'CLOSED',
        intervals: [
          toShiftInterval(
            {
              tipo: 'SERVICIO DIURNO',
              hora_apertura: '09:00:00',
              hora_cierre: '14:00:00',
              cierre_dia_siguiente: false,
            },
            at('2026-09-17', '00:00'),
          )!,
        ],
      }),
    ])

    // At 15:00 on the 17th: CLOSED already finished (17th 09-14h) and LATER
    // opens 09:00 on the 18th — 18h away, beyond the 12h window.
    const entry = getMunicipalityAvailability(municipality, at('2026-09-17', '15:00'))
    expect(entry.openNow).toHaveLength(0)
    expect(entry.onCallNow).toHaveLength(0)
    expect(entry.upcoming).toHaveLength(0)
  })

  it('upcoming is sorted by start time', () => {
    const municipality = makeMunicipality([
      makePharmacy({
        soe: 'LATE',
        intervals: [
          toShiftInterval(
            {
              tipo: 'SERVICIO DIURNO',
              hora_apertura: '20:00:00',
              hora_cierre: '22:00:00',
              cierre_dia_siguiente: false,
            },
            at('2026-09-17', '00:00'),
          )!,
        ],
      }),
      makePharmacy({
        soe: 'EARLY',
        intervals: [
          toShiftInterval(
            {
              tipo: 'SERVICIO DIURNO',
              hora_apertura: '16:00:00',
              hora_cierre: '18:00:00',
              cierre_dia_siguiente: false,
            },
            at('2026-09-17', '00:00'),
          )!,
        ],
      }),
    ])

    const entry = getMunicipalityAvailability(municipality, at('2026-09-17', '15:00'))
    expect(entry.upcoming.map(({ pharmacy }) => pharmacy.soe)).toEqual(['EARLY', 'LATE'])
    expect(entry.upcoming.every(({ shift }) => shift.status === 'opensSoon')).toBe(true)
  })

  it('24h municipality: the single shift is always open', () => {
    const fullDay = {
      tipo: 'Día y Noche (24 horas)',
      hora_apertura: '09:00:00',
      hora_cierre: '09:00:00',
      cierre_dia_siguiente: true,
    }
    // Merged payload: yesterday's and today's 24h shifts both present.
    const municipality = makeMunicipality([
      makePharmacy({
        soe: 'FULLDAY',
        intervals: [
          toShiftInterval(fullDay, at('2026-09-16', '00:00'))!,
          toShiftInterval(fullDay, at('2026-09-17', '00:00'))!,
        ],
      }),
    ])

    for (const time of ['03:00', '12:00', '23:00']) {
      const entry = getMunicipalityAvailability(
        municipality,
        at('2026-09-17', time),
      )
      expect(entry.openNow.map((p) => p.soe), `at ${time}`).toEqual(['FULLDAY'])
      expect(entry.upcoming, `at ${time}`).toHaveLength(0)
    }
  })

  it('localizada shift is reported as on-call, never as physically open', () => {
    const municipality = makeMunicipality([
      makePharmacy({
        soe: 'LOC',
        intervals: [
          toShiftInterval(
            {
              tipo: 'Atención Permanente (Localizada)',
              hora_apertura: '00:00:00',
              hora_cierre: '00:00:00',
              cierre_dia_siguiente: true,
            },
            at('2026-09-17', '00:00'),
          )!,
        ],
      }),
    ])

    const entry = getMunicipalityAvailability(
      municipality,
      at('2026-09-17', '03:00'),
    )

    expect(entry.openNow).toHaveLength(0)
    expect(entry.onCallNow.map((p) => p.soe)).toEqual(['LOC'])
  })

  it('summer time: night shift crossing the DST spring change ends correctly', () => {
    // On 2026-03-29 clocks spring forward 02:00 -> 03:00 in Madrid.
    const interval = toShiftInterval(
      nightShift,
      at('2026-03-28', '00:00'),
    )

    expect(interval).not.toBeNull()
    // 22:00 on the 28th + 11 real hours (23:00 is skipped) = 09:00 on the 29th.
    expect(interval!.end.hour).toBe(9)
    expect(interval!.end.day).toBe(29)
  })
})
