import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import SkeletonGroup from './SkeletonGroup'
import { ParsedBVHData, getBVHUrl, calculateBVHBounds } from '../services/api'
import { useState, useEffect, useCallback, useRef } from 'react'

interface UnifiedCanvasProps {
  sourceData: ParsedBVHData | null
  styleData: ParsedBVHData | null
  resultData: ParsedBVHData | null
  resultFileId: string | null
  frameIndex: number
}

function calculateCombinedBoundsFromParsed(
  dataList: { data: ParsedBVHData | null; offset: number }[]
): { center: THREE.Vector3; size: THREE.Vector3; maxDim: number } | null {
  const combinedBox = new THREE.Box3()
  let hasData = false

  dataList.forEach(({ data, offset }) => {
    if (!data) return
    hasData = true
    const bounds = data.bounds.clone()
    bounds.min.x += offset
    bounds.max.x += offset
    combinedBox.union(bounds)
  })

  if (!hasData) return null

  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  combinedBox.getCenter(center)
  combinedBox.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)

  return { center, size, maxDim }
}

function CameraController({
  sourceData,
  styleData,
  resultData,
  loadedResultData,
  controlsRef
}: {
  sourceData: ParsedBVHData | null
  styleData: ParsedBVHData | null
  resultData: ParsedBVHData | null
  loadedResultData: ParsedBVHData | null
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  const fitCamera = useCallback(() => {
    const effectiveResult = resultData || loadedResultData
    const dataList = [
      { data: sourceData, offset: -6 },
      { data: styleData, offset: 0 },
      { data: effectiveResult, offset: 6 }
    ]

    const result = calculateCombinedBoundsFromParsed(dataList)
    if (!result) return

    const { center, maxDim } = result
    const fov = (camera as THREE.PerspectiveCamera).fov || 50
    const fovRadians = (fov * Math.PI) / 180
    const paddingFactor = 2.0

    const distance = (maxDim / 2) / Math.tan(fovRadians / 2) * paddingFactor

    // Position camera with a downward angle (not flat horizontal view)
    // This makes the grid plane visible as a surface, not a line
    camera.position.set(center.x, center.y + distance * 0.5, center.z + distance * 0.8)
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }

    console.log('[CameraController] center=', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2), 'distance=', distance.toFixed(2))
  }, [sourceData, styleData, resultData, loadedResultData, camera, controlsRef])

  useEffect(() => {
    if (sourceData || styleData || resultData || loadedResultData) {
      fitCamera()
    }
  }, [sourceData, styleData, resultData, loadedResultData, fitCamera])

  return null
}

export default function UnifiedCanvas({
  sourceData,
  styleData,
  resultData,
  resultFileId,
  frameIndex
}: UnifiedCanvasProps) {
  const [loadedResultData, setLoadedResultData] = useState<ParsedBVHData | null>(null)
  const [loading, setLoading] = useState(false)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  useEffect(() => {
    if (resultData) { setLoadedResultData(null); return }
    if (!resultFileId) { setLoadedResultData(null); return }

    setLoading(true)
    const url = getBVHUrl(resultFileId)

    import('three/examples/jsm/loaders/BVHLoader').then(({ BVHLoader }) => {
      const loader = new BVHLoader()
      loader.load(url, (result) => {
        const boneGroup = new THREE.Group()
        const rootBones = result.skeleton.bones.filter(
          (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
        )
        rootBones.forEach((rootBone: THREE.Bone) => boneGroup.add(rootBone))

        // 统一朝向：静态旋转，与 FileUploader 保持一致
        boneGroup.rotation.y = -Math.PI / 2

        const bones: THREE.Bone[] = []
        boneGroup.traverse((child) => { if (child instanceof THREE.Bone) bones.push(child) })

        // Apply animation frame 0 before calculating bounds
        const mixer = new THREE.AnimationMixer(boneGroup)
        const action = mixer.clipAction(result.clip)
        action.play()
        action.paused = true
        action.time = 0
        mixer.update(0)

        const { bounds, size, center } = calculateBVHBounds(boneGroup)
        mixer.stopAllAction()

        setLoadedResultData({
          skeleton: result.skeleton, clip: result.clip, boneGroup,
          frameCount: Math.ceil(result.clip.duration * 30), frameTime: 1/30, fps: 30,
          bounds, boundsSize: size, boundsCenter: center
        })
        setLoading(false)
      }, undefined, (err: unknown) => { console.error('Load failed:', err); setLoading(false) })
    })
  }, [resultFileId, resultData])

  const effectiveResultData = resultData || loadedResultData
  const hasAnyData = Boolean(sourceData || styleData || effectiveResultData)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#484848' }}>
      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#e0e0e0' }}>Loading...</div>}
      {!hasAnyData && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>No BVH files loaded</div>}
      <Canvas camera={{ position: [0, 25, 40], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <CameraController sourceData={sourceData} styleData={styleData} resultData={resultData} loadedResultData={loadedResultData} controlsRef={controlsRef} />

        <SkeletonGroup bvhData={sourceData} frameIndex={frameIndex} xOffset={-6} color="#00ff88" label="Source" />
        <SkeletonGroup bvhData={styleData} frameIndex={frameIndex} xOffset={0} color="#4a90e2" label="Style" />
        <SkeletonGroup bvhData={effectiveResultData} frameIndex={frameIndex} xOffset={6} color="#ff9a00" label="Result" />

        <gridHelper args={[30, 30, 0xaaaaaa, 0x888888]} />
        <OrbitControls ref={controlsRef} makeDefault />
      </Canvas>
    </div>
  )
}