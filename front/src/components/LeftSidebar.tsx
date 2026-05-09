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
        <div className="sidebar-title">Files</div>
        <div className="sidebar-content">
          <div className="file-row">
            <span className="file-label">Import BVH:</span>
            <FileUploader
              onSelect={onFileImport as (result: LocalFileResult) => void}
              label="Import BVH"
            />
          </div>
        </div>
      </div>

      {selectedFileIndex !== null && (
        <div className="sidebar-section">
          <div className="sidebar-title">Role</div>
          <div className="sidebar-content">
            <div className="global-role-buttons">
              <button
                className="blender-btn"
                onClick={() => handleRoleClick('source')}
              >
                Set as Source
              </button>
              <button
                className="blender-btn"
                onClick={() => handleRoleClick('style')}
              >
                Set as Style
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-title">Transfer</div>
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

      <div className="sidebar-section">
        <div className="sidebar-title">Style Library</div>
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
