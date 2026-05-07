import './RightSidebar.css'
import { BVHFileWithRole } from '../types'

interface RightSidebarProps {
  bvhFiles: BVHFileWithRole[]
  selectedFileIndex: number | null
  resultFileName: string | null
  selectedSkeleton: 'source' | 'style' | 'result' | number | null
  onFileSelect: (index: number) => void
  onFileRemove: (index: number) => void
  onSkeletonSelect: (skeleton: 'source' | 'style' | 'result' | number | null) => void
}

const roleColors = {
  source: 'var(--source)',
  style: 'var(--style)',
  unassigned: 'var(--unassigned)'
}

const roleLabels = {
  source: 'Source',
  style: 'Style',
  unassigned: ''
}

export default function RightSidebar({
  bvhFiles,
  selectedFileIndex,
  resultFileName,
  selectedSkeleton,
  onFileSelect,
  onFileRemove,
  onSkeletonSelect
}: RightSidebarProps) {

  const handleFileClick = (index: number) => {
    onFileSelect(index)
  }

  const handleResultClick = () => {
    if (selectedSkeleton === 'result') {
      onSkeletonSelect(null)
    } else {
      onSkeletonSelect('result')
    }
  }

  if (bvhFiles.length === 0 && !resultFileName) {
    return (
      <div className="right-sidebar">
        <div className="right-sidebar-header">BVH FILES</div>
        <div className="right-sidebar-content">
          <div className="file-item disabled">
            <span className="file-name">(no files loaded)</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">BVH FILES</div>
      <div className="right-sidebar-content">
        {/* BVH 文件列表 */}
        {bvhFiles.map((bvhFile, index) => {
          const fileName = bvhFile.file?.name ?? 'Unknown'
          const isSelected = selectedFileIndex === index
          const roleLabel = roleLabels[bvhFile.role]
          const roleColor = roleColors[bvhFile.role]
          const key = bvhFile.fileId || `file-${index}`

          return (
            <div
              key={key}
              className={`file-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleFileClick(index)}
            >
              {/* 左侧：颜色点 + 文件名 */}
              <div className="file-left">
                <div className="file-dot" style={{ backgroundColor: roleColor }} />
                <span className="file-name">{fileName}</span>
              </div>
              {/* 右侧：角色标签 + 删除按钮 */}
              <div className="file-right">
                {roleLabel && (
                  <span className="file-role-tag" style={{ color: isSelected ? 'var(--accent-ink)' : roleColor }}>
                    {roleLabel}
                  </span>
                )}
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileRemove(index)
                  }}
                  title="Remove"
                >
                  x
                </button>
              </div>
            </div>
          )
        })}

        {/* Result 文件 */}
        {resultFileName && (
          <div
            className={`file-item result-item ${selectedSkeleton === 'result' ? 'selected' : ''}`}
            onClick={handleResultClick}
          >
            {/* 左侧 */}
            <div className="file-left">
              <div className="file-dot" style={{ backgroundColor: 'var(--result)' }} />
              <span className="file-name">{resultFileName}</span>
            </div>
            {/* 右侧 */}
            <div className="file-right">
              <span className="file-role-tag" style={{ color: selectedSkeleton === 'result' ? 'var(--accent-ink)' : 'var(--result)' }}>
                Result
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
