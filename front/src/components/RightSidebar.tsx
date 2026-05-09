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
  onDownloadSelected: () => void
  downloadDisabled: boolean
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
  onSkeletonSelect,
  onDownloadSelected,
  downloadDisabled
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
        <div className="right-sidebar-header">
          <span>BVH Files</span>
          <button type="button" className="download-selected-btn" disabled>
            Download
          </button>
        </div>
        <div className="right-sidebar-content">
          <div className="file-item disabled">
            <span className="file-name">No files</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">
        <span>BVH Files</span>
        <button
          type="button"
          className="download-selected-btn"
          onClick={onDownloadSelected}
          disabled={downloadDisabled}
        >
          Download
        </button>
      </div>
      <div className="right-sidebar-content">
        {bvhFiles.map((bvhFile, index) => {
          const fileName = bvhFile.file?.name ?? 'Unknown file'
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
              <div className="file-left">
                <div className="file-dot" style={{ backgroundColor: roleColor }} />
                <span className="file-name">{fileName}</span>
              </div>
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
                Output
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
