import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import SkeletonGroup from './SkeletonGroup'
import { BVHFileWithRole, ParsedBVHData, getApiAuthHeaders, getBVHUrl, calculateBVHBounds } from '../types'
import { useState, useEffect, useCallback, useRef } from 'react'
import { buildResultLabel } from '../utils/resultLabel'

interface UnifiedCanvasProps {
  allFiles: BVHFileWithRole[]
  resultData: ParsedBVHData | null
  resultFileId: string | null
  frameIndex: number
  selectedSkeleton: 'source' | 'style' | 'result' | number | null
  onFileSelect: (index: number) => void
  onSkeletonSelect: (skeleton: 'source' | 'style' | 'result' | number | null) => void
}

// 点击检测组件
function ClickDetector({
  allFiles,
  onFileSelect,
  onSkeletonSelect
}: {
  allFiles: BVHFileWithRole[]
  onFileSelect: (index: number) => void
  onSkeletonSelect: (skeleton: 'source' | 'style' | 'result' | number | null) => void
}) {
  const { camera, scene, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // 计算鼠标位置
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // 射线检测
      raycaster.current.setFromCamera(mouse.current, camera)
      const intersects = raycaster.current.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        const object = intersects[0].object

        // 查找点击的物体属于哪个骨骼组
        let parent: THREE.Object3D | null = object
        while (parent) {
          if (parent.userData.skeletonType) {
            const type = parent.userData.skeletonType as string
            if (type === 'source') {
              const sourceIndex = allFiles.findIndex(f => f.role === 'source')
              if (sourceIndex !== -1) onFileSelect(sourceIndex)
              onSkeletonSelect('source')
            } else if (type === 'style') {
              const styleIndex = allFiles.findIndex(f => f.role === 'style')
              if (styleIndex !== -1) onFileSelect(styleIndex)
              onSkeletonSelect('style')
            } else if (type === 'result') {
              onSkeletonSelect('result')
            } else if (type.startsWith('unassigned-')) {
              const index = parseInt(type.split('-')[1])
              onFileSelect(index)
              onSkeletonSelect(index)  // 关键：传递索引让骨骼高亮
            }
            return
          }
          parent = parent.parent
        }
      }
    }

    gl.domElement.addEventListener('click', handleClick)
    return () => gl.domElement.removeEventListener('click', handleClick)
  }, [camera, scene, gl, allFiles, onFileSelect, onSkeletonSelect])

  return null
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
  allFiles,
  resultData,
  loadedResultData,
  controlsRef
}: {
  allFiles: BVHFileWithRole[]
  resultData: ParsedBVHData | null
  loadedResultData: ParsedBVHData | null
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  const fitCamera = useCallback(() => {
    const dataList: { data: ParsedBVHData | null; offset: number }[] = []

    const sourceFile = allFiles.find(f => f.role === 'source')
    const styleFile = allFiles.find(f => f.role === 'style')

    if (sourceFile?.parsedData) {
      dataList.push({ data: sourceFile.parsedData, offset: -6 })
    }
    if (styleFile?.parsedData) {
      dataList.push({ data: styleFile.parsedData, offset: 0 })
    }

    const effectiveResult = resultData || loadedResultData
    if (effectiveResult) {
      dataList.push({ data: effectiveResult, offset: 6 })
    }

    const unassignedFiles = allFiles.filter(f => f.role === 'unassigned' && f.parsedData)
    unassignedFiles.forEach((f, i) => {
      dataList.push({ data: f.parsedData!, offset: 12 + i * 6 })
    })

    const result = calculateCombinedBoundsFromParsed(dataList)
    if (!result) return

    const { center, maxDim } = result
    const fov = (camera as THREE.PerspectiveCamera).fov || 50
    const fovRadians = (fov * Math.PI) / 180
    const paddingFactor = 2.0

    const distance = (maxDim / 2) / Math.tan(fovRadians / 2) * paddingFactor

    camera.position.set(center.x, center.y + distance * 0.5, center.z + distance * 0.8)
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }

    // debugLog('[CameraController]', `center=${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)} distance=${distance.toFixed(2)}`)
  }, [allFiles, resultData, loadedResultData, camera, controlsRef])

  useEffect(() => {
    const hasData = allFiles.some(f => f.parsedData) || resultData || loadedResultData
    if (hasData) {
      fitCamera()
    }
  }, [allFiles, resultData, loadedResultData, fitCamera])

  return null
}

export default function UnifiedCanvas({
  allFiles,
  resultData,
  resultFileId,
  frameIndex,
  selectedSkeleton,
  onFileSelect,
  onSkeletonSelect,
}: UnifiedCanvasProps) {
  const [loadedResultData, setLoadedResultData] = useState<ParsedBVHData | null>(null)
  const [loading, setLoading] = useState(false)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const isMountedRef = useRef(true)

  const unassignedFiles = allFiles.filter(f => f.role === 'unassigned')

  useEffect(() => {
    isMountedRef.current = true

    if (resultData) { setLoadedResultData(null); return }
    if (!resultFileId) { setLoadedResultData(null); return }

    setLoading(true)
    const url = getBVHUrl(resultFileId)

    import('three/examples/jsm/loaders/BVHLoader').then(({ BVHLoader }) => {
      const loader = new BVHLoader()
      loader.setRequestHeader(getApiAuthHeaders())
      loader.load(url, (result) => {
        if (!isMountedRef.current) return  // 组件已卸载，不更新状态

        const boneGroup = new THREE.Group()
        const rootBones = result.skeleton.bones.filter(
          (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
        )
        rootBones.forEach((rootBone: THREE.Bone) => boneGroup.add(rootBone))

        boneGroup.rotation.y = -Math.PI / 2

        const bones: THREE.Bone[] = []
        boneGroup.traverse((child) => { if (child instanceof THREE.Bone) bones.push(child) })

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
      }, undefined, (err: unknown) => {
        if (!isMountedRef.current) return
        console.error('Load failed:', err)
        setLoading(false)
      })
    })

    return () => {
      isMountedRef.current = false
      setLoadedResultData(null)
    }
  }, [resultFileId, resultData])

  const effectiveResultData = resultData || loadedResultData
  const hasAnyData = allFiles.some(f => f.parsedData) || Boolean(effectiveResultData)

  // 获取各角色文件
  const sourceFile = allFiles.find(f => f.role === 'source')
  const styleFile = allFiles.find(f => f.role === 'style')
  const resultLabel = buildResultLabel(sourceFile?.file?.name, styleFile?.file?.name)

  return (
    <div className="canvas-shell">
      {loading && <div className="canvas-state">Loading motion data...</div>}
      {!hasAnyData && <div className="canvas-state">Import a BVH file to start</div>}
      <Canvas camera={{ position: [0, 25, 40], fov: 50 }} onCreated={({ gl }) => gl.setClearColor('#1c2127')}>
        <color attach="background" args={['#1c2127']} />
        <ambientLight intensity={0.68} />
        <directionalLight position={[10, 10, 5]} intensity={1.15} />

        <ClickDetector allFiles={allFiles} onFileSelect={onFileSelect} onSkeletonSelect={onSkeletonSelect} />

        <CameraController allFiles={allFiles} resultData={resultData} loadedResultData={loadedResultData} controlsRef={controlsRef} />

        {/* Source */}
        <SkeletonGroup bvhData={sourceFile?.parsedData ?? null} frameIndex={frameIndex} xOffset={-6} color="#78c28f" label="Source" isSelected={selectedSkeleton === 'source'} skeletonType="source" />

        {/* Style */}
        <SkeletonGroup bvhData={styleFile?.parsedData ?? null} frameIndex={frameIndex} xOffset={0} color="#69afe5" label="Style" isSelected={selectedSkeleton === 'style'} skeletonType="style" />

        {/* Result */}
        <SkeletonGroup bvhData={effectiveResultData} frameIndex={frameIndex} xOffset={6} color="#d5bf62" label={resultLabel} isSelected={selectedSkeleton === 'result'} skeletonType="result" />

        {/* Unassigned files */}
        {unassignedFiles.map((f, i) => {
          const actualIndex = allFiles.findIndex(file => file === f)
          const isSelected = selectedSkeleton === actualIndex  // 动态判断是否选中
          return (
            <SkeletonGroup
              key={`unassigned-${i}`}
              bvhData={f.parsedData}
              frameIndex={frameIndex}
              xOffset={12 + i * 6}
              color="#98a7ad"
              label=""
              isSelected={isSelected}
              showLabel={false}
              skeletonType={`unassigned-${actualIndex}`}
            />
          )
        })}

        <gridHelper args={[30, 30, 0x5b626b, 0x343b44]} />
        <OrbitControls ref={controlsRef as any} makeDefault />
      </Canvas>
    </div>
  )
}
