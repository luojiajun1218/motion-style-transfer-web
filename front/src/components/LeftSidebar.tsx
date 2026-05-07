import type { Dispatch, SetStateAction } from 'react'
import FileUploader from './FileUploader'
import TransferButton from './TransferButton'
import StyleLibrary from './StyleLibrary'
import './LeftSidebar.css'
import { BVHFileWithRole, LocalFileResult } from '../types'
import { TransferStep } from './TransferProgress'

interface LeftSidebarProps {
  selectedFileIndex: number | null
  onFileImport: (data: LocalFileResult) => void
  onRoleAssign: (role: 'source' | 'style') => void
  onTransfer: () => Promise<void>
  transferDisabled: boolean
  transferLoading: boolean
  // 新增 props
  bvhFiles: BVHFileWithRole[]
  onTransferComplete: (resultId: string) => void
  setTransferLoading: (loading: boolean) => void
  setTransferStep: (step: TransferStep) => void
  setBvhFiles: Dispatch<SetStateAction<BVHFileWithRole[]>>
}

export default function LeftSidebar({
  selectedFileIndex,
  onFileImport,
  onRoleAssign,
  onTransfer,
  transferDisabled,
  transferLoading,
  bvhFiles,
  onTransferComplete,
  setTransferLoading,
  setTransferStep,
  setBvhFiles
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
              onSelect={onFileImport as (result: LocalFileResult) => void}
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

      {/* 风格库 */}
      <div className="sidebar-section">
        <div className="sidebar-title">STYLE LIBRARY</div>
        <StyleLibrary
          bvhFiles={bvhFiles}
          selectedFileIndex={selectedFileIndex}
          onTransferComplete={onTransferComplete}
          transferLoading={transferLoading}
          setTransferLoading={setTransferLoading}
          setTransferStep={setTransferStep}
          setBvhFiles={setBvhFiles}
        />
      </div>
    </div>
  )
}