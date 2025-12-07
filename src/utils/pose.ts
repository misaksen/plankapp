import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max)

const midpoint = (a: NormalizedLandmark, b: NormalizedLandmark) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
})

const toVector = (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => ({
  x: to.x - from.x,
  y: to.y - from.y,
  z: to.z - from.z,
})

const vectorAngle = (vector: { x: number; y: number }) => Math.atan2(vector.y, vector.x)

const angleBetween = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => {
  const dot = a.x * b.x + a.y * b.y
  const det = a.x * b.y - a.y * b.x
  return Math.atan2(det, dot)
}

export function evaluatePlankConfidence(landmarks: NormalizedLandmark[]): number {
  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  const leftAnkle = landmarks[27]
  const rightAnkle = landmarks[28]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return 0
  }

  const shoulders = midpoint(leftShoulder, rightShoulder)
  const hips = midpoint(leftHip, rightHip)
  const ankles = midpoint(leftAnkle, rightAnkle)

  const bodyVector = toVector(shoulders, ankles)
  const torsoVector = toVector(shoulders, hips)
  const legVector = toVector(hips, ankles)

  const horizontalAngle = Math.abs(vectorAngle(bodyVector))
  const horizontalScore = 1 - clamp(horizontalAngle / (Math.PI / 4))

  const straightnessAngle = Math.abs(angleBetween(torsoVector, legVector))
  const straightnessScore = 1 - clamp(straightnessAngle / (Math.PI / 8))

  const hipMidlineY = (shoulders.y + ankles.y) / 2
  const hipDelta = Math.abs(hips.y - hipMidlineY)
  const hipScore = 1 - clamp(hipDelta / 0.15)

  return clamp((horizontalScore + straightnessScore + hipScore) / 3)
}
