import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three'
import { STAR_COUNT, STAR_MIN_R, STAR_SPREAD_R } from '../constants'

export interface StarField {
  points: Points
  dispose(): void
}

/** A shell of unlit points far behind the ball. They sit in the scene, not under the spin
    group: the stars holding still is part of what makes the ball read as turning in place. */
export function buildStars(): StarField {
  const starPos = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = STAR_MIN_R + Math.random() * STAR_SPREAD_R
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPos[i * 3 + 2] = r * Math.cos(phi)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(starPos, 3))
  const material = new PointsMaterial({
    color: 0x93a8c4,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  return {
    points,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}
