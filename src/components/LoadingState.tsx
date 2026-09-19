/**
 * Full-screen loading placeholder shown while guard data loads for the first
 * time: a prominent pulsing cross + pill logo, a large spinner, a clear
 * message and a subtle progress bar.
 */

export function LoadingState() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 pt-10">
      {/* Pulsing pharmacy cross */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-rausch-soft motion-reduce:hidden"
        />
        <span
          aria-hidden
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-rausch-soft text-4xl font-bold text-rausch shadow-sm"
        >
          +
        </span>
      </div>

      {/* Large spinner */}
      <div
        aria-hidden
        className="mt-8 h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-rausch motion-reduce:animate-none"
      />

      <p className="mt-5 text-base font-semibold text-ink">
        Cargando farmacias de guardia…
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Consultando los turnos de hoy en cofcadiz.es
      </p>

      {/* Indeterminate progress bar */}
      <div
        aria-hidden
        className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-line-soft"
      >
        <div className="h-full w-1/3 animate-progress-slide rounded-full bg-rausch motion-reduce:animate-pulse" />
      </div>

      <p className="sr-only" role="status">
        Cargando farmacias de guardia, por favor espera.
      </p>
    </main>
  )
}
