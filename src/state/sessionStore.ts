import { create } from 'zustand'
import { loadSessions, saveSession, clearSessions } from '../services/storage'
import type {
  ActiveSessionState,
  PosePhase,
  SessionRecord,
  SessionSegment,
} from '../types/session'

const stableId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)

type TrackerState = {
  history: SessionRecord[]
  status: 'idle' | 'tracking'
  activeSession: ActiveSessionState | null
  hydrate: () => Promise<void>
  startSession: () => void
  stopSession: () => Promise<void>
  recordPhase: (phase: PosePhase, timestamp: number) => void
  resetHistory: () => Promise<void>
}

const finalizeSegments = (segments: SessionSegment[], now: number) =>
  segments.map((segment) => {
    if (segment.endedAt) {
      return segment
    }
    const durationMs = Math.max(0, now - segment.startedAt)
    return {
      ...segment,
      endedAt: now,
      durationMs,
    }
  })

const calculateMetrics = (segments: SessionSegment[]) => {
  return segments.reduce(
    (acc, segment) => {
      const duration = segment.durationMs ?? 0
      if (segment.state === 'plank') {
        acc.totalPlankMs += duration
        acc.longestHoldMs = Math.max(acc.longestHoldMs, duration)
      } else {
        acc.totalBreakMs += duration
      }
      return acc
    },
    { totalPlankMs: 0, totalBreakMs: 0, longestHoldMs: 0 },
  )
}

export const useSessionStore = create<TrackerState>((set, get) => ({
  history: [],
  status: 'idle',
  activeSession: null,
  async hydrate() {
    const sessions = await loadSessions()
    sessions.sort((a, b) => b.startedAt - a.startedAt)
    set({ history: sessions })
  },
  startSession() {
    if (get().status === 'tracking') {
      return
    }
    const startedAt = Date.now()
    const active: ActiveSessionState = {
      id: stableId(),
      startedAt,
      currentState: 'break',
      currentSegmentStartedAt: startedAt,
      segments: [],
    }
    set({ activeSession: active, status: 'tracking' })
  },
  async stopSession() {
    const { activeSession, history } = get()
    if (!activeSession) {
      return
    }
    const now = Date.now()
    const segments = finalizeSegments(activeSession.segments, now)
    if (!segments.length) {
      set({ activeSession: null, status: 'idle' })
      return
    }
    const metrics = calculateMetrics(segments)
    const record: SessionRecord = {
      id: activeSession.id,
      startedAt: activeSession.startedAt,
      endedAt: now,
      segments,
      ...metrics,
    }
    await saveSession(record)
    set({
      history: [record, ...history].slice(0, 50),
      activeSession: null,
      status: 'idle',
    })
  },
  recordPhase(phase, timestamp) {
    const current = get().activeSession
    if (!current) {
      return
    }
    const normalized: Exclude<PosePhase, 'idle' | 'calibrating'> =
      phase === 'plank' ? 'plank' : 'break'
    const segments = [...current.segments]

    if (!segments.length) {
      segments.push({ id: stableId(), state: normalized, startedAt: timestamp })
    } else {
      const latest = segments[segments.length - 1]
      if (latest.state === normalized && !latest.endedAt) {
        return
      }
      if (!latest.endedAt) {
        latest.endedAt = timestamp
        latest.durationMs = Math.max(0, timestamp - latest.startedAt)
      }
      segments.push({ id: stableId(), state: normalized, startedAt: timestamp })
    }

    set({
      activeSession: {
        ...current,
        segments,
        currentState: normalized,
        currentSegmentStartedAt: timestamp,
      },
    })
  },
  async resetHistory() {
    await clearSessions()
    set({ history: [] })
  },
}))
