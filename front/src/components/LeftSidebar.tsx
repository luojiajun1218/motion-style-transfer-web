import type { Dispatch, SetStateAction } from 'react'
import FileUploader from './FileUploader'
import StyleLibrary from './StyleLibrary'
import './LeftSidebar.css'
import { BVHFileWithRole, LocalFileResult, TransferResponse } from '../types'
import { TransferStep } from './TransferProgress'

interface LeftSidebarProps {
  onMotionImport: (data: LocalFileResult) => void
  transferLoading: boolean
  bvhFiles: BVHFileWithRole[]
  onTransferComplete: (response: TransferResponse) => void
  setTransferLoading: (loading: boolean) => void
  setTransferStep: (step: TransferStep) => void
  setBvhFiles: Dispatch<SetStateAction<BVHFileWithRole[]>>
  onDownloadSelected: () => void
  downloadDisabled: boolean
}

export default function LeftSidebar({
  onMotionImport,
  transferLoading,
  bvhFiles,
  onTransferComplete,
  setTransferLoading,
  setTransferStep,
  setBvhFiles,
  onDownloadSelected,
  downloadDisabled
}: LeftSidebarProps) {
  return (
    <div className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-content sidebar-imports">
          <FileUploader
            onSelect={onMotionImport}
            label="导入动作 BVH"
          />
        </div>
      </div>

      <div className="sidebar-section">
        <StyleLibrary
          bvhFiles={bvhFiles}
          onTransferComplete={onTransferComplete}
          transferLoading={transferLoading}
          setTransferLoading={setTransferLoading}
          setTransferStep={setTransferStep}
          setBvhFiles={setBvhFiles}
        />
      </div>

      <div className="left-download-area">
        <button
          type="button"
          className="blender-btn left-download-btn"
          onClick={onDownloadSelected}
          disabled={downloadDisabled}
        >
          下载当前选择 BVH
        </button>
      </div>
    </div>
  )
}
