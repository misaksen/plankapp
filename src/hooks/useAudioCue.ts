import { useCallback, useEffect, useRef } from 'react'
import type { PosePhase } from '../types/session'

const ACTIVE_PHASE: PosePhase = 'plank'

export const useAudioCue = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const stopTone = useCallback(() => {
    const context = audioContextRef.current
    const oscillator = oscillatorRef.current
    const gain = gainRef.current
    if (!context || !oscillator || !gain) {
      return
    }
    gain.gain.cancelScheduledValues(context.currentTime)
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.15)
    oscillator.stop(context.currentTime + 0.2)
    oscillatorRef.current = null
    gainRef.current = null
  }, [])

  const startTone = useCallback(() => {
    const context = audioContextRef.current
    if (!context || oscillatorRef.current) {
      return
    }
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 520
    gain.gain.setValueAtTime(0, context.currentTime)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    gain.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.2)
    oscillatorRef.current = oscillator
    gainRef.current = gain
  }, [])

  const arm = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
  }, [])

  const updatePhase = useCallback(
    (phase: PosePhase) => {
      if (phase === ACTIVE_PHASE) {
        startTone()
      } else {
        stopTone()
      }
    },
    [startTone, stopTone],
  )

  useEffect(() => () => {
    stopTone()
    audioContextRef.current?.close()
  }, [stopTone])

  return { arm, updatePhase }
}
