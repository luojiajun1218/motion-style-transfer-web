import { useCallback, useEffect, useRef, useState } from 'react'
import SourceResultCanvas from '../components/SourceResultCanvas'
import LeftSidebar from '../components/LeftSidebar'
import RightSidebar from '../components/RightSidebar'
import PlaybackBar from '../components/PlaybackBar'
import TransferProgress, { TransferStep } from '../components/TransferProgress'
import { BVHFileState, BVHFileWithRole, LocalFileResult } from '../types'
import { getApiAuthHeaders, getBVHUrl } from '../services/api'
import { buildBVHDownloadTarget, downloadBVHTarget } from '../utils/downloadBVH'
import { buildTransferResultLabel } from '../utils/resultLabel'
import { parseBVHText } from '../utils/parseBVH'
import {
  getFileIndexForSkeletonSelection,
  getSelectionAfterFileRemoval,
  getSkeletonSelectionForFile,
  type SkeletonSelection,
} from '../utils/selectionState'

const defaultFileState: BVHFileState = {
  file: null,
  parsedData: null,
  fileId: null,
  isUploaded: false
}

interface HomeProps {
  userEmail: string
  onLogout: () => void
}

export default function Home({ userEmail, onLogout }: HomeProps) {
  const [bvhFiles, setBvhFiles] = useState<BVHFileWithRole[]>([])
  const [result, setResult] = useState<BVHFileState>(defaultFileState)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferStep, setTransferStep] = useState<TransferStep>('idle')
  const [transferError] = useState<string | undefined>()
  const [selectedSkeleton, setSelectedSkeleton] = useState<SkeletonSelection>(null)
  const [resultName, setResultName] = useState<string | null>(null)

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fps = 30

  const sourceFile = bvhFiles.find(file => file.role === 'source')
  const resultFileName = result.file?.name ?? (
    result.fileId ? buildTransferResultLabel(resultName, sourceFile?.file?.name, undefined) : null
  )

  const maxFrames = Math.max(
    sourceFile?.parsedData?.frameCount || 0,
    result.parsedData?.frameCount || 0,
    100
  )

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  const handlePlay = useCallback(() => {
    if (isPlaying) return
    setIsPlaying(true)

    playIntervalRef.current = setInterval(() => {
      setFrameIndex(prev => {
        if (prev >= maxFrames - 1) {
          setIsPlaying(false)
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current)
            playIntervalRef.current = null
          }
          return prev
        }
        return prev + 1
      })
    }, 1000 / fps)
  }, [fps, isPlaying, maxFrames])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
      event.preventDefault()
      isPlaying ? handlePause() : handlePlay()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePause, handlePlay, isPlaying])

  const handleMotionImport = (data: LocalFileResult) => {
    const newFile: BVHFileWithRole = {
      file: data.file,
      parsedData: data.parsedData,
      fileId: null,
      isUploaded: false,
      role: 'source'
    }

    setBvhFiles(prev => {
      const next = [
        ...prev.map(file =>
          file.role === 'source' ? { ...file, role: 'unassigned' as const } : file
        ),
        newFile
      ]
      const newIndex = next.length - 1
      setSelectedFileIndex(newIndex)
      setSelectedSkeleton('source')
      return next
    })
    setFrameIndex(0)
    setIsPlaying(false)
  }

  const handleFileSelect = (index: number) => {
    if (index < 0 || index >= bvhFiles.length) {
      setSelectedFileIndex(null)
      setSelectedSkeleton(null)
      return
    }
    setSelectedFileIndex(index)
    setSelectedSkeleton(getSkeletonSelectionForFile(bvhFiles, index))
  }

  const handleFileRemove = (index: number) => {
    setBvhFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index))
    const nextSelection = getSelectionAfterFileRemoval(
      bvhFiles,
      index,
      selectedFileIndex,
      selectedSkeleton
    )
    setSelectedFileIndex(nextSelection.fileIndex)
    setSelectedSkeleton(nextSelection.skeleton)
  }

  const archiveResultToFiles = async (fileId: string, name: string | null) => {
    try {
      const url = getBVHUrl(fileId)
      const response = await fetch(url, { headers: getApiAuthHeaders() })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      const parsedData = parseBVHText(text)
      const fileName = name ? `${name}.bvh` : `${fileId}.bvh`
      const file = new File([text], fileName, { type: 'application/octet-stream' })
      setBvhFiles(prev => [...prev, {
        file,
        parsedData,
        fileId,
        isUploaded: true,
        role: 'unassigned' as const,
        label: name || undefined
      }])
    } catch (error) {
      console.error('Failed to archive previous result:', error)
    }
  }

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setFrameIndex(0)
  }, [])

  const handleFrameChange = useCallback((frame: number) => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setFrameIndex(frame)
  }, [])

  const handleSkeletonSelect = (skeleton: SkeletonSelection) => {
    setSelectedSkeleton(skeleton)
    setSelectedFileIndex(getFileIndexForSkeletonSelection(bvhFiles, skeleton))
  }

  const getSelectedDownloadTarget = useCallback(() => {
    if (selectedSkeleton === 'result') {
      return buildBVHDownloadTarget(
        { file: result.file, fileId: result.fileId, name: resultFileName },
        getBVHUrl,
        URL.createObjectURL,
        getApiAuthHeaders
      )
    }

    if (selectedFileIndex === null) return null
    const selectedFile = bvhFiles[selectedFileIndex]
    if (!selectedFile) return null

    return buildBVHDownloadTarget(
      { file: selectedFile.file, fileId: selectedFile.fileId, name: selectedFile.file?.name },
      getBVHUrl,
      URL.createObjectURL,
      getApiAuthHeaders
    )
  }, [bvhFiles, result.file, result.fileId, resultFileName, selectedFileIndex, selectedSkeleton])

  const handleDownloadSelected = useCallback(() => {
    const target = getSelectedDownloadTarget()
    if (!target) return
    void downloadBVHTarget(target)
  }, [getSelectedDownloadTarget])

  const hasSelectedDownload = selectedSkeleton === 'result'
    ? Boolean(result.file || result.fileId)
    : selectedFileIndex !== null && Boolean(bvhFiles[selectedFileIndex]?.file || bvhFiles[selectedFileIndex]?.fileId)

  return (
    <div className="home-container">
      <div className="home-header">
        <span className="home-title">动作风格迁移</span>
        <div className="home-account">
          <span className="home-style-tag">{userEmail}</span>
          <button type="button" className="home-logout-btn" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </div>

      <div className="home-main">
        <LeftSidebar
          onMotionImport={handleMotionImport}
          transferLoading={transferLoading}
          bvhFiles={bvhFiles}
          onTransferComplete={async (response) => {
            if (result.fileId) {
              await archiveResultToFiles(result.fileId, resultName)
            }
            setResultName(response.result_name)
            setResult({ file: null, parsedData: null, fileId: response.result_id, isUploaded: true })
            setTransferStep('completed')
            setTimeout(() => setTransferStep('idle'), 1500)
          }}
          setTransferLoading={setTransferLoading}
          setTransferStep={setTransferStep}
          setBvhFiles={setBvhFiles}
        />

        <div className="canvas-area">
          <SourceResultCanvas
            allFiles={bvhFiles}
            resultData={result.parsedData}
            resultFileId={result.fileId}
            resultFileName={resultFileName}
            frameIndex={frameIndex}
            selectedSkeleton={selectedSkeleton}
            onFileSelect={handleFileSelect}
            onSkeletonSelect={handleSkeletonSelect}
          />
        </div>

        <RightSidebar
          bvhFiles={bvhFiles}
          selectedFileIndex={selectedFileIndex}
          resultFileName={resultFileName}
          selectedSkeleton={selectedSkeleton}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          onSkeletonSelect={handleSkeletonSelect}
          onDownloadSelected={handleDownloadSelected}
          downloadDisabled={!hasSelectedDownload}
        />
      </div>

      <PlaybackBar
        frameIndex={frameIndex}
        maxFrames={maxFrames}
        isPlaying={isPlaying}
        onFrameChange={handleFrameChange}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        fps={fps}
      />

      <TransferProgress
        isVisible={transferStep !== 'idle'}
        step={transferStep}
        errorMessage={transferError}
      />
    </div>
  )
}
