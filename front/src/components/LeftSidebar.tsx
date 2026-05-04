import FileUploader from './FileUploader'
import TransferButton from './TransferButton'
import './LeftSidebar.css'

interface LeftSidebarProps {
  sourceFileName: string | null
  styleFileName: string | null
  onSourceSelect: (data: { file: File }) => void
  onStyleSelect: (data: { file: File }) => void
  onTransfer: () => Promise<void>
  transferDisabled: boolean
  transferLoading: boolean
}

export default function LeftSidebar({
  sourceFileName,
  styleFileName,
  onSourceSelect,
  onStyleSelect,
  onTransfer,
  transferDisabled,
  transferLoading
}: LeftSidebarProps) {
  return (
    <div className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-title">FILE OPERATIONS</div>
        <div className="sidebar-content">
          <div className="file-row">
            <span className="file-label">Source File:</span>
            <FileUploader
              onSelect={onSourceSelect}
              label="Select Source"
              variant="source"
            />
            {sourceFileName && (
              <span className="file-name file-name-source">{sourceFileName}</span>
            )}
            {!sourceFileName && (
              <span className="file-hint">(no file selected)</span>
            )}
          </div>

          <div className="file-row">
            <span className="file-label">Style File:</span>
            <FileUploader
              onSelect={onStyleSelect}
              label="Select Style"
              variant="style"
            />
            {styleFileName && (
              <span className="file-name file-name-style">{styleFileName}</span>
            )}
            {!styleFileName && (
              <span className="file-hint">(no file selected)</span>
            )}
          </div>
        </div>
      </div>

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