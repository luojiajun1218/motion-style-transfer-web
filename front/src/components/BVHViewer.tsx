import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { BVHLoader, BVHLoaderResult } from 'three/examples/jsm/loaders/BVHLoader'
import { ParsedBVHData } from '../services/api'
import { debugLog } from '../utils/debug'

interface BVHViewerProps {
  bvhUrl?: string | null          // For backend files (results)
  bvhData?: ParsedBVHData | null  // For local preview ( takes priority)
  frameIndex: number
}

interface BVHDataInternal {
  skeleton: THREE.Skeleton
  animationClip: THREE.AnimationClip
  boneGroup: THREE.Group
  fps: number
  frameTime: number
}

// Cached geometry and materials - created once, reused every frame
const sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8)
const rootBoneMaterial = new THREE.MeshStandardMaterial({ color: '#00ff00' })
const childBoneMaterial = new THREE.MeshStandardMaterial({ color: '#4a90e2' })
const lineMaterial = new THREE.LineBasicMaterial({ color: '#ffffff' })

function BVHScene({ bvhData, frameIndex }: { bvhData: BVHDataInternal | null, frameIndex: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const boneMeshRefs = useRef<THREE.Mesh[]>([])
  const lineRefs = useRef<THREE.Line[]>([])
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const initialized = useRef(false)

  // Initialize meshes, lines, and animation mixer
  useEffect(() => {
    if (!groupRef.current || !bvhData) return

    // Clear previous objects
    boneMeshRefs.current.forEach(mesh => {
      if (mesh.parent) mesh.parent.remove(mesh)
    })
    lineRefs.current.forEach(line => {
      if (line.parent) line.parent.remove(line)
    })
    boneMeshRefs.current = []
    lineRefs.current = []
    initialized.current = false

    // Stop previous animation
    if (mixerRef.current) {
      mixerRef.current.stopAllAction()
    }

    // Add boneGroup to scene (contains skeleton hierarchy)
    groupRef.current.add(bvhData.boneGroup)

    // Create sphere meshes for each bone (visualization overlay)
    bvhData.skeleton.bones.forEach((_, i) => {
      const mesh = new THREE.Mesh(sphereGeometry, i === 0 ? rootBoneMaterial : childBoneMaterial)
      mesh.userData.boneIndex = i
      groupRef.current!.add(mesh)
      boneMeshRefs.current.push(mesh)
    })

    // Create lines connecting parent-child bones
    bvhData.skeleton.bones.forEach((_, i) => {
      if (i === 0) return // Skip root bone (no parent line)
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(6) // 2 points * 3 coords
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const line = new THREE.Line(geometry, lineMaterial)
      line.userData.boneIndex = i
      groupRef.current!.add(line)
      lineRefs.current.push(line)
    })

    // Setup animation mixer to apply BVH animation to skeleton
    mixerRef.current = new THREE.AnimationMixer(bvhData.boneGroup)
    actionRef.current = mixerRef.current.clipAction(bvhData.animationClip)
    actionRef.current.play()
    actionRef.current.paused = true // Pause so we control frame manually

    // Initialize at frame 0
    actionRef.current.time = 0
    mixerRef.current.update(0)
    bvhData.skeleton.update()

    initialized.current = true
    debugLog('BVHScene', 'Ready', { bones: bvhData.skeleton.bones.length, duration: bvhData.animationClip.duration })

    return () => {
      // Cleanup
      if (groupRef.current && bvhData.boneGroup.parent === groupRef.current) {
        groupRef.current.remove(bvhData.boneGroup)
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
  }, [bvhData])

  // Update animation frame and mesh positions
  useFrame(() => {
    if (!bvhData || !initialized.current || !mixerRef.current || !actionRef.current) return

    const targetTime = frameIndex * bvhData.frameTime

    // Clamp to clip duration
    const clampedTime = Math.min(targetTime, bvhData.animationClip.duration - bvhData.frameTime)

    // Set animation to specific frame
    actionRef.current.time = clampedTime
    mixerRef.current.update(0) // Apply current time state
    bvhData.skeleton.update()

    // Update mesh positions from bone world positions
    boneMeshRefs.current.forEach((mesh, i) => {
      if (i >= bvhData.skeleton.bones.length) return
      const bone = bvhData.skeleton.bones[i]
      const pos = new THREE.Vector3()
      bone.getWorldPosition(pos)
      mesh.position.set(pos.x, pos.y, pos.z)
    })

    // Update line positions
    lineRefs.current.forEach((line) => {
      const boneIndex = line.userData.boneIndex as number
      if (boneIndex >= bvhData.skeleton.bones.length) return
      const bone = bvhData.skeleton.bones[boneIndex]
      const parent = bone.parent
      if (!parent) return

      const parentPos = new THREE.Vector3()
      const childPos = new THREE.Vector3()
      parent.getWorldPosition(parentPos)
      bone.getWorldPosition(childPos)

      const positionAttr = line.geometry.attributes.position as THREE.BufferAttribute
      positionAttr.setXYZ(0, parentPos.x, parentPos.y, parentPos.z)
      positionAttr.setXYZ(1, childPos.x, childPos.y, childPos.z)
      positionAttr.needsUpdate = true
    })
  })

  if (!bvhData) return null

  return <group ref={groupRef} />
}

export default function BVHViewer({ bvhUrl, bvhData, frameIndex }: BVHViewerProps) {
  const [loadedBvhData, setLoadedBvhData] = useState<BVHDataInternal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalBvhData: BVHDataInternal | null = bvhData ? {
    skeleton: bvhData.skeleton,
    animationClip: bvhData.clip,
    boneGroup: bvhData.boneGroup,
    fps: bvhData.fps || 30,
    frameTime: bvhData.frameTime || (1 / 30)
  } : loadedBvhData

  // Load from URL only if no bvhData provided
  useEffect(() => {
    // If bvhData is provided, use it directly (no loading needed)
    if (bvhData) {
      setLoadedBvhData(null)
      setLoading(false)
      setError(null)
      return
    }

    // Otherwise, load from URL
    if (!bvhUrl) {
      setLoadedBvhData(null)
      return
    }

    setLoading(true)
    setError(null)

    const loader = new BVHLoader()
    loader.load(
      bvhUrl,
      (result: BVHLoaderResult) => {
        // Create a group to hold the skeleton - only add ROOT bones
        const boneGroup = new THREE.Group()
        const rootBones = result.skeleton.bones.filter(
          (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
        )
        rootBones.forEach((rootBone: THREE.Bone) => {
          boneGroup.add(rootBone)
        })

        // Calculate fps from clip duration and track data
        const fps = 30 // BVH default
        const frameTime = 1 / fps

        setLoadedBvhData({
          skeleton: result.skeleton,
          animationClip: result.clip,
          boneGroup: boneGroup,
          fps,
          frameTime
        })
        setLoading(false)
      },
      undefined,
      (err: ErrorEvent) => {
        setError(`Failed to load BVH: ${err}`)
        setLoading(false)
      }
    )

    // Cleanup function
    return () => {
      setLoadedBvhData(null)
    }
  }, [bvhUrl, bvhData])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff' }}>Loading...</div>}
      {error && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'red' }}>{error}</div>}
      {!loading && !error && !finalBvhData && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>No BVH file loaded</div>}
      <Canvas camera={{ position: [0, 5, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <BVHScene bvhData={finalBvhData} frameIndex={frameIndex} />
        <gridHelper args={[20, 20, 0x444444, 0x222222]} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}