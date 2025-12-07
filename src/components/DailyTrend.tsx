import type { SessionRecord } from '../types/session'
import { formatDuration } from '../utils/time'

const DAY_COUNT = 7

const labelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
})

const fullFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

const startOfDayMs = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function DailyTrend({ sessions }: { sessions: SessionRecord[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (DAY_COUNT - 1 - index))
    return date
  })

  const buckets = sessions.reduce<Record<number, number>>((acc, session) => {
    const key = startOfDayMs(session.startedAt)
    acc[key] = (acc[key] ?? 0) + session.totalPlankMs
    return acc
  }, {})

  const dataset = days.map((day) => {
    const key = day.getTime()
    return {
      date: day,
      label: labelFormatter.format(day),
      fullLabel: fullFormatter.format(day),
      total: buckets[key] ?? 0,
    }
  })

  const maxTotal = Math.max(...dataset.map((d) => d.total), 1)
  const divisor = dataset.length > 1 ? dataset.length - 1 : 1
  const points = dataset
    .map((item, index) => {
      const x = Number(((index / divisor) * 100).toFixed(2))
      const y = Number((100 - (item.total / maxTotal) * 100).toFixed(2))
      return `${x},${Number.isFinite(y) ? y : 100}`
    })
    .join(' ')

  const weeklyTotal = dataset.reduce((sum, item) => sum + item.total, 0)
  const mostRecent = dataset[dataset.length - 1]

  return (
    <section className="card trend" aria-label="Daily plank totals">
      <header>
        <div>
          <p className="eyebrow">Last 7 days</p>
          <h2>Daily plank totals</h2>
        </div>
        <div className="trend-meta">
          <p className="value">{formatDuration(weeklyTotal)}</p>
          <p className="muted">Total plank time this week</p>
        </div>
      </header>

      {!sessions.length && <p className="muted">Hold a plank to start seeing your trend.</p>}

      {sessions.length > 0 && (
        <div className="trend-chart" role="img" aria-label="Line graph of plank time per day">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
              </linearGradient>
            </defs>
            <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth={2.5} />
            <polygon
              points={`${points} 100,100 0,100`}
              fill="url(#trend-fill)"
              opacity={0.45}
            />
            {dataset.map((item, index) => {
              const x = (index / divisor) * 100
              const y = 100 - (item.total / maxTotal) * 100
              return (
                <circle
                  key={item.fullLabel}
                  cx={x}
                  cy={Number.isFinite(y) ? y : 100}
                  r={2.4}
                  fill="#38bdf8"
                />
              )
            })}
          </svg>
          <div className="trend-grid">
            {dataset.map((item) => (
              <div key={item.fullLabel}>
                <p className="muted">{item.label}</p>
                <p className="value small">{item.total ? formatDuration(item.total) : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mostRecent && (
        <p className="muted recent">
          Last plank day ({mostRecent.fullLabel}): {formatDuration(mostRecent.total)} total
        </p>
      )}
    </section>
  )
}
