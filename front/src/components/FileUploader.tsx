import { useRef } from 'react'
import { LocalFileResult } from '../types'
import { debugLog } from '../utils/debug'
import { parseBVHText } from '../utils/parseBVH'

interface FileUploaderProps {
  onSelect: (result: LocalFileResult) => void
  label: string
}

export default function FileUploader({ onSelect, label }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsedData = parseBVHText(text)

      debugLog('FileUploader', 'BVH loaded', {
        name: file.name,
        bones: parsedData.skeleton.bones.length,
        frames: parsedData.frameCount,
        boundsSize: `(${parsedData.boundsSize.x.toFixed(2)}, ${parsedData.boundsSize.y.toFixed(2)}, ${parsedData.boundsSize.z.toFixed(2)})`,
        boundsCenter: `(${parsedData.boundsCenter.x.toFixed(2)}, ${parsedData.boundsCenter.y.toFixed(2)}, ${parsedData.boundsCenter.z.toFixed(2)})`
      })

      onSelect({
        file,
        parsedData
      })
    } catch (error) {
      debugLog('FileUploader', 'Parse failed', { error: String(error) })
      alert('BVH 文件无效。请选择有效的 BVH 文件后重试。')
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".bvh"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleClick}
        className="blender-btn"
      >
        {label}
      </button>
    </div>
  )
}
