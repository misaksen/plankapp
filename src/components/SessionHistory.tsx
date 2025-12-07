import type { SessionRecord } from '../types/session'
import { formatDuration, relativeDate } from '../utils/time'

interface SessionHistoryProps {
  sessions: SessionRecord[]
  onClear: () => void
}

export function SessionHistory({ sessions, onClear }: SessionHistoryProps) {
  return (
    <section className="card history">
      <header>
        <div>
          <p className="eyebrow">Session history</p>
          <h2>Recent holds</h2>
        </div>
        <button type="button" className="ghost" onClick={onClear} disabled={!sessions.length}>
          Clear
        </button>
      </header>
      {!sessions.length && <p className="muted">No sessions yet. Your next plank will appear here.</p>}
      <ul>
        {sessions.map((session) => (
          <li key={session.id} className="history-row">
            <div>
              <p className="value">{formatDuration(session.totalPlankMs)}</p>
              <p className="muted">Plank · {relativeDate(session.startedAt)}</p>
            </div>
            <div className="history-stats">
              <span>
                Longest {formatDuration(session.longestHoldMs)}
              </span>
              <span>
                Breaks {formatDuration(session.totalBreakMs)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
