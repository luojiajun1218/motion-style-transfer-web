import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { ParsedBVHData } from '../types'

interface SkeletonGroupProps {
  bvhData: ParsedBVHData | null
  frameIndex: number
  xOffset: number
  color: string
  label: string
  isSelected?: boolean
  showLabel?: boolean
  skeletonType?: string  // 新增：用于点击检测识别
}

// Cached geometry - shared across all skeletons
const sphereGeometry = new THREE.SphereGeometry(0.15, 8, 8)

// Reusable Vector3 objects to avoid GC pressure in useFrame
const tempPos = new THREE.Vector3()
const tempParentPos = new THREE.Vector3()
const tempChildPos = new THREE.Vector3()

export default function SkeletonGroup({ bvhData, frameIndex, xOffset, color, label, isSelected = false, showLabel = true, skeletonType }: SkeletonGroupProps) {
  const groupRef = useRef<THREE.Group>(null)
  const boneMeshRefs = useRef<THREE.Mesh[]>([])
  const lineRefs = useRef<THREE.Line[]>([])
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const initialized = useRef(false)
  const billboardRef = useRef<THREE.Group>(null)

  // Store cloned skeleton data for use in useFrame
  const clonedBonesRef = useRef<THREE.Bone[]>([])

  // Materials for this skeleton (created per-instance for color variation)
  const boneMaterial = useRef(new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.9 }))
  const lineMaterial = useRef(new THREE.LineBasicMaterial({ color, opacity: 0.6, transparent: true }))

  // Update material color when color prop changes (no reconstruction needed)
  useEffect(() => {
    if (isSelected) {
      // 选中时：更亮的颜色 + 不透明
      boneMaterial.current.color.setStyle('#ffffff')
      boneMaterial.current.emissive = new THREE.Color(color)
      boneMaterial.current.emissiveIntensity = 2.0
      boneMaterial.current.opacity = 1
      lineMaterial.current.color.setStyle(color)
      lineMaterial.current.opacity = 1
    } else {
      // 未选中时：原始颜色 + 半透明
      boneMaterial.current.color.setStyle(color)
      boneMaterial.current.emissive = new THREE.Color(0x000000)
      boneMaterial.current.emissiveIntensity = 0
      boneMaterial.current.opacity = 0.85
      lineMaterial.current.color.setStyle(color)
      lineMaterial.current.opacity = 0.5
    }
  }, [isSelected, color])

  // Initialize skeleton visualization
  useEffect(() => {
    if (!groupRef.current || !bvhData) return

    // Cleanup previous
    boneMeshRefs.current.forEach(mesh => {
      if (mesh.parent) mesh.parent.remove(mesh)
    })
    lineRefs.current.forEach(line => {
      if (line.parent) line.parent.remove(line)
    })
    boneMeshRefs.current = []
    lineRefs.current = []
    initialized.current = false

    if (mixerRef.current) {
      mixerRef.current.stopAllAction()
    }

    // Use SkeletonUtils.clone() to properly clone the entire skeleton hierarchy
    // This ensures each SkeletonGroup has its own independent Bone objects
    const clonedBoneGroup = SkeletonUtils.clone(bvhData.boneGroup) as THREE.Group
    clonedBoneGroup.position.x = xOffset
    clonedBoneGroup.userData.skeletonType = skeletonType  // 设置类型标识
    groupRef.current.userData.skeletonType = skeletonType  // 根节点也设置
    groupRef.current.add(clonedBoneGroup)

    // Get the cloned skeleton bones from the cloned group
    const clonedBones: THREE.Bone[] = []
    clonedBoneGroup.traverse((child) => {
      if (child instanceof THREE.Bone) {
        clonedBones.push(child)
      }
    })

    // Create a new Skeleton with the cloned bones
    const clonedSkeleton = new THREE.Skeleton(clonedBones)

    // Store cloned bones for useFrame
    clonedBonesRef.current = clonedBones

    // Create sphere meshes for bones (using cloned bones count)
    clonedBones.forEach((_, i) => {
      const mesh = new THREE.Mesh(sphereGeometry, boneMaterial.current)
      mesh.userData.boneIndex = i
      groupRef.current!.add(mesh)
      boneMeshRefs.current.push(mesh)
    })

    // Create lines connecting bones (using cloned bones count)
    clonedBones.forEach((_, i) => {
      if (i === 0) return
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const line = new THREE.Line(geometry, lineMaterial.current)
      line.userData.boneIndex = i
      groupRef.current!.add(line)
      lineRefs.current.push(line)
    })

    // Setup animation on cloned group
    mixerRef.current = new THREE.AnimationMixer(clonedBoneGroup)
    actionRef.current = mixerRef.current.clipAction(bvhData.clip)
    actionRef.current.play()
    actionRef.current.paused = true
    actionRef.current.time = 0
    mixerRef.current.update(0)
    clonedSkeleton.update()

    // IMPORTANT: Set mesh positions immediately after animation update
    // This ensures bounds.refresh() gets correct mesh positions
    clonedBones.forEach((bone, i) => {
      const mesh = boneMeshRefs.current[i]
      if (mesh) {
        bone.getWorldPosition(tempPos)
        mesh.position.set(tempPos.x, tempPos.y, tempPos.z)
      }
    })

    // Set line positions immediately as well
    lineRefs.current.forEach((line) => {
      const boneIndex = line.userData.boneIndex as number
      if (boneIndex >= clonedBones.length) return
      const bone = clonedBones[boneIndex]
      const parent = bone.parent
      if (!parent) return

      parent.getWorldPosition(tempParentPos)
      bone.getWorldPosition(tempChildPos)

      const positionAttr = line.geometry.attributes.position as THREE.BufferAttribute
      positionAttr.setXYZ(0, tempParentPos.x, tempParentPos.y, tempParentPos.z)
      positionAttr.setXYZ(1, tempChildPos.x, tempChildPos.y, tempChildPos.z)
      positionAttr.needsUpdate = true
    })

    initialized.current = true

    return () => {
      // Cleanup cloned group (original remains untouched)
      if (groupRef.current) {
        const child = groupRef.current.children.find(c => c.position.x === xOffset)
        if (child) groupRef.current.remove(child)
      }
      boneMeshRefs.current.forEach(mesh => {
        if (mesh.parent) mesh.parent.remove(mesh)
      })
      lineRefs.current.forEach(line => {
        if (line.parent) line.parent.remove(line)
      })
      boneMeshRefs.current = []
      lineRefs.current = []
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current = null
      }
      initialized.current = false
    }
  }, [bvhData, xOffset, skeletonType])  // color removed - handled by separate effect

  // Update frame
  useFrame(() => {
    if (!bvhData || !initialized.current || !mixerRef.current || !actionRef.current) return

    const clonedBones = clonedBonesRef.current
    if (clonedBones.length === 0) return

    const targetTime = frameIndex * (bvhData.frameTime || 1/30)
    const clampedTime = Math.min(targetTime, bvhData.clip.duration - (bvhData.frameTime || 1/30))

    actionRef.current.time = clampedTime
    mixerRef.current.update(0)

    // Update mesh positions using cloned bones
    boneMeshRefs.current.forEach((mesh, i) => {
      if (i >= clonedBones.length) return
      const bone = clonedBones[i]
      bone.getWorldPosition(tempPos)
      mesh.position.set(tempPos.x, tempPos.y, tempPos.z)
    })

    // Update line positions using cloned bones
    lineRefs.current.forEach((line) => {
      const boneIndex = line.userData.boneIndex as number
      if (boneIndex >= clonedBones.length) return
      const bone = clonedBones[boneIndex]
      const parent = bone.parent
      if (!parent) return

      parent.getWorldPosition(tempParentPos)
      bone.getWorldPosition(tempChildPos)

      const positionAttr = line.geometry.attributes.position as THREE.BufferAttribute
      positionAttr.setXYZ(0, tempParentPos.x, tempParentPos.y, tempParentPos.z)
      positionAttr.setXYZ(1, tempChildPos.x, tempChildPos.y, tempChildPos.z)
      positionAttr.needsUpdate = true
    })

    // Update label position at the bottom of skeleton (center X/Z, lowest Y)
    if (clonedBones.length > 0 && billboardRef.current) {
      // Calculate skeleton center (average X/Z) and lowest Y
      let sumX = 0, sumZ = 0, lowestY = Infinity
      clonedBones.forEach((bone) => {
        bone.getWorldPosition(tempPos)
        sumX += tempPos.x
        sumZ += tempPos.z
        if (tempPos.y < lowestY) {
          lowestY = tempPos.y
        }
      })
      const centerX = sumX / clonedBones.length
      const centerZ = sumZ / clonedBones.length
      // Position billboard at skeleton center X/Z, below lowest Y
      billboardRef.current.position.set(centerX, lowestY - 1.5, centerZ)
    }
  })

  if (!bvhData) return null

  return (
    <group ref={groupRef}>
      {showLabel && (
        <Billboard ref={billboardRef} follow={true}>
          <Text
            fontSize={1.2}
            color={color}
            anchorX="center"
            anchorY="top"
          >
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  )
}