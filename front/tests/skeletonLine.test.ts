import { createSkeletonLine } from '../src/utils/skeletonLine'
import * as THREE from 'three'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const line = createSkeletonLine(new THREE.LineBasicMaterial({ color: '#d5bf62', opacity: 0.6, transparent: true }))

assert(
  line.frustumCulled === false,
  'dynamic skeleton lines should not be frustum culled after vertex positions move away from their initial bounds'
)

assert(
  line.geometry.attributes.position.count === 2,
  'skeleton lines should contain exactly two points'
)
