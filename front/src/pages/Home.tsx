import { useState, useRef, useEffect, useCallback } from 'react'
import UnifiedCanvas from '../components/UnifiedCanvas'
import LeftSidebar from '../components/LeftSidebar'
import RightSidebar from '../components/RightSidebar'
import PlaybackBar from '../components/PlaybackBar'
import TransferProgress, { TransferStep } from '../components/TransferProgress'
import { uploadBVH, transferStyle, BVHFileState, LocalFileResult, TransferResponse, BVHFileWithRole } from '../types'
import { getApiAuthHeaders, getBVHUrl } from '../services/api'
import { buildBVHDownloadTarget, downloadBVHTarget } from '../utils/downloadBVH'
import { buildResultLabel } from '../utils/resultLabel'
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
  // 改为 BVH 文件列表，每个文件可分配角色
  const [bvhFiles, setBvhFiles] = useState<BVHFileWithRole[]>([])
  const [result, setResult] = useState<BVHFileState>(defaultFileState)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferStep, setTransferStep] = useState<TransferStep>('idle')
  const [transferError, setTransferError] = useState<string | undefined>()
  const [selectedSkeleton, setSelectedSkeleton] = useState<SkeletonSelection>(null)

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fps = 30

  // 从列表中获取 source 和 style 文件
  const sourceFile = bvhFiles.find(f => f.role === 'source')
  const styleFile = bvhFiles.find(f => f.role === 'style')

  // 计算 result 文件名
  const resultFileName = result.file?.name ?? (result.fileId ? buildResultLabel(sourceFile?.file?.name, styleFile?.file?.name) : null)

  // Calculate max frames from loaded data
  const maxFrames = Math.max(
    sourceFile?.parsedData?.frameCount || 0,
    styleFile?.parsedData?.frameCount || 0,
    result.parsedData?.frameCount || 0,
    100 // default
  )

  // Cleanup play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  // 播放/暂停函数（用 useCallback 包裹避免闭包问题）
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
  }, [isPlaying, maxFrames, fps])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
  }, [])

  // Space key to toggle play/pause (exclude input/textarea focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
      e.preventDefault()
      isPlaying ? handlePause() : handlePlay()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, handlePlay, handlePause])

  // 导入 BVH 文件（统一入口）
  const handleFileImport = (data: LocalFileResult) => {
    const newFile: BVHFileWithRole = {
      file: data.file,
      parsedData: data.parsedData,
      fileId: null,
      isUploaded: false,
      role: 'unassigned'
    }
    setBvhFiles(prev => {
      const next = [...prev, newFile]
      const newIndex = next.length - 1
      setSelectedFileIndex(newIndex)  // 自动选中新导入的文件
      setSelectedSkeleton(newIndex)
      return next
    })
    setFrameIndex(0)
    setIsPlaying(false)
  }

  // 选中文件
  const handleFileSelect = (index: number) => {
    if (index < 0 || index >= bvhFiles.length) {
      setSelectedFileIndex(null)
      setSelectedSkeleton(null)
      return
    }
    setSelectedFileIndex(index)
    setSelectedSkeleton(getSkeletonSelectionForFile(bvhFiles, index))
  }

  // 分配角色（使用当前选中的文件）
  const handleRoleAssign = (role: 'source' | 'style') => {
    if (selectedFileIndex === null) return
    setBvhFiles(prev => {
      // 如果要把某个文件设为 source/style，先清除其他文件的该角色
      return prev.map((f, i) => {
        if (f.role === role) {
          return { ...f, role: 'unassigned' as const }
        }
        if (i === selectedFileIndex) {
          return { ...f, role }
        }
        return f
      })
    })
    setSelectedSkeleton(role)
  }

  // 删除文件
  const handleFileRemove = (index: number) => {
    setBvhFiles(prev => prev.filter((_, i) => i !== index))
    const nextSelection = getSelectionAfterFileRemoval(
      bvhFiles,
      index,
      selectedFileIndex,
      selectedSkeleton
    )
    setSelectedFileIndex(nextSelection.fileIndex)
    setSelectedSkeleton(nextSelection.skeleton)
  }

  const handleTransfer = async (): Promise<TransferResponse | null> => {
    if (!sourceFile?.file || !styleFile?.file) return null

    setTransferLoading(true)
    setTransferError(undefined)
    setTransferStep('idle')
    setIsPlaying(false)

    try {
      let sourceId = sourceFile.fileId
      let styleId = styleFile.fileId

      // Step 1: Upload source if needed
      if (!sourceFile.isUploaded) {
        setTransferStep('upload-source')
        const uploadResult = await uploadBVH(sourceFile.file)
        sourceId = uploadResult.id
        setBvhFiles(prev => prev.map(f =>
          f.file === sourceFile.file ? { ...f, fileId: sourceId, isUploaded: true } : f
        ))
      }

      // Step 2: Upload style if needed
      if (!styleFile.isUploaded) {
        setTransferStep('upload-style')
        const uploadResult = await uploadBVH(styleFile.file)
        styleId = uploadResult.id
        setBvhFiles(prev => prev.map(f =>
          f.file === styleFile.file ? { ...f, fileId: styleId, isUploaded: true } : f
        ))
      }

      if (!sourceId || !styleId) {
        throw new Error('Upload failed: missing file ID')
      }

      // Step 3: Execute style transfer
      setTransferStep('transferring')
      const response = await transferStyle(sourceId, styleId)

      // Step 4: Loading result (brief pause to show completion)
      setTransferStep('loading-result')
      setResult({ file: null, parsedData: null, fileId: response.result_id, isUploaded: true })

      // Complete
      setTransferStep('completed')
      setTransferLoading(false)

      // Auto-hide after 1.5 seconds
      setTimeout(() => {
        setTransferStep('idle')
      }, 1500)

      return response
    } catch (error) {
      console.error('Style transfer failed:', error)
      setTransferStep('error')
      setTransferError(error instanceof Error ? error.message : 'Unknown error')
      setTransferLoading(false)
      throw error
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
      {/* Header */}
      <div className="home-header">
        <span className="home-title">Motion Style Transfer</span>
        <div className="home-account">
          <span className="home-style-tag">{userEmail}</span>
          <button type="button" className="home-logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="home-main">
        {/* Left Sidebar */}
        <LeftSidebar
          selectedFileIndex={selectedFileIndex}
          onFileImport={handleFileImport}
          onRoleAssign={handleRoleAssign}
          onTransfer={async () => { await handleTransfer() }}
          transferDisabled={!sourceFile?.file || !styleFile?.file}
          transferLoading={transferLoading}
          bvhFiles={bvhFiles}
          onTransferComplete={(resultId) => {
            setResult({ file: null, parsedData: null, fileId: resultId, isUploaded: true })
            setTransferStep('completed')
            setTimeout(() => setTransferStep('idle'), 1500)
          }}
          setTransferLoading={setTransferLoading}
          setTransferStep={setTransferStep}
          setBvhFiles={setBvhFiles}
        />

        {/* Canvas Area */}
        <div className="canvas-area">
          <UnifiedCanvas
            allFiles={bvhFiles}
            resultData={result.parsedData}
            resultFileId={result.fileId}
            frameIndex={frameIndex}
            selectedSkeleton={selectedSkeleton}
            onFileSelect={handleFileSelect}
            onSkeletonSelect={handleSkeletonSelect}
          />
        </div>

        {/* Right Sidebar */}
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

      {/* Playback Bar */}
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

      {/* Transfer Progress Modal */}
      <TransferProgress
        isVisible={transferStep !== 'idle'}
        step={transferStep}
        errorMessage={transferError}
      />
    </div>
  )
}
