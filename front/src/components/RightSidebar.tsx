import './RightSidebar.css'

interface RightSidebarProps {
  sourceFileName: string | null
  styleFileName: string | null
  resultFileName: string | null
  selectedSkeleton: 'source' | 'style' | 'result' | null
  onSelect: (skeleton: 'source' | 'style' | 'result' | null) => void
}

const skeletonConfig = [
  { type: 'source' as const, label: 'Source', color: '#00ff88' },
  { type: 'style' as const, label: 'Style', color: '#4a90e2' },
  { type: 'result' as const, label: 'Result', color: '#ff9a00' },
]

export default function RightSidebar({
  sourceFileName,
  styleFileName,
  resultFileName,
  selectedSkeleton,
  onSelect,
}: RightSidebarProps) {
  const fileNames = {
    source: sourceFileName,
    style: styleFileName,
    result: resultFileName,
  }

  const handleClick = (type: 'source' | 'style' | 'result') => {
    if (!fileNames[type]) return
    if (selectedSkeleton === type) {
      onSelect(null)
    } else {
      onSelect(type)
    }
  }

  // 只显示有文件的条目
  const visibleItems = skeletonConfig.filter(({ type }) => fileNames[type])

  if (visibleItems.length === 0) {
    return (
      <div className="right-sidebar">
        <div className="right-sidebar-header">SCENE COLLECTION</div>
        <div className="right-sidebar-content">
          <div className="skeleton-item disabled">
            <span className="skeleton-name">(no files loaded)</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">SCENE COLLECTION</div>
      <div className="right-sidebar-content">
        {visibleItems.map(({ type, label, color }) => {
          const fileName = fileNames[type]
          const isSelected = selectedSkeleton === type

          return (
            <div
              key={type}
              className={`skeleton-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleClick(type)}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div className="skeleton-dot" style={{ backgroundColor: color }} />
                <span className="skeleton-name">{fileName}</span>
              </div>
              <span className="skeleton-tag" style={{ color: isSelected ? '#1a1a1a' : color }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}