import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { getPresetStyles, getPresetFileId, transferStyle, uploadBVH, PresetStylesResponse, BVHFileWithRole } from '../types'
import { useCustomStyles, CustomStyle } from '../hooks/useCustomStyles'
import { ensureFileUploaded } from '../utils/uploadFileIfNeeded'
import { TransferStep } from './TransferProgress'
import './StyleLibrary.css'

interface StyleLibraryProps {
  bvhFiles: BVHFileWithRole[]
  selectedFileIndex: number | null
  onTransferComplete: (resultId: string) => void
  transferLoading: boolean
  setTransferLoading: (loading: boolean) => void
  setTransferStep: (step: TransferStep) => void
  setBvhFiles: Dispatch<SetStateAction<BVHFileWithRole[]>>
}

const presetDisplayNames: Record<string, string> = {
  angry: 'Angry',
  depressed: 'Depressed',
  proud: 'Proud',
  sexy: 'Confident',
  childlike: 'Childlike',
  neutral: 'Neutral',
  old: 'Elderly',
  strutting: 'Strutting'
}

function getPresetDisplayName(style: { id: string; name: string }): string {
  return presetDisplayNames[style.id] ?? style.name
}

export default function StyleLibrary({
  bvhFiles,
  selectedFileIndex,
  onTransferComplete,
  transferLoading,
  setTransferLoading,
  setTransferStep,
  setBvhFiles
}: StyleLibraryProps) {
  const [presetStyles, setPresetStyles] = useState<PresetStylesResponse | null>(null)
  const { customStyles, addStyle, renameStyle, deleteStyle, canAddMore } = useCustomStyles()
  const [renameIndex, setRenameIndex] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addingStyle, setAddingStyle] = useState(false)

  useEffect(() => {
    getPresetStyles().then(setPresetStyles).catch(console.error)
  }, [])

  const selectedFile = selectedFileIndex !== null ? bvhFiles[selectedFileIndex] : null
  const sourceFile = bvhFiles.find(f => f.role === 'source')

  const handlePresetClick = async (styleId: string) => {
    if (!sourceFile?.file) {
      alert('Set a source motion file first.')
      return
    }

    setTransferLoading(true)
    setTransferStep('idle')

    try {
      setTransferStep('upload-source')
      const uploadedSource = await ensureFileUploaded(sourceFile, uploadBVH)
      const sourceId = uploadedSource.fileId
      if (uploadedSource !== sourceFile) {
        setBvhFiles(prev => prev.map(f => f === sourceFile ? uploadedSource : f))
      }

      if (!sourceId) {
        throw new Error('Could not get the source motion file ID')
      }

      setTransferStep('transferring')
      const presetResult = await getPresetFileId(styleId)
      const styleIdForTransfer = presetResult.file_id
      const result = await transferStyle(sourceId, styleIdForTransfer)

      setTransferStep('loading-result')
      onTransferComplete(result.result_id)
      setTransferStep('completed')
      setTimeout(() => setTransferStep('idle'), 1500)
    } catch (error: any) {
      setTransferStep('error')
      alert(`Style transfer failed: ${error.message || error}`)
    } finally {
      setTransferLoading(false)
    }
  }

  const handleCustomClick = async (style: CustomStyle) => {
    if (!sourceFile?.file) {
      alert('Set a source motion file first.')
      return
    }

    setTransferLoading(true)
    setTransferStep('idle')

    try {
      setTransferStep('upload-source')
      const uploadedSource = await ensureFileUploaded(sourceFile, uploadBVH)
      const sourceId = uploadedSource.fileId
      if (uploadedSource !== sourceFile) {
        setBvhFiles(prev => prev.map(f => f === sourceFile ? uploadedSource : f))
      }

      if (!sourceId) {
        throw new Error('Could not get the source motion file ID')
      }

      setTransferStep('transferring')
      const result = await transferStyle(sourceId, style.fileId)
      setTransferStep('loading-result')
      onTransferComplete(result.result_id)
      setTransferStep('completed')
      setTimeout(() => setTransferStep('idle'), 1500)
    } catch (error: any) {
      setTransferStep('error')
      alert(`Style transfer failed: ${error.message || error}`)
    } finally {
      setTransferLoading(false)
    }
  }

  const handleAddStyle = async () => {
    if (!selectedFile?.file) {
      return
    }

    if (!addName.trim()) {
      alert('Enter a style name.')
      return
    }

    setAddingStyle(true)

    try {
      let fileId = selectedFile.fileId
      if (!selectedFile.isUploaded) {
        const uploadResult = await uploadBVH(selectedFile.file)
        fileId = uploadResult.id
      }

      if (!fileId) {
        throw new Error('Upload failed: missing file ID')
      }

      if (addStyle(addName.trim(), fileId)) {
        setShowAddModal(false)
        setAddName('')
      } else {
        alert('The style library is full, or that name already exists.')
      }
    } catch (error: any) {
      const errorMsg = error.response?.status === 500
        ? 'Server error. Check whether the backend is running.'
        : error.response?.status === 404
        ? 'API endpoint not found.'
        : error.message || 'Unknown error'
      alert(`Failed to add style: ${errorMsg}`)
    } finally {
      setAddingStyle(false)
    }
  }

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      deleteStyle(deleteIndex)
      setDeleteIndex(null)
    }
  }

  const handleConfirmRename = () => {
    if (renameIndex !== null && renameValue.trim()) {
      renameStyle(renameIndex, renameValue.trim())
      setRenameIndex(null)
      setRenameValue('')
    }
  }

  return (
    <div className="style-library">
      <div className="preset-section">
        <div className="preset-title">Emotion Styles</div>
        <div className="preset-grid">
          {presetStyles?.emotion.map(style => (
            <button
              key={style.id}
              className="preset-btn"
              onClick={() => handlePresetClick(style.id)}
              disabled={transferLoading}
            >
              {getPresetDisplayName(style)}
            </button>
          ))}
        </div>
      </div>

      <div className="preset-section">
        <div className="preset-title">Body Styles</div>
        <div className="preset-grid">
          {presetStyles?.body.map(style => (
            <button
              key={style.id}
              className="preset-btn"
              onClick={() => handlePresetClick(style.id)}
              disabled={transferLoading}
            >
              {getPresetDisplayName(style)}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-section">
        <div className="custom-title">My Styles</div>

        {customStyles.length === 0 ? (
          <div className="custom-empty">Add a style below to start your library.</div>
        ) : (
          <div className="custom-list">
            {customStyles.map((style, index) => (
              <div key={index} className="custom-item">
                <button
                  className="custom-apply-btn"
                  onClick={() => handleCustomClick(style)}
                  disabled={transferLoading}
                >
                  {style.name}
                </button>
                <button
                  className="custom-action-btn rename"
                  onClick={() => {
                    setRenameIndex(index)
                    setRenameValue(style.name)
                  }}
                  title="Rename"
                >
                  Rename
                </button>
                <button
                  className="custom-action-btn delete"
                  onClick={() => setDeleteIndex(index)}
                  title="Delete"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          className="add-btn"
          onClick={() => setShowAddModal(true)}
          disabled={!selectedFile?.file || !canAddMore}
        >
          + Add to Style Library
        </button>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Add Style</div>
            <input
              className="modal-input"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Style name"
              maxLength={20}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleAddStyle} disabled={addingStyle}>
                {addingStyle ? 'Adding...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renameIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Rename Style</div>
            <input
              className="modal-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder="New name"
              maxLength={20}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setRenameIndex(null)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleConfirmRename}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Delete Style</div>
            <div className="modal-message">Delete "{customStyles[deleteIndex]?.name}" from your style library?</div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setDeleteIndex(null)}>Cancel</button>
              <button className="modal-btn confirm delete" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
