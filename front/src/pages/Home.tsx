import { useState, useRef, useEffect } from 'react'
import UnifiedCanvas from '../components/UnifiedCanvas'
import LeftSidebar from '../components/LeftSidebar'
import RightSidebar from '../components/RightSidebar'
import PlaybackBar from '../components/PlaybackBar'
import { uploadBVH, transferStyle, BVHFileState, LocalFileResult, TransferResponse } from '../services/api'

const defaultFileState: BVHFileState = {
  file: null,
  parsedData: null,
  fileId: null,
  isUploaded: false
}

export default function Home() {
  const [source, setSource] = useState<BVHFileState>(defaultFileState)
  const [style, setStyle] = useState<BVHFileState>(defaultFileState)
  const [result, setResult] = useState<BVHFileState>(defaultFileState)

  // 计算 result 文件名
  const resultFileName = result.file?.name ?? (result.fileId ? 'Output' : null)

  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [selectedSkeleton, setSelectedSkeleton] = useState<'source' | 'style' | 'result' | null>(null)

  const playIntervalRef = useRef<number | null>(null)
  const fps = 30

  // Calculate max frames from loaded data
  const maxFrames = Math.max(
    source.parsedData?.frameCount || 0,
    style.parsedData?.frameCount || 0,
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

  const handleSourceSelect = (data: LocalFileResult) => {
    setSource({ file: data.file, parsedData: data.parsedData, fileId: null, isUploaded: false })
    setFrameIndex(0)
    setIsPlaying(false)
  }

  const handleStyleSelect = (data: LocalFileResult) => {
    setStyle({ file: data.file, parsedData: data.parsedData, fileId: null, isUploaded: false })
    setFrameIndex(0)
    setIsPlaying(false)
  }

  const handleTransfer = async (): Promise<TransferResponse | null> => {
    if (!source.file || !style.file) return null

    setTransferLoading(true)
    setIsPlaying(false)

    try {
      let sourceId = source.fileId
      let styleId = style.fileId

      if (!source.isUploaded) {
        const uploadResult = await uploadBVH(source.file)
        sourceId = uploadResult.id
        setSource(prev => ({ ...prev, fileId: sourceId, isUploaded: true }))
      }

      if (!style.isUploaded) {
        const uploadResult = await uploadBVH(style.file)
        styleId = uploadResult.id
        setStyle(prev => ({ ...prev, fileId: styleId, isUploaded: true }))
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

  const handleSkeletonSelect = (skeleton: 'source' | 'style' | 'result' | null) => {
    setSelectedSkeleton(skeleton)
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
          sourceFileName={source.file?.name ?? null}
          styleFileName={style.file?.name ?? null}
          onSourceSelect={(data) => handleSourceSelect(data as LocalFileResult)}
          onStyleSelect={(data) => handleStyleSelect(data as LocalFileResult)}
          onTransfer={async () => { await handleTransfer() }}
          transferDisabled={!source.file || !style.file}
          transferLoading={transferLoading}
        />

        {/* Canvas Area */}
        <div className="canvas-area">
          <UnifiedCanvas
            sourceData={source.parsedData}
            styleData={style.parsedData}
            resultData={result.parsedData}
            resultFileId={result.fileId}
            frameIndex={frameIndex}
            selectedSkeleton={selectedSkeleton}
          />
        </div>

        {/* Right Sidebar */}
        <RightSidebar
          sourceFileName={source.file?.name ?? null}
          styleFileName={style.file?.name ?? null}
          resultFileName={resultFileName}
          selectedSkeleton={selectedSkeleton}
          onSelect={handleSkeletonSelect}
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
