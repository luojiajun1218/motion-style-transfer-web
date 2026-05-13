import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader'
import { Children, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import SkeletonGroup from './SkeletonGroup'
import { BVHFileWithRole, ParsedBVHData, getApiAuthHeaders, getBVHUrl, calculateBVHBounds } from '../types'
import { buildMotionFileLabel, buildResultLabel } from '../utils/resultLabel'
import { isCurrentResultLoad } from '../utils/resultLoadGuard'
import type { ResultPaneEntry, SourcePaneEntry } from '../utils/previewPaneFiles'

interface SourceResultCanvasProps {
  allFiles: BVHFileWithRole[]
  sourceEntries: SourcePaneEntry<BVHFileWithRole>[]
  resultEntries: ResultPaneEntry<BVHFileWithRole>[]
  resultData: ParsedBVHData | null
  resultFileId: string | null
  resultFileName: string | null
  frameIndex: number
  selectedSkeleton: 'source' | 'style' | 'result' | number | null
  sourcePreviewFileIndex: number | null
  resultPreviewFileIndex: number | null
  onSourceRowSelect: (index: number) => void
  onCurrentResultSelect: () => void
  onCurrentResultRemove: () => void
  onArchivedResultSelect: (index: number) => void
  onFileRemove: (index: number) => void
  onSkeletonSelect: (skeleton: 'source' | 'style' | 'result' | number | null) => void
}

interface MotionPaneProps {
  title: string
  bvhData: ParsedBVHData | null
  fileId?: string | null
  fileName: string
  frameIndex: number
  color: string
  selected: boolean
  emptyMessage: string
  loadingMessage?: string
  skeletonType: 'source' | 'result'
  onSelect: () => void
}

const roleLabels = {
  source: 'Source',
  style: 'Style',
  unassigned: 'BVH'
}

function getFileDisplayName(bvhFile: BVHFileWithRole): string {
  return bvhFile.label ?? bvhFile.file?.name ?? 'Unknown BVH'
}

interface PaneBvhListProps {
  title: string
  emptyMessage: string
  children: ReactNode
}

function PaneBvhList({ title, emptyMessage, children }: PaneBvhListProps) {
  const hasChildren = Children.count(children) > 0

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.currentTarget.scrollLeft += event.deltaY
    event.preventDefault()
  }

  return (
    <div className="pane-bvh-list">
      <div className="pane-bvh-list-header">{title}</div>
      <div className="pane-bvh-list-body" onWheel={handleWheel}>
        {hasChildren ? children : <div className="pane-bvh-empty">{emptyMessage}</div>}
      </div>
    </div>
  )
}

function CameraController({
  bvhData,
  controlsRef
}: {
  bvhData: ParsedBVHData | null
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  const fitCamera = useCallback(() => {
    if (!bvhData) return

    const center = bvhData.boundsCenter
    const size = bvhData.boundsSize
    const maxDim = Math.max(size.x, size.y, size.z, 1)
    const fov = (camera as THREE.PerspectiveCamera).fov || 50
    const fovRadians = (fov * Math.PI) / 180
    const distance = (maxDim / 2) / Math.tan(fovRadians / 2) * 2.0

    camera.position.set(center.x, center.y + distance * 0.5, center.z + distance * 0.8)
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }, [bvhData, camera, controlsRef])

  useEffect(() => {
    fitCamera()
  }, [fitCamera])

  return null
}

function MotionPane({
  title,
  bvhData,
  fileId,
  fileName,
  frameIndex,
  color,
  selected,
  emptyMessage,
  loadingMessage = 'Loading...',
  skeletonType,
  onSelect
}: MotionPaneProps) {
  const [loadedData, setLoadedData] = useState<ParsedBVHData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const currentFileIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (bvhData) {
      currentFileIdRef.current = null
      setLoadedData(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!fileId) {
      currentFileIdRef.current = null
      setLoadedData(null)
      setLoading(false)
      setError(null)
      return
    }

    currentFileIdRef.current = fileId
    const loadingFileId = fileId
    const isActiveLoad = () => isCurrentResultLoad(loadingFileId, () => currentFileIdRef.current)

    setLoading(true)
    setError(null)
    const url = getBVHUrl(loadingFileId)

    const loader = new BVHLoader()
    loader.setRequestHeader(getApiAuthHeaders())
    loader.load(url, (result) => {
      if (!isActiveLoad()) return

      const boneGroup = new THREE.Group()
      const rootBones = result.skeleton.bones.filter(
        (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
      )
      rootBones.forEach((rootBone: THREE.Bone) => boneGroup.add(rootBone))
      boneGroup.rotation.y = -Math.PI / 2

      const mixer = new THREE.AnimationMixer(boneGroup)
      const action = mixer.clipAction(result.clip)
      action.play()
      action.paused = true
      action.time = 0
      mixer.update(0)

      const { bounds, size, center } = calculateBVHBounds(boneGroup, result.clip)
      mixer.stopAllAction()

      if (!isActiveLoad()) return
      setLoadedData({
        skeleton: result.skeleton,
        clip: result.clip,
        boneGroup,
        frameCount: Math.ceil(result.clip.duration * 30),
        frameTime: 1 / 30,
        fps: 30,
        bounds,
        boundsSize: size,
        boundsCenter: center
      })
      setLoading(false)
    }, undefined, (err: unknown) => {
      if (!isActiveLoad()) return
      console.error('Load failed:', err)
      setError('Result load failed')
      setLoading(false)
    })

    return () => {
      if (currentFileIdRef.current === loadingFileId) {
        currentFileIdRef.current = null
        setLoadedData(null)
      }
    }
  }, [bvhData, fileId])

  const effectiveData = bvhData || loadedData
  const stateMessage = error || (loading ? loadingMessage : (!effectiveData ? emptyMessage : null))

  return (
    <div
      className={`motion-pane ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="motion-pane-header">
        <span className="motion-pane-dot" style={{ backgroundColor: color }} />
        <span>{title}</span>
      </div>
      {stateMessage && <div className="canvas-state">{stateMessage}</div>}
      <Canvas camera={{ position: [0, 25, 40], fov: 50 }} onCreated={({ gl }) => gl.setClearColor('#1c2127')}>
        <color attach="background" args={['#1c2127']} />
        <ambientLight intensity={0.68} />
        <directionalLight position={[10, 10, 5]} intensity={1.15} />
        <CameraController bvhData={effectiveData} controlsRef={controlsRef} />
        <SkeletonGroup
          bvhData={effectiveData}
          frameIndex={frameIndex}
          xOffset={0}
          color={color}
          label={fileName}
          isSelected={selected}
          skeletonType={skeletonType}
        />
        <gridHelper args={[30, 30, 0x5b626b, 0x343b44]} />
        <OrbitControls ref={controlsRef as any} makeDefault />
      </Canvas>
    </div>
  )
}

export default function SourceResultCanvas({
  allFiles,
  sourceEntries,
  resultEntries,
  resultData,
  resultFileId,
  resultFileName,
  frameIndex,
  selectedSkeleton,
  sourcePreviewFileIndex,
  resultPreviewFileIndex,
  onSourceRowSelect,
  onCurrentResultSelect,
  onCurrentResultRemove,
  onArchivedResultSelect,
  onFileRemove,
  onSkeletonSelect,
}: SourceResultCanvasProps) {
  const defaultSourceIndex = allFiles.findIndex(file => file.role === 'source')
  const effectiveSourceIndex = sourcePreviewFileIndex ?? defaultSourceIndex
  const sourceFile = effectiveSourceIndex >= 0 ? allFiles[effectiveSourceIndex] : undefined
  const styleFile = allFiles.find(file => file.role === 'style')
  const sourceLabel = buildMotionFileLabel(sourceFile?.file?.name, 'Source')
  const archivedResultFile = resultPreviewFileIndex === null ? undefined : allFiles[resultPreviewFileIndex]
  const activeResultData = archivedResultFile?.parsedData ?? resultData
  const activeResultFileId = archivedResultFile ? archivedResultFile.fileId : resultFileId
  const activeResultName = archivedResultFile ? getFileDisplayName(archivedResultFile) : resultFileName
  const resultLabel = activeResultName ?? buildResultLabel(sourceFile?.file?.name, styleFile?.file?.name)

  const handleSourceSelect = () => {
    if (effectiveSourceIndex !== -1) {
      onSourceRowSelect(effectiveSourceIndex)
    } else {
      onSkeletonSelect('source')
    }
  }

  const handleResultSelect = () => {
    if (resultPreviewFileIndex === null) {
      onCurrentResultSelect()
    } else {
      onArchivedResultSelect(resultPreviewFileIndex)
    }
  }

  const selectedSourceRowIndex = sourcePreviewFileIndex

  return (
    <div className="canvas-shell comparison-canvas">
      <div className="motion-pane-stack">
        <PaneBvhList title="Source BVH" emptyMessage="No source BVH imported">
          {sourceEntries.map(({ file, originalIndex }) => {
            const isSelected = selectedSourceRowIndex === originalIndex
            return (
              <div
                key={file.fileId || `source-${originalIndex}`}
                className={`pane-bvh-row ${isSelected ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="pane-bvh-select"
                  onClick={() => onSourceRowSelect(originalIndex)}
                >
                  <span className="pane-bvh-row-main">
                    <span className="pane-bvh-row-name">{getFileDisplayName(file)}</span>
                    <span className="pane-bvh-row-meta">{roleLabels[file.role]}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="remove-btn pane-bvh-remove"
                  title="Remove"
                  aria-label="Remove"
                  onClick={() => onFileRemove(originalIndex)}
                >
                  ×
                </button>
              </div>
            )
          })}
        </PaneBvhList>
        <MotionPane
          title="Source"
          bvhData={sourceFile?.parsedData ?? null}
          fileName={sourceLabel}
          frameIndex={frameIndex}
          color="#78c28f"
          selected={selectedSkeleton === 'source' || selectedSkeleton === effectiveSourceIndex}
          emptyMessage="Import Source BVH"
          skeletonType="source"
          onSelect={handleSourceSelect}
        />
      </div>
      <div className="motion-pane-stack">
        <PaneBvhList title="Result BVH" emptyMessage="No transfer result yet">
          {resultEntries.map(entry => {
            if (entry.kind === 'current-result') {
              const isSelected = resultPreviewFileIndex === null
              return (
                <div
                  key={`current-result-${entry.fileId ?? entry.name}`}
                  className={`pane-bvh-row ${isSelected ? 'selected' : ''}`}
                >
                  <button
                    type="button"
                    className="pane-bvh-select"
                    onClick={onCurrentResultSelect}
                  >
                    <span className="pane-bvh-row-main">
                      <span className="pane-bvh-row-name">{entry.name}</span>
                      <span className="pane-bvh-row-meta">Current result</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="remove-btn pane-bvh-remove"
                    title="Remove"
                    aria-label="Remove"
                    onClick={onCurrentResultRemove}
                  >
                    ×
                  </button>
                </div>
              )
            }

            const isSelected = resultPreviewFileIndex === entry.originalIndex
            return (
              <div
                key={entry.file.fileId || `result-${entry.originalIndex}`}
                className={`pane-bvh-row ${isSelected ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="pane-bvh-select"
                  onClick={() => onArchivedResultSelect(entry.originalIndex)}
                >
                  <span className="pane-bvh-row-main">
                    <span className="pane-bvh-row-name">{getFileDisplayName(entry.file)}</span>
                    <span className="pane-bvh-row-meta">Archived result</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="remove-btn pane-bvh-remove"
                  title="Remove"
                  aria-label="Remove"
                  onClick={() => onFileRemove(entry.originalIndex)}
                >
                  ×
                </button>
              </div>
            )
          })}
        </PaneBvhList>
        <MotionPane
          title="Result"
          bvhData={activeResultData ?? null}
          fileId={activeResultFileId}
          fileName={resultLabel}
          frameIndex={frameIndex}
          color="#d5bf62"
          selected={selectedSkeleton === 'result'}
          emptyMessage="Run style transfer to show Result"
          loadingMessage="Loading Result..."
          skeletonType="result"
          onSelect={handleResultSelect}
        />
      </div>
    </div>
  )
}
