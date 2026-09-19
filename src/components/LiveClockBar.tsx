/**
 * Slim always-visible bar with the live date and clock pinned to
 * Europe/Madrid, ticking every second. Rendered once at the app shell so it
 * shows on every route, including loading and error states.
 */

import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { MADRID_TIMEZONE } from '../domain/types'

const TICK_MS = 1000

export function LiveClockBar() {
  const [now, setNow] = useState(() => DateTime.now().setZone(MADRID_TIMEZONE))

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(DateTime.now().setZone(MADRID_TIMEZONE)),
      TICK_MS,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-x-0 top-0 z-20 border-b border-line-soft bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-2 text-sm">
        <span className="text-ink-soft">{now.setLocale('es').toFormat('ccc d LLL yyyy')}</span>
        <span className="font-semibold tabular-nums text-ink">{now.toFormat('HH:mm:ss')}</span>
      </div>
    </div>
  )
}
