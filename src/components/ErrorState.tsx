/**
 * Full-screen error state with a manual retry button (automatic retries also
 * happen in the data hook).
 */
interface ErrorStateProps {
  error: Error | null
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 pt-10 text-center">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rausch-soft text-xl"
      >
        ⚠️
      </div>
      <h1 className="mt-4 text-lg font-semibold text-ink">
        No se pudieron cargar los datos
      </h1>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">
        Ha ocurrido un problema al contactar con cofcadiz.es. Comprueba tu
        conexión e inténtalo de nuevo.
      </p>
      {error ? (
        <p className="mt-2 max-w-sm break-words text-xs text-ink-soft/70">
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-rausch px-6 py-2.5 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  )
}
