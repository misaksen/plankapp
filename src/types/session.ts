export type PosePhase = 'idle' | 'calibrating' | 'plank' | 'break'

export interface SessionSegment {
  id: string
  state: Exclude<PosePhase, 'idle' | 'calibrating'>
  startedAt: number
  endedAt?: number
  durationMs?: number
}

export interface SessionRecord {
  id: string
  startedAt: number
  endedAt: number
  totalPlankMs: number
  totalBreakMs: number
  longestHoldMs: number
  segments: SessionSegment[]
}

export interface ActiveSessionState {
  id: string
  startedAt: number
  currentState: Exclude<PosePhase, 'idle' | 'calibrating'>
  currentSegmentStartedAt: number
  segments: SessionSegment[]
}
