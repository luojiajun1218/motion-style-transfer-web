import { useState, useRef, useEffect } from 'react'
import UnifiedCanvas from '../components/UnifiedCanvas'
import LeftSidebar from '../components/LeftSidebar'
import RightSidebar from '../components/RightSidebar'
import PlaybackBar from '../components/PlaybackBar'
import { uploadBVH, transferStyle, BVHFileState, LocalFileResult, TransferResponse } from '../services/api'

// 扩展 BVHFileState，增加 role 属性
interface BVHFileWithRole extends BVHFileState {
  role: 'unassigned' | 'source' | 'style'
}

const defaultFileState: BVHFileState = {
  file: null,
  parsedData: null,
  fileId: null,
  isUploaded: false
}

export default function Home() {
  // 改为 BVH 文件列表，每个文件可分配角色
  const [bvhFiles, setBvhFiles] = useState<BVHFileWithRole[]>([])
  const [result, setResult] = useState<BVHFileState>(defaultFileState)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)  // 新增：当前选中的文件

  // 计算 result 文件名
  const resultFileName = result.file?.name ?? (result.fileId ? 'Output' : null)

  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [selectedSkeleton, setSelectedSkeleton] = useState<'source' | 'style' | 'result' | number | null>(null)
  // number表示unassigned文件的索引

  const playIntervalRef = useRef<number | null>(null)
  const fps = 30

  // 从列表中获取 source 和 style 文件
  const sourceFile = bvhFiles.find(f => f.role === 'source')
  const styleFile = bvhFiles.find(f => f.role === 'style')

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
  }, [isPlaying])

  // 导入 BVH 文件（统一入口）
  const handleFileImport = (data: LocalFileResult) => {
    const newFile: BVHFileWithRole = {
      file: data.file,
      parsedData: data.parsedData,
      fileId: null,
      isUploaded: false,
      role: 'unassigned'
    }
    setBvhFiles(prev => [...prev, newFile])
    setSelectedFileIndex(bvhFiles.length)  // 自动选中新导入的文件
    setFrameIndex(0)
    setIsPlaying(false)
  }

  // 选中文件
  const handleFileSelect = (index: number) => {
    setSelectedFileIndex(index)
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
  }

  // 删除文件
  const handleFileRemove = (index: number) => {
    setBvhFiles(prev => prev.filter((_, i) => i !== index))
    // 清除选中状态或调整选中索引
    if (selectedFileIndex === index) {
      setSelectedFileIndex(null)
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1)
    }
  }

  const handleTransfer = async (): Promise<TransferResponse | null> => {
    if (!sourceFile?.file || !styleFile?.file) return null

    setTransferLoading(true)
    setIsPlaying(false)

    try {
      let sourceId = sourceFile.fileId
      let styleId = styleFile.fileId

      if (!sourceFile.isUploaded) {
        const uploadResult = await uploadBVH(sourceFile.file)
        sourceId = uploadResult.id
        setBvhFiles(prev => prev.map(f =>
          f.file === sourceFile.file ? { ...f, fileId: sourceId, isUploaded: true } : f
        ))
      }

      if (!styleFile.isUploaded) {
        const uploadResult = await uploadBVH(styleFile.file)
        styleId = uploadResult.id
        setBvhFiles(prev => prev.map(f =>
          f.file === styleFile.file ? { ...f, fileId: styleId, isUploaded: true } : f
        ))
      }

      if (!sourceId || !styleId) {
        setTransferLoading(false)
        throw new Error('Upload failed: missing file ID')
      }

      const response = await transferStyle(sourceId, styleId)
      setResult({ file: null, parsedData: null, fileId: response.result_id, isUploaded: true })
      setTransferLoading(false)
      return response
    } catch (error) {
      console.error('Transfer failed:', error)
      setTransferLoading(false)
      throw error
    }
  }

  const handlePlay = () => {
    if (isPlaying) return
    setIsPlaying(true)
    
    playIntervalRef.current = window.setInterval(() => {
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
  }

  const handlePause = () => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setFrameIndex(0)
  }

  const handleFrameChange = (frame: number) => {
    setIsPlaying(false)
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setFrameIndex(frame)
  }

  const handleSkeletonSelect = (skeleton: 'source' | 'style' | 'result' | number | null) => {
    setSelectedSkeleton(skeleton)
    // 如果是number（unassigned索引），同时更新selectedFileIndex
    if (typeof skeleton === 'number') {
      setSelectedFileIndex(skeleton)
    }
  }

  return (
    <div className="home-container">
      {/* Header */}
      <div className="home-header">
        <span className="home-title">Motion Style Transfer System</span>
        <span className="home-style-tag">Blender</span>
      </div>

      {/* Main layout */}
      <div className="home-main">
        {/* Left Sidebar */}
        <LeftSidebar
          selectedFileIndex={selectedFileIndex}
          onFileImport={(data) => handleFileImport(data as LocalFileResult)}
          onRoleAssign={handleRoleAssign}
          onTransfer={async () => { await handleTransfer() }}
          transferDisabled={!sourceFile?.file || !styleFile?.file}
          transferLoading={transferLoading}
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
    </div>
  )
}
