import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader'
import * as THREE from 'three'
import type { ParsedBVHData } from '../types'
import { calculateBVHBounds } from '../types'

export function parseBVHText(text: string): ParsedBVHData {
  const loader = new BVHLoader()
  const result = loader.parse(text)

  const boneGroup = new THREE.Group()
  const rootBones = result.skeleton.bones.filter(
    (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
  )
  rootBones.forEach((rootBone: THREE.Bone) => boneGroup.add(rootBone))

  boneGroup.rotation.y = -Math.PI / 2

  const fps = 30
  const frameTime = 1 / fps
  const frameCount = Math.ceil(result.clip.duration * fps)
  const { bounds, size, center } = calculateBVHBounds(boneGroup, result.clip)

  return {
    skeleton: result.skeleton,
    clip: result.clip,
    boneGroup,
    frameCount,
    frameTime,
    fps,
    bounds,
    boundsSize: size,
    boundsCenter: center,
  }
}
