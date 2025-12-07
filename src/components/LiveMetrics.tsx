import type { ActiveSessionState, PosePhase, SessionRecord } from '../types/session'
import { formatDuration } from '../utils/time'

interface LiveMetricsProps {
  status: 'idle' | 'tracking'
  posePhase: PosePhase
  confidence: number
  activeSession: ActiveSessionState | null
  latestSession: SessionRecord | undefined
  now: number
}

const statusCopy: Record<PosePhase, string> = {
  idle: 'Waiting to start',
  calibrating: 'Calibrating posture',
  plank: 'Plank locked in',
  break: 'Taking a breather',
}

export function LiveMetrics({
  status,
  posePhase,
  confidence,
  activeSession,
  latestSession,
  now,
}: LiveMetricsProps) {
  const totalSessionMs = activeSession ? now - activeSession.startedAt : 0

  const calcTotalByState = (state: 'plank' | 'break') => {
    if (!activeSession) {
      return 0
    }
    return activeSession.segments.reduce((acc, segment, index) => {
      if (segment.state !== state) {
        return acc
      }
      const isLast = index === activeSession.segments.length - 1
      const duration = segment.durationMs ?? (isLast ? now - segment.startedAt : 0)
      return acc + Math.max(0, duration)
    }, 0)
  }

  const breakMs = calcTotalByState('break')
  const sessionPlankMs = calcTotalByState('plank')
  const lastSegment = activeSession?.segments.at(-1)
  const currentHoldMs =
    posePhase === 'plank' && lastSegment?.state === 'plank'
      ? lastSegment.durationMs ?? Math.max(0, now - lastSegment.startedAt)
      : 0

  return (
    <section className="card metrics">
      <header>
        <p className="eyebrow">Session insights</p>
        <span className={`chip ${status}`}>{status === 'tracking' ? 'Tracking' : 'Idle'}</span>
      </header>
      <div className="metrics-grid">
        <article>
          <p className="label">Current status</p>
          <p className="value">{statusCopy[posePhase]}</p>
          <p className="muted">Confidence {(confidence * 100).toFixed(0)}%</p>
        </article>
        <article>
          <p className="label">Current hold</p>
          <p className="value">{formatDuration(currentHoldMs)}</p>
          <p className="muted">Hold time for this plank</p>
        </article>
        <article>
          <p className="label">Session time</p>
          <p className="value">{formatDuration(totalSessionMs)}</p>
          <p className="muted">Clock starts once tracking begins</p>
        </article>
        <article>
          <p className="label">Plank total</p>
          <p className="value">{formatDuration(sessionPlankMs)}</p>
          <p className="muted">Cumulative plank time this run</p>
        </article>
        <article>
          <p className="label">Last session</p>
          <p className="value">
            {latestSession ? formatDuration(latestSession.totalPlankMs) : '—'}
          </p>
          <p className="muted">Total plank time last run</p>
        </article>
        <article>
          <p className="label">Baseline breaks</p>
          <p className="value">{formatDuration(breakMs)}</p>
          <p className="muted">Time spent resting this session</p>
        </article>
      </div>
    </section>
  )
}
