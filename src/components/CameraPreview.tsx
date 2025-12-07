import type { RefObject } from 'react'
import type { PosePhase } from '../types/session'

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  posePhase: PosePhase
  confidence: number
  isTracking: boolean
  loading: boolean
}

const phaseLabels: Record<PosePhase, string> = {
  idle: 'Inactive',
  calibrating: 'Calibrating',
  plank: 'Plank detected',
  break: 'Break',
}

export function CameraPreview({
  videoRef,
  canvasRef,
  posePhase,
  confidence,
  isTracking,
  loading,
}: CameraPreviewProps) {
  return (
    <section className="card camera">
      <header>
        <p className="eyebrow">Live posture</p>
        <span className={`status ${posePhase}`}>
          {phaseLabels[posePhase]} · {(confidence * 100).toFixed(0)}%
        </span>
      </header>
      <div className="camera-frame">
        {!isTracking && !loading ? (
          <div className="camera-placeholder">
            <p>Tap start to enable the camera and begin tracking.</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="camera-overlay" />
          </>
        )}
      </div>
    </section>
  )
}
