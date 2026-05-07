import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { getPresetStyles, getPresetFileId, transferStyle, uploadBVH, PresetStylesResponse, BVHFileWithRole } from '../types'
import { useCustomStyles, CustomStyle } from '../hooks/useCustomStyles'
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

  // 重命名/删除弹窗状态
  const [renameIndex, setRenameIndex] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  // 添加风格弹窗状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addingStyle, setAddingStyle] = useState(false)  // 添加风格的独立loading状态

  // 加载预设风格列表
  useEffect(() => {
    getPresetStyles().then(setPresetStyles).catch(console.error)
  }, [])

  // 获取当前选中的文件
  const selectedFile = selectedFileIndex !== null ? bvhFiles[selectedFileIndex] : null
  const sourceFile = bvhFiles.find(f => f.role === 'source')

  // DEBUG: 输出状态验证问题
  console.log('[StyleLibrary DEBUG]', {
    bvhFilesCount: bvhFiles.length,
    bvhFilesRoles: bvhFiles.map(f => ({ name: f.file?.name?.slice(0, 20), role: f.role, hasFile: !!f.file })),
    sourceFileFound: !!sourceFile,
    sourceFileName: sourceFile?.file?.name,
    selectedFileIndex,
    selectedFileRole: selectedFile?.role
  })

  // 点击预设风格按钮：使用 Source 文件 + 预设风格执行迁移
  const handlePresetClick = async (styleId: string) => {
    // 检查 Source 文件是否存在（不是 selectedFile）
    if (!sourceFile?.file) {
      alert('请先设置 Source 文件')
      return
    }

    setTransferLoading(true)
    setTransferStep('idle')

    try {
      // Step 1: 确保 Source 文件已上传
      let sourceId = sourceFile.fileId
      if (!sourceFile.isUploaded && sourceFile.file) {
        setTransferStep('upload-source')
        const uploadResult = await uploadBVH(sourceFile.file)
        sourceId = uploadResult.id
        setBvhFiles(prev => prev.map(f =>
          f.file === sourceFile.file ? { ...f, fileId: sourceId, isUploaded: true } : f
        ))
      }

      if (!sourceId) {
        throw new Error('无法获取 Source 文件 ID')
      }

      // Step 2: 获取预设风格的 fileId
      setTransferStep('transferring')
      const presetResult = await getPresetFileId(styleId)
      const styleIdForTransfer = presetResult.file_id

      // Step 3: 执行迁移
      const result = await transferStyle(sourceId, styleIdForTransfer)

      // Step 4: 完成
      setTransferStep('loading-result')
      onTransferComplete(result.result_id)
      setTransferStep('completed')
      setTimeout(() => setTransferStep('idle'), 1500)
    } catch (error: any) {
      setTransferStep('error')
      alert(`风格迁移失败: ${error.message || error}`)
    } finally {
      setTransferLoading(false)
    }
  }

  // 点击自定义风格按钮
  const handleCustomClick = async (style: CustomStyle) => {
    if (!sourceFile?.fileId) {
      alert('请先设置 Source 文件')
      return
    }

    setTransferLoading(true)
    setTransferStep('transferring')

    try {
      const result = await transferStyle(sourceFile.fileId, style.fileId)
      setTransferStep('loading-result')
      onTransferComplete(result.result_id)
      setTransferStep('completed')
      setTimeout(() => setTransferStep('idle'), 1500)
    } catch (error: any) {
      setTransferStep('error')
      alert(`风格迁移失败: ${error.message || error}`)
    } finally {
      setTransferLoading(false)
    }
  }

  // 添加风格到库（轻量操作，不用进度条）
  const handleAddStyle = async () => {
    if (!selectedFile?.file) {
      return
    }

    if (!addName.trim()) {
      alert('请输入风格名称')
      return
    }

    setAddingStyle(true)

    try {
      // 如果文件未上传，先上传到后端获取 fileId
      let fileId = selectedFile.fileId
      if (!selectedFile.isUploaded) {
        const uploadResult = await uploadBVH(selectedFile.file)
        fileId = uploadResult.id
      }

      if (!fileId) {
        throw new Error('上传失败：未获取到文件ID')
      }

      // 保存到本地风格库（localStorage）
      if (addStyle(addName.trim(), fileId)) {
        setShowAddModal(false)
        setAddName('')
      } else {
        alert('风格库已满（最多4个）或名称已存在')
      }
    } catch (error: any) {
      const errorMsg = error.response?.status === 500
        ? '服务器内部错误，请检查后端是否正常运行'
        : error.response?.status === 404
        ? 'API 接口不存在'
        : error.message || '未知错误'
      alert(`添加失败: ${errorMsg}`)
    } finally {
      setAddingStyle(false)
    }
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      deleteStyle(deleteIndex)
      setDeleteIndex(null)
    }
  }

  // 确认重命名
  const handleConfirmRename = () => {
    if (renameIndex !== null && renameValue.trim()) {
      renameStyle(renameIndex, renameValue.trim())
      setRenameIndex(null)
      setRenameValue('')
    }
  }

  return (
    <div className="style-library">
      {/* 预设风格 - 情感 */}
      <div className="preset-section">
        <div className="preset-title">EMOTION STYLES</div>
        <div className="preset-grid">
          {presetStyles?.emotion.map(style => (
            <button
              key={style.id}
              className="preset-btn"
              onClick={() => handlePresetClick(style.id)}
              disabled={transferLoading}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* 预设风格 - 身体特征 */}
      <div className="preset-section">
        <div className="preset-title">BODY CHARACTER STYLES</div>
        <div className="preset-grid">
          {presetStyles?.body.map(style => (
            <button
              key={style.id}
              className="preset-btn"
              onClick={() => handlePresetClick(style.id)}
              disabled={transferLoading}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义风格 */}
      <div className="custom-section">
        <div className="custom-title">MY STYLE LIBRARY</div>

        {customStyles.length === 0 ? (
          <div className="custom-empty">点击下方按钮添加风格</div>
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
                  title="重命名"
                >
                  ✎
                </button>
                <button
                  className="custom-action-btn delete"
                  onClick={() => setDeleteIndex(index)}
                  title="删除"
                >
                  ×
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
          + Add to Library
        </button>
      </div>

      {/* 添加弹窗 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">添加风格</div>
            <input
              className="modal-input"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="风格名称"
              maxLength={20}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="modal-btn confirm" onClick={handleAddStyle} disabled={addingStyle}>
                {addingStyle ? 'Adding...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名弹窗 */}
      {renameIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">重命名风格</div>
            <input
              className="modal-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
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

      {/* 删除确认弹窗 */}
      {deleteIndex !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">确认删除</div>
            <div className="modal-message">确定要删除风格 "{customStyles[deleteIndex]?.name}" 吗?</div>
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