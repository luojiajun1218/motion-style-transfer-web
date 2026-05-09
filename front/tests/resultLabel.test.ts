import { buildResultLabel } from '../src/utils/resultLabel'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

assertEqual(
  buildResultLabel('walk.bvh', 'happy.bvh'),
  'walk_happy',
  'joins source and style BVH names with an underscore'
)

assertEqual(
  buildResultLabel('long.motion.v1.bvh', 'style.BVH'),
  'long.motion.v1_style',
  'removes only the BVH extension'
)

assertEqual(
  buildResultLabel(null, 'style.bvh'),
  'Styled',
  'falls back when either source or style name is missing'
)
