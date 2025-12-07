import { useEffect, useState } from 'react'
import './App.css'
import { usePoseTracker } from './hooks/usePoseTracker'
import { useSessionStore } from './state/sessionStore'
import { CameraPreview } from './components/CameraPreview'
import { LiveMetrics } from './components/LiveMetrics'
import { SessionHistory } from './components/SessionHistory'
import { useAudioCue } from './hooks/useAudioCue'

function App() {
  const [now, setNow] = useState(Date.now())
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [pendingStart, setPendingStart] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : true

  const history = useSessionStore((state) => state.history)
  const status = useSessionStore((state) => state.status)
  const activeSession = useSessionStore((state) => state.activeSession)
  const hydrate = useSessionStore((state) => state.hydrate)
  const startSession = useSessionStore((state) => state.startSession)
  const stopSession = useSessionStore((state) => state.stopSession)
  const recordPhase = useSessionStore((state) => state.recordPhase)
  const resetHistory = useSessionStore((state) => state.resetHistory)

  const {
    videoRef,
    canvasRef,
    phase,
    confidence,
    loading,
    error,
    start,
    switchFacing,
    stop,
  } = usePoseTracker({
    onPhaseChange: (nextPhase, _confidence, timestamp) => {
      recordPhase(nextPhase, timestamp)
    },
  })

  const { arm: armAudio, updatePhase: updateAudioPhase } = useAudioCue()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (status !== 'tracking') {
      return
    }
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    const handleNetwork = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleNetwork)
    window.addEventListener('offline', handleNetwork)
    return () => {
      window.removeEventListener('online', handleNetwork)
      window.removeEventListener('offline', handleNetwork)
    }
  }, [])

  useEffect(
    () => () => {
      stop()
      void stopSession()
    },
    [stop, stopSession],
  )

  const handleStart = async () => {
    setPendingStart(true)
    try {
      await armAudio()
      await start(cameraFacing)
      startSession()
    } finally {
      setPendingStart(false)
    }
  }

  const handleStop = async () => {
    stop()
    await stopSession()
  }

  const handleClearHistory = () => {
    if (!history.length) {
      return
    }
    const confirmed = window.confirm('Clear all stored sessions?')
    if (confirmed) {
      void resetHistory()
    }
  }

  const handleToggleCamera = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    setCameraFacing(nextFacing)
    if (status === 'tracking') {
      await switchFacing(nextFacing)
    }
  }

  const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices
  const actionDisabled = !cameraSupported || loading || pendingStart

  useEffect(() => {
    if (status === 'tracking') {
      updateAudioPhase(phase)
    } else {
      updateAudioPhase('idle')
    }
  }, [phase, status, updateAudioPhase])

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MediaPipe Pose + Offline Caching</p>
          <h1>Plank Tracker</h1>
          <p>
            Track hold quality, reps, and breaks directly in the browser. Everything stays on your
            device so you can train without a connection.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="primary"
            onClick={handleStart}
            disabled={status === 'tracking' || actionDisabled}
          >
            {pendingStart ? 'Starting…' : 'Start tracking'}
          </button>
          <button type="button" className="secondary" onClick={handleStop} disabled={status !== 'tracking'}>
            Stop
          </button>
          <button
            type="button"
            className="ghost"
            onClick={handleToggleCamera}
            disabled={!cameraSupported || loading}
          >
            {cameraFacing === 'environment' ? 'Use front camera' : 'Use rear camera'}
          </button>
          <span className={`chip ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Offline cache ready' : 'Offline mode'}
          </span>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {!cameraSupported && (
        <p className="error">Camera access is not available on this device.</p>
      )}
      {!secureContext && (
        <p className="error">
          Camera capture requires a secure origin. Open this app over HTTPS (or localhost) so your
          mobile browser can grant camera permissions.
        </p>
      )}

      <main className="grid">
        <CameraPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          posePhase={phase}
          confidence={confidence}
          isTracking={status === 'tracking'}
          loading={loading}
        />
        <LiveMetrics
          status={status}
          posePhase={phase}
          confidence={confidence}
          activeSession={activeSession}
          latestSession={history[0]}
          now={now}
        />
        <SessionHistory sessions={history} onClear={handleClearHistory} />
      </main>
    </div>
  )
}

export default App
