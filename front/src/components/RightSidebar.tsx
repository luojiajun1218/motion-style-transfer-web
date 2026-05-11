import './RightSidebar.css'
import { BVHFileWithRole } from '../types'
import { buildRightSidebarFileEntries } from '../utils/rightSidebarFiles'

interface RightSidebarProps {
  bvhFiles: BVHFileWithRole[]
  selectedFileIndex: number | null
  resultFileName: string | null
  selectedSkeleton: 'source' | 'style' | 'result' | number | null
  onFileSelect: (index: number) => void
  onFileRemove: (index: number) => void
  onSkeletonSelect: (skeleton: 'source' | 'style' | 'result' | number | null) => void
  onDownloadSelected: () => void
  downloadDisabled: boolean
}

const roleColors = {
  source: 'var(--source)',
  style: 'var(--style)',
  unassigned: 'var(--unassigned)'
}

const roleLabels = {
  source: '源动作',
  style: '风格',
  unassigned: ''
}

function getDisplayName(bvhFile: BVHFileWithRole): string {
  return bvhFile.label ?? bvhFile.file?.name ?? '未知文件'
}

function getOutputLabel(bvhFile: BVHFileWithRole): string | null {
  if (bvhFile.label) return '输出'
  const roleLabel = roleLabels[bvhFile.role]
  return roleLabel || null
}

export default function RightSidebar({
  bvhFiles,
  selectedFileIndex,
  resultFileName,
  selectedSkeleton,
  onFileSelect,
  onFileRemove,
  onSkeletonSelect,
  onDownloadSelected,
  downloadDisabled
}: RightSidebarProps) {
  const fileEntries = buildRightSidebarFileEntries(bvhFiles)

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

  if (fileEntries.length === 0 && !resultFileName) {
    return (
      <div className="right-sidebar">
        <div className="right-sidebar-header">
          <span>BVH 文件</span>
          <button type="button" className="download-selected-btn" disabled>
            下载
          </button>
        </div>
        <div className="right-sidebar-content">
          <div className="file-item disabled">
            <span className="file-name">暂无文件</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">
        <span>BVH 文件</span>
        <button
          type="button"
          className="download-selected-btn"
          onClick={onDownloadSelected}
          disabled={downloadDisabled}
        >
          下载
        </button>
      </div>
      <div className="right-sidebar-content">
        {fileEntries.map(({ file: bvhFile, originalIndex }) => {
          const fileName = getDisplayName(bvhFile)
          const isSelected = selectedFileIndex === originalIndex
          const outputLabel = getOutputLabel(bvhFile)
          const roleColor = bvhFile.label ? 'var(--result)' : roleColors[bvhFile.role]
          const key = bvhFile.fileId || `file-${originalIndex}`

          return (
            <div
              key={key}
              className={`file-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleFileClick(originalIndex)}
            >
              <div className="file-left">
                <div className="file-dot" style={{ backgroundColor: roleColor }} />
                <span className="file-name">{fileName}</span>
              </div>
              <div className="file-right">
                {outputLabel && (
                  <span className="file-role-tag" style={{ color: isSelected ? 'var(--accent-ink)' : roleColor }}>
                    {outputLabel}
                  </span>
                )}
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileRemove(originalIndex)
                  }}
                  title="移除"
                  aria-label="移除"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}

        {resultFileName && (
          <div
            className={`file-item result-item ${selectedSkeleton === 'result' ? 'selected' : ''}`}
            onClick={handleResultClick}
          >
            <div className="file-left">
              <div className="file-dot" style={{ backgroundColor: 'var(--result)' }} />
              <span className="file-name">{resultFileName}</span>
            </div>
            <div className="file-right">
              <span className="file-role-tag" style={{ color: selectedSkeleton === 'result' ? 'var(--accent-ink)' : 'var(--result)' }}>
                输出
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
