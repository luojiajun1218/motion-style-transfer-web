import { buildMotionFileLabel, buildResultLabel, buildTransferResultLabel } from '../src/utils/resultLabel'

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
  '已迁移',
  'falls back when either source or style name is missing'
)

assertEqual(
  buildTransferResultLabel('backend_walk_happy.bvh', 'walk.bvh', 'happy.bvh'),
  'backend_walk_happy.bvh',
  'prefers backend result name when present'
)

assertEqual(
  buildTransferResultLabel('', 'walk.bvh', 'happy.bvh'),
  'walk_happy',
  'falls back to local source/style label when backend result name is empty'
)

assertEqual(
  buildMotionFileLabel('walk.bvh', '源动作'),
  'walk.bvh',
  'source and style labels keep the original BVH filename'
)

assertEqual(
  buildMotionFileLabel(null, '风格'),
  '风格',
  'falls back to the role label when the original BVH filename is missing'
)

assertEqual(
  buildMotionFileLabel('  jump.bvh  ', '未分配'),
  'jump.bvh',
  'trims imported BVH filenames before showing them on the canvas'
)
