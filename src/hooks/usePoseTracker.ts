import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { evaluatePlankConfidence } from '../utils/pose'
import type { PosePhase } from '../types/session'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
const MEDIAPIPE_VERSION = '0.10.22-rc.20250304'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const ENTER_THRESHOLD = 0.62
const EXIT_THRESHOLD = 0.48

export interface PoseTrackerOptions {
  onPhaseChange?: (phase: PosePhase, confidence: number, timestamp: number) => void
}

export const usePoseTracker = ({ onPhaseChange }: PoseTrackerOptions = {}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const animationRef = useRef<number | null>(null)
  const calibrationUntilRef = useRef(0)
  const previousPhaseRef = useRef<PosePhase>('idle')

  const [phase, setPhase] = useState<PosePhase>('idle')
  const [confidence, setConfidence] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const drawSkeleton = useCallback((landmarks: NormalizedLandmark[]) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    const video = videoRef.current
    if (!ctx || !video) {
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const drawingUtils = new DrawingUtils(ctx)
    drawingUtils.drawLandmarks(landmarks, { color: '#38bdf8', radius: 4 })
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: '#22d3ee',
      lineWidth: 3,
    })
  }, [])

  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setPhase('idle')
    setConfidence(0)
    previousPhaseRef.current = 'idle'
  }, [])

  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) {
      return landmarkerRef.current
    }
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.5,
    })
    return landmarkerRef.current
  }, [])

  const handlePhaseChange = useCallback(
    (nextPhase: PosePhase, nextConfidence: number) => {
      if (previousPhaseRef.current === nextPhase && nextPhase !== 'calibrating') {
        setConfidence(nextConfidence)
        return
      }
      previousPhaseRef.current = nextPhase
      setPhase(nextPhase)
      setConfidence(nextConfidence)
      onPhaseChange?.(nextPhase, nextConfidence, Date.now())
    },
    [onPhaseChange],
  )

  const evaluateFrame = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker) {
      animationRef.current = requestAnimationFrame(evaluateFrame)
      return
    }
    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(evaluateFrame)
      return
    }

    const result = landmarker.detectForVideo(video, performance.now())
    const landmarkResult = result.landmarks?.[0]
    if (landmarkResult) {
      drawSkeleton(landmarkResult)
    }

    const now = Date.now()
    if (now < calibrationUntilRef.current) {
      setPhase('calibrating')
      animationRef.current = requestAnimationFrame(evaluateFrame)
      return
    }

    if (!landmarkResult) {
      handlePhaseChange('break', 0)
      animationRef.current = requestAnimationFrame(evaluateFrame)
      return
    }

    const poseConfidence = evaluatePlankConfidence(landmarkResult)
    const previous = previousPhaseRef.current

    if (poseConfidence >= ENTER_THRESHOLD) {
      handlePhaseChange('plank', poseConfidence)
    } else if (poseConfidence <= EXIT_THRESHOLD) {
      handlePhaseChange('break', poseConfidence)
    } else {
      handlePhaseChange(previous, poseConfidence)
    }

    animationRef.current = requestAnimationFrame(evaluateFrame)
  }, [drawSkeleton, handlePhaseChange])

  const start = useCallback(async () => {
    if (loading) {
      return
    }
    setError(null)
    setLoading(true)
    try {
      await ensureLandmarker()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      calibrationUntilRef.current = Date.now() + 1500
      previousPhaseRef.current = 'calibrating'
      setPhase('calibrating')
      animationRef.current = requestAnimationFrame(evaluateFrame)
    } catch (err) {
      let message = 'Unable to start camera.'
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          message =
            'Camera permission was blocked. Please allow camera access in your browser settings and try again.'
        } else if (err.name === 'NotReadableError') {
          message = 'Camera is already in use by another app. Close it and retry.'
        } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
          message = 'No compatible rear camera was found on this device.'
        }
      } else if (err instanceof Error) {
        message = err.message
      }
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        message += ' (Tip: mobile browsers require HTTPS for camera access.)'
      }
      setError(message)
      stopStream()
    } finally {
      setLoading(false)
    }
  }, [ensureLandmarker, evaluateFrame, loading, stopStream])

  const stop = useCallback(() => {
    stopStream()
  }, [stopStream])

  useEffect(() => () => {
    stopStream()
    landmarkerRef.current?.close()
  }, [stopStream])

  return {
    videoRef,
    canvasRef,
    phase,
    confidence,
    loading,
    error,
    start,
    stop,
  }
}
