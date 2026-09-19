/**
 * Municipality view: pharmacies grouped in two sections — "Abierta ahora"
 * (physical + phone-only) and "Abre pronto" (opens within the next 12 hours).
 * Closed pharmacies are never listed.
 */

import { Link, useParams } from 'react-router-dom'
import { DateTime } from 'luxon'
import type { MunicipalityAvailability, ShiftWithStatus } from '../domain/availability'
import { findActiveOnCallInterval, findActivePhysicalInterval } from '../domain/availability'
import type { Pharmacy, ShiftInterval } from '../domain/types'
import { formatClock, formatTimeUntil, nextDayLabel } from '../domain/time'
import { LoadingState } from '../components/LoadingState'
import { municipalitySeoForSlug, siteUrl } from '../lib/seo'
import { useSeo } from '../lib/useSeo'
import { JsonLd } from '../components/JsonLd'
import {
  municipalityWebPageGraph,
  pharmacyGraph,
  availabilitySummaryGraph,
} from '../components/StructuredData'

interface MunicipalityPageProps {
  availability: Map<string, MunicipalityAvailability> | null
  now: DateTime
  onRetry?: () => void
}

export default function MunicipalityPage({
  availability,
  now,
}: MunicipalityPageProps) {
  const { municipalityId = '' } = useParams()

  // Hooks must run unconditionally: compute the SEO payload from the route
  // slug even while data is still loading or the id is unknown.
  const routeSeo = municipalitySeoForSlug(municipalityId)
  useSeo({
    title: routeSeo.title,
    description: routeSeo.description,
    canonical: siteUrl(`/municipio/${municipalityId}`),
  })

  if (!availability) {
    return <LoadingState />
  }

  const entry = availability.get(municipalityId)

  if (!entry) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-28 pt-16 md:pb-16">
        <BackLink />
        <p className="mt-8 text-center text-sm text-ink-soft">
          No hay información de guardias para este municipio.
        </p>
      </main>
    )
  }

  const { municipality, openNow, onCallNow, upcoming } = entry
  const hasContent = openNow.length > 0 || onCallNow.length > 0 || upcoming.length > 0

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-28 pt-16 md:pb-16">
      <JsonLd data={municipalityWebPageGraph(municipality.name, municipality.id)} />
      <JsonLd data={availabilitySummaryGraph(entry)} />
      <BackLink />

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {municipality.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {now.setLocale('es').toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
        </p>
      </header>

      <section aria-labelledby="open-now-heading" className="mb-8">
        <h2
          id="open-now-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft"
        >
          Abierta ahora
        </h2>

        {openNow.length === 0 && onCallNow.length === 0 ? (
          <EmptyOpenNow hasUpcoming={upcoming.length > 0} />
        ) : (
          <div className="grid gap-3">
            {openNow.map((pharmacy) => (
              <PharmacyCard key={pharmacy.soe} pharmacy={pharmacy} now={now} />
            ))}
            {onCallNow.map((pharmacy) => (
              <PharmacyCard key={pharmacy.soe} pharmacy={pharmacy} now={now} onCall />
            ))}
            {[...openNow, ...onCallNow].map((pharmacy) => {
              const activeInterval = openNow.includes(pharmacy)
                ? findActivePhysicalInterval(pharmacy.intervals, now)
                : findActiveOnCallInterval(pharmacy.intervals, now)
              return (
                <JsonLd
                  key={`ld-${pharmacy.soe}`}
                  data={pharmacyGraph(
                    pharmacy,
                    openNow.includes(pharmacy) ? 'openNow' : 'onCallNow',
                    activeInterval ? formatClock(activeInterval.end) : undefined,
                  )}
                />
              )
            })}
          </div>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section aria-labelledby="today-shifts-heading">
          <h2
            id="today-shifts-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft"
          >
            Abre pronto
          </h2>
          <div className="grid gap-3">
            {upcoming.map(({ pharmacy, shift }) => (
              <UpcomingCard key={pharmacy.soe} pharmacy={pharmacy} shift={shift} now={now} />
            ))}
          </div>
        </section>
      ) : null}

      {!hasContent ? (
        <p className="rounded-card border border-line-soft bg-surface p-4 text-sm text-ink-soft">
          No hay farmacias de guardia listadas ahora mismo en este municipio.
        </p>
      ) : null}

      <footer className="mt-12 text-center text-xs text-ink-soft">
        Datos procedentes de cofcadiz.es. Esta web no es una fuente oficial.
      </footer>
    </main>
  )
}

/**
 * Prominent back navigation: sticky bottom bar on mobile, inline pill on
 * larger screens.
 */
function BackLink() {
  return (
    <Link
      to="/"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 border-t border-line-soft bg-surface/95 px-4 py-3.5 text-sm font-semibold text-ink shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur hover:text-rausch md:static md:w-fit md:rounded-full md:border md:border-line md:px-5 md:py-2.5 md:shadow-none md:backdrop-blur-none md:hover:border-rausch/50"
    >
      <span aria-hidden>←</span> Todos los municipios
    </Link>
  )
}

function EmptyOpenNow({ hasUpcoming }: { hasUpcoming: boolean }) {
  return (
    <div className="rounded-card border border-line-soft bg-surface p-4 text-sm text-ink-soft">
      Ahora mismo no hay ninguna farmacia abierta al público en este municipio.
      {hasUpcoming ? ' Consulta cuándo abre la próxima más abajo.' : ''}
    </div>
  )
}

/**
 * Small chip marking a time that falls on another calendar day: "mañana" or
 * "del día mié". Renders nothing for today.
 */
function DayMarker(props: { target: DateTime; now: DateTime }) {
  const label = nextDayLabel(props.target, props.now)
  if (!label) return null
  return (
    <span className="rounded-full bg-closed-soft px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
      {label === 'mañana' ? 'mañana' : `del día ${label}`}
    </span>
  )
}

/**
 * Prominent schedule block. For pharmacies already open it shows only the
 * closing time (with a day marker when the shift ends on another day); for
 * upcoming shifts it shows both the opening and closing times.
 */
function ScheduleBlock(props: {
  interval: ShiftInterval
  now: DateTime
  mode: 'open' | 'upcoming'
  onCall?: boolean
}) {
  const { interval, now, mode, onCall } = props
  return (
    <div className="mt-3 rounded-card border border-line-soft bg-canvas p-3">
      {onCall ? (
        <p className="text-sm font-semibold text-phone">
          Atención Permanente (Localizada) · contacto telefónico 24 h
        </p>
      ) : mode === 'open' ? (
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Cierra
          </span>
          <span className="text-lg font-semibold tabular-nums text-ink">
            {formatClock(interval.end)}
          </span>
          <DayMarker target={interval.end} now={now} />
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Abre
            </p>
            <p className="flex items-baseline gap-1.5 text-lg font-semibold tabular-nums text-ink">
              {formatClock(interval.start)}
              <DayMarker target={interval.start} now={now} />
            </p>
          </div>
          <span aria-hidden className="text-line">&#8594;</span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Cierra
            </p>
            <p className="flex items-baseline gap-1.5 text-lg font-semibold tabular-nums text-ink">
              {formatClock(interval.end)}
              <DayMarker target={interval.end} now={now} />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function PharmacyCard(props: { pharmacy: Pharmacy; now: DateTime; onCall?: boolean }) {
  const { pharmacy, now, onCall } = props
  const activeInterval = onCall
    ? findActiveOnCallInterval(pharmacy.intervals, now)
    : findActivePhysicalInterval(pharmacy.intervals, now)

  const mapsUrl = pharmacy.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.coordinates.lat},${pharmacy.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${pharmacy.address} ${pharmacy.municipalityName}`,
      )}`

  return (
    <article className="rounded-card border border-line-soft bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink">{pharmacy.pharmacyName}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            onCall ? 'bg-phone-soft text-phone' : 'bg-open-soft text-open'
          }`}
        >
          {onCall ? 'Localizada · solo teléfono' : 'Abierta ahora'}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{pharmacy.address}</p>
      {activeInterval ? (
        <ScheduleBlock interval={activeInterval} now={now} mode="open" onCall={onCall} />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`tel:${pharmacy.phone}`}
          className="rounded-full bg-rausch px-4 py-2 text-sm font-semibold text-white"
        >
          Llamar
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
        >
          Ver mapa
        </a>
      </div>
    </article>
  )
}

function UpcomingCard(props: { pharmacy: Pharmacy; shift: ShiftWithStatus; now: DateTime }) {
  const { pharmacy, shift, now } = props
  const { interval } = shift
  const untilLabel = formatTimeUntil(interval.start, now) ?? '0 min'

  const mapsUrl = pharmacy.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.coordinates.lat},${pharmacy.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${pharmacy.address} ${pharmacy.municipalityName}`,
      )}`

  return (
    <article className="rounded-card border border-line-soft bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink">{pharmacy.pharmacyName}</h3>
        <span className="shrink-0 rounded-full bg-soon-soft px-2.5 py-1 text-xs font-semibold text-soon">
          Abre en {untilLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{pharmacy.address}</p>
      <ScheduleBlock interval={interval} now={now} mode="upcoming" />
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`tel:${pharmacy.phone}`}
          className="rounded-full bg-rausch px-4 py-2 text-sm font-semibold text-white"
        >
          Llamar
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
        >
          Ver mapa
        </a>
      </div>
    </article>
  )
}
