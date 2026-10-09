/**
 * Full-screen loading placeholder shown while guard data loads for the first
 * time: a prominent pulsing cross + pill logo and a clear message.
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

      <p className="mt-6 text-base font-semibold text-ink">
        Cargando farmacias de guardia…
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Consultando los turnos de hoy en cofcadiz.es
      </p>

      <p className="sr-only" role="status">
        Cargando farmacias de guardia, por favor espera.
      </p>
    </main>
  )
}
