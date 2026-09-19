import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useGuardias } from './hooks/useGuardias'
import { getActivePharmacies } from './domain/availability'
import HomePage from './pages/HomePage'
import MunicipalityPage from './pages/MunicipalityPage'
import { LiveClockBar } from './components/LiveClockBar'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'

/**
 * Application shell: single data load shared by every route, availability
 * computed once per tick and handed down to the pages.
 */
export default function App() {
  const { status, municipalities, now, error, refresh } = useGuardias()

  const availability = useMemo(() => {
    if (municipalities.length === 0) return null
    return getActivePharmacies(municipalities, now)
  }, [municipalities, now])

  if (status === 'loading' && municipalities.length === 0) {
    return (
      <>
        <LiveClockBar />
        <LoadingState />
      </>
    )
  }

  if (status === 'error' && municipalities.length === 0) {
    return (
      <>
        <LiveClockBar />
        <ErrorState error={error} onRetry={refresh} />
      </>
    )
  }

  return (
    <>
      <LiveClockBar />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage availability={availability} now={now} query={status} onRetry={refresh} />
          }
        />
        <Route
          path="/municipio/:municipalityId"
          element={
            <MunicipalityPage availability={availability} now={now} onRetry={refresh} />
          }
        />
        <Route
          path="*"
          element={
            <HomePage availability={availability} now={now} query={status} onRetry={refresh} />
          }
        />
      </Routes>
    </>
  )
}
