import FileUploader from './FileUploader'
import TransferButton from './TransferButton'
import './LeftSidebar.css'

interface LeftSidebarProps {
  selectedFileIndex: number | null
  hasFiles: boolean
  onFileImport: (data: { file: File }) => void
  onRoleAssign: (role: 'source' | 'style') => void
  onTransfer: () => Promise<void>
  transferDisabled: boolean
  transferLoading: boolean
}

export default function LeftSidebar({
  selectedFileIndex,
  hasFiles,
  onFileImport,
  onRoleAssign,
  onTransfer,
  transferDisabled,
  transferLoading
}: LeftSidebarProps) {

  const handleRoleClick = (role: 'source' | 'style') => {
    onRoleAssign(role)
  }

  return (
    <div className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-title">FILE OPERATIONS</div>
        <div className="sidebar-content">
          <div className="file-row">
            <span className="file-label">Import BVH:</span>
            <FileUploader
              onSelect={onFileImport}
              label="Import BVH File"
            />
          </div>
        </div>
      </div>

      {/* 全局角色按钮 - 只有选中文件后才显示 */}
      {selectedFileIndex !== null && (
        <div className="sidebar-section">
          <div className="sidebar-title">SET ROLE</div>
          <div className="sidebar-content">
            <div className="global-role-buttons">
              <button
                className="blender-btn"
                onClick={() => handleRoleClick('source')}
                style={{
                  borderColor: '#555',
                  width: '100%'
                }}
              >
                Set as Source
              </button>
              <button
                className="blender-btn"
                onClick={() => handleRoleClick('style')}
                style={{
                  borderColor: '#555',
                  width: '100%'
                }}
              >
                Set as Style
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-title">STYLE TRANSFER</div>
        <div className="sidebar-content">
          <TransferButton
            onClick={onTransfer}
            disabled={transferDisabled}
            loading={transferLoading}
          />
          {transferLoading && (
            <span className="transfer-status">Processing...</span>
          )}
        </div>
      </div>
    </div>
  )
}