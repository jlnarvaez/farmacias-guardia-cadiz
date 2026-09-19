/**
 * Home: capsule-style search over the municipality index plus a card list
 * showing how many pharmacies are on guard today in each municipality.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DateTime } from 'luxon'
import type { MunicipalityAvailability } from '../domain/availability'
import { formatTimeUntil } from '../domain/time'
import { foldCase } from '../domain/municipality'
import type { GuardiasStatus } from '../hooks/useGuardias'
import { homeSeo, siteUrl } from '../lib/seo'
import { useSeo } from '../lib/useSeo'

interface HomePageProps {
  availability: Map<string, MunicipalityAvailability> | null
  now: DateTime
  query: GuardiasStatus
  onRetry: () => void
}

/** Match folded text anywhere in the folded municipality name. */
function matchesQuery(name: string, foldedQuery: string): boolean {
  if (!foldedQuery) return true
  return foldCase(name).includes(foldedQuery)
}

export default function HomePage({ availability, now, query }: HomePageProps) {
  // Honor the ?q= search param (declared in the WebSite SearchAction
  // structured data) so search-engine entry links pre-fill the filter.
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  )

  useSeo({
    title: homeSeo.title,
    description: homeSeo.description,
    canonical: siteUrl('/'),
  })

  const filtered = useMemo(() => {
    if (!availability) return []
    const folded = foldCase(search.trim())
    return [...availability.values()]
      .filter((entry) => matchesQuery(entry.municipality.name, folded))
      .sort((a, b) =>
        a.municipality.name.localeCompare(b.municipality.name, 'es', {
          sensitivity: 'base',
        }),
      )
  }, [availability, search])

  const loaded = query !== 'loading' || availability !== null

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-20 pt-16">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Farmacias de guardia · Cádiz
        </h1>
      </header>

      <SearchInput value={search} onChange={setSearch} />

      {loaded ? (
        <ul className="mt-6 grid gap-3">
          {filtered.map((entry) => (
            <li key={entry.municipality.id}>
              <MunicipalityCard entry={entry} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-center text-sm text-ink-soft">Cargando datos…</p>
      )}

      {loaded && filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-soft">
          No hay resultados para «{search}».
        </p>
      ) : null}

      <footer className="mt-12 text-center text-xs text-ink-soft">
        Datos procedentes de cofcadiz.es. Esta web no es una fuente oficial.
      </footer>
    </main>
  )
}

function SearchInput(props: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="sticky top-[52px] z-10 -mt-1 rounded-card bg-canvas/95 pb-2 pt-2 backdrop-blur">
      <label className="sr-only" htmlFor="municipality-search">
        Buscar municipio
      </label>
      <input
        id="municipality-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Buscar municipio…"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-full border border-line bg-surface px-5 py-3 text-base text-ink shadow-sm outline-none placeholder:text-ink-soft focus:border-rausch focus:ring-2 focus:ring-rausch/20"
      />
    </div>
  )
}

function MunicipalityCard({ entry, now }: { entry: MunicipalityAvailability; now: DateTime }) {
  const { municipality, openNow, onCallNow, upcoming } = entry
  // Only visible entries count: open/on-call now plus those opening within
  // the next 12 hours. Closed pharmacies are excluded from listings.
  const visibleCount = openNow.length + onCallNow.length + upcoming.length

  const nextOpening = upcoming[0]

  return (
    <Link
      to={`/municipio/${municipality.id}`}
      className="block rounded-card border border-line-soft bg-surface p-4 transition hover:border-rausch/40"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-ink">{municipality.name}</span>
        <span className="shrink-0 rounded-full bg-closed-soft px-2.5 py-1 text-xs font-medium text-ink-soft">
          {visibleCount} {visibleCount === 1 ? 'farmacia' : 'farmacias'}
        </span>
      </div>
      {openNow.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-open-soft px-2 py-0.5 text-xs font-semibold text-open">
            Abierta ahora
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {openNow[0].pharmacyName}
          </span>
        </div>
      ) : onCallNow.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-phone-soft px-2 py-0.5 text-xs font-semibold text-phone">
            Localizada
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {onCallNow[0].pharmacyName}
          </span>
        </div>
      ) : null}
      {openNow.length === 0 && onCallNow.length === 0 && nextOpening ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-soon-soft px-2 py-0.5 text-xs font-semibold text-soon">
            Abre en {formatTimeUntil(nextOpening.shift.interval.start, now)}
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {nextOpening.pharmacy.pharmacyName}
          </span>
        </div>
      ) : null}
    </Link>
  )
}
