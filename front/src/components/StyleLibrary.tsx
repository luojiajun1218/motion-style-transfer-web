import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  getPresetFileId,
  getPresetStyles,
  transferStyle,
  uploadBVH,
  type BVHFileWithRole,
  type PresetStylesResponse,
  type TransferResponse,
} from '../types'
import { type CustomStyle, type CustomStyleStorage, useCustomStyles } from '../hooks/useCustomStyles'
import { parseBVHText } from '../utils/parseBVH'
import { ensureFileUploaded } from '../utils/uploadFileIfNeeded'
import { TransferStep } from './TransferProgress'
import './StyleLibrary.css'

interface StyleLibraryProps {
  bvhFiles: BVHFileWithRole[]
  onTransferComplete: (response: TransferResponse) => void
  transferLoading: boolean
  setTransferLoading: (loading: boolean) => void
  setTransferStep: (step: TransferStep) => void
  setBvhFiles: Dispatch<SetStateAction<BVHFileWithRole[]>>
}

const presetDisplayNames: Record<string, string> = {
  angry: '愤怒',
  depressed: '沮丧',
  proud: '自豪',
  sexy: '性感',
  childlike: '童趣',
  neutral: '中性',
  old: '年长',
  strutting: '阔步'
}

function getPresetDisplayName(style: { id: string; name: string }): string {
  return presetDisplayNames[style.id] ?? style.name
}

function getAddStyleError(storage: CustomStyleStorage, canAddPersistent: boolean): string {
  if (storage === 'persistent' && !canAddPersistent) {
    return '持久风格最多保存 4 个。'
  }

  return '风格名称已存在。'
}

export default function StyleLibrary({
  bvhFiles,
  onTransferComplete,
  transferLoading,
  setTransferLoading,
  setTransferStep,
  setBvhFiles
}: StyleLibraryProps) {
  const [presetStyles, setPresetStyles] = useState<PresetStylesResponse | null>(null)
  const {
    customStyles,
    addStyle,
    renameStyle,
    deleteStyle,
    canAddPersistent,
    persistentCount
  } = useCustomStyles()
  const [renameIndex, setRenameIndex] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [pendingStyleFile, setPendingStyleFile] = useState<File | null>(null)
  const [pendingStyleName, setPendingStyleName] = useState('')
  const [pendingStyleStorage, setPendingStyleStorage] = useState<CustomStyleStorage>('temporary')
  const [addingStyle, setAddingStyle] = useState(false)
  const styleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPresetStyles().then(setPresetStyles).catch(console.error)
  }, [])

  const sourceFile = bvhFiles.find(file => file.role === 'source')

  const runTransfer = async (styleFileId: string, styleName?: string) => {
    if (!sourceFile?.file) {
      alert('请先导入动作。')
      return
    }

    setTransferLoading(true)
    setTransferStep('idle')

    try {
      setTransferStep('upload-source')
      const uploadedSource = await ensureFileUploaded(sourceFile, uploadBVH)
      const sourceId = uploadedSource.fileId
      if (uploadedSource !== sourceFile) {
        setBvhFiles(prev => prev.map(file => file === sourceFile ? uploadedSource : file))
      }

      if (!sourceId) {
        throw new Error('无法获取动作文件 ID')
      }

      setTransferStep('transferring')
      const result = await transferStyle(sourceId, styleFileId, styleName)
      setTransferStep('loading-result')
      onTransferComplete(result)
      setTransferStep('completed')
      setTimeout(() => setTransferStep('idle'), 1500)
    } catch (error: any) {
      setTransferStep('error')
      alert(`风格迁移失败：${error.message || error}`)
    } finally {
      setTransferLoading(false)
    }
  }

  const handlePresetClick = async (styleId: string) => {
    if (!sourceFile?.file) {
      alert('请先导入动作。')
      return
    }

    try {
      const presetResult = await getPresetFileId(styleId)
      await runTransfer(presetResult.file_id, styleId)
    } catch (error: any) {
      setTransferStep('error')
      alert(`风格迁移失败：${error.message || error}`)
    }
  }

  const handleCustomClick = async (style: CustomStyle) => {
    await runTransfer(style.fileId, style.name)
  }

  const handleImportStyleClick = () => {
    styleInputRef.current?.click()
  }

  const handleStyleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      parseBVHText(text)
      setPendingStyleFile(file)
      setPendingStyleName(file.name.replace(/\.bvh$/i, ''))
      setPendingStyleStorage(canAddPersistent ? 'persistent' : 'temporary')
    } catch {
      alert('BVH 文件无效。请选择有效的 BVH 文件后重试。')
    } finally {
      event.target.value = ''
    }
  }

  const closeImportDialog = () => {
    setPendingStyleFile(null)
    setPendingStyleName('')
    setPendingStyleStorage('temporary')
  }

  const handleConfirmImportStyle = async () => {
    if (!pendingStyleFile) return

    const trimmedName = pendingStyleName.trim()
    if (!trimmedName) {
      alert('请输入风格名称。')
      return
    }

    if (pendingStyleStorage === 'persistent' && !canAddPersistent) {
      alert('持久风格最多保存 4 个。')
      return
    }

    setAddingStyle(true)

    try {
      const uploadResult = await uploadBVH(pendingStyleFile)
      if (addStyle(trimmedName, uploadResult.id, pendingStyleStorage)) {
        closeImportDialog()
      } else {
        alert(getAddStyleError(pendingStyleStorage, canAddPersistent))
      }
    } catch (error: any) {
      const errorMsg = error.response?.status === 500
        ? '服务器错误。请确认后端服务是否正在运行。'
        : error.response?.status === 404
        ? '未找到 API 接口。'
        : error.message || '未知错误'
      alert(`添加风格失败：${errorMsg}`)
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
      if (!renameStyle(renameIndex, renameValue.trim())) {
        alert('风格名称已存在。')
        return
      }
      setRenameIndex(null)
      setRenameValue('')
    }
  }

  return (
    <div className="style-library">
      <div className="style-import-panel">
        <input
          ref={styleInputRef}
          type="file"
          accept=".bvh"
          onChange={handleStyleFileSelected}
          style={{ display: 'none' }}
        />
        <button
          className="add-btn style-import-btn"
          onClick={handleImportStyleClick}
          disabled={addingStyle}
        >
          导入风格
        </button>
      </div>

      <div className="preset-section">
        <div className="preset-title">情绪风格</div>
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
        <div className="preset-title">身体风格</div>
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
        <div className="custom-title-row">
          <div className="custom-title">自定义风格库</div>
          <span className="persistent-count">{persistentCount}/4 持久</span>
        </div>

        {customStyles.length === 0 ? (
          <div className="custom-empty">导入风格 BVH，建立你的专属风格库。</div>
        ) : (
          <div className="custom-list">
            {customStyles.map((style, index) => (
              <div key={`${style.storage}-${style.fileId}-${index}`} className="custom-item">
                <button
                  className="custom-apply-btn"
                  onClick={() => handleCustomClick(style)}
                  disabled={transferLoading}
                >
                  <span className="custom-style-name">{style.name}</span>
                  {style.storage === 'temporary' && (
                    <span className="style-storage-badge">临时</span>
                  )}
                </button>
                <button
                  className="custom-action-btn rename"
                  onClick={() => {
                    setRenameIndex(index)
                    setRenameValue(style.name)
                  }}
                  title="重命名"
                  aria-label="重命名"
                >
                  <svg
                    className="action-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M4 20h4.2L18.7 9.5a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="m13.8 6.2 4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <button
                  className="custom-action-btn delete"
                  onClick={() => setDeleteIndex(index)}
                  title="删除"
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingStyleFile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">导入风格</div>
            <input
              className="modal-input"
              value={pendingStyleName}
              onChange={event => setPendingStyleName(event.target.value)}
              placeholder="风格名称"
              maxLength={20}
            />
            <div className="storage-options" role="radiogroup" aria-label="保存方式">
              <button
                type="button"
                className={`storage-option ${pendingStyleStorage === 'temporary' ? 'active' : ''}`}
                onClick={() => setPendingStyleStorage('temporary')}
              >
                临时
              </button>
              <button
                type="button"
                className={`storage-option ${pendingStyleStorage === 'persistent' ? 'active' : ''}`}
                onClick={() => setPendingStyleStorage('persistent')}
                disabled={!canAddPersistent}
              >
                持久
              </button>
            </div>
            {!canAddPersistent && (
              <div className="modal-message">持久风格已达 4 个上限，仍可导入临时风格。</div>
            )}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeImportDialog}>取消</button>
              <button className="modal-btn confirm" onClick={handleConfirmImportStyle} disabled={addingStyle}>
                {addingStyle ? '正在导入...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renameIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">重命名风格</div>
            <input
              className="modal-input"
              value={renameValue}
              onChange={event => setRenameValue(event.target.value)}
              placeholder="新名称"
              maxLength={20}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setRenameIndex(null)}>取消</button>
              <button className="modal-btn confirm" onClick={handleConfirmRename}>确认</button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">删除风格</div>
            <div className="modal-message">确定从风格库中删除“{customStyles[deleteIndex]?.name}”吗？</div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setDeleteIndex(null)}>取消</button>
              <button className="modal-btn confirm delete" onClick={handleConfirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
