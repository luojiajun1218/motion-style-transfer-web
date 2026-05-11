import './TransferProgress.css'

export type TransferStep = 'idle' | 'uploading' | 'upload-source' | 'upload-style' | 'transferring' | 'loading-result' | 'completed' | 'error'

interface TransferProgressProps {
  isVisible: boolean
  step: TransferStep
  errorMessage?: string
}

const stepLabels: Record<TransferStep, string> = {
  idle: '',
  uploading: '正在上传文件...',
  'upload-source': '正在上传源动作...',
  'upload-style': '正在上传风格动作...',
  transferring: '正在执行风格迁移...',
  'loading-result': '正在加载输出...',
  completed: '迁移完成',
  error: '迁移失败'
}

const stepProgress: Record<TransferStep, number> = {
  idle: 0,
  uploading: 30,
  'upload-source': 20,
  'upload-style': 40,
  transferring: 60,
  'loading-result': 80,
  completed: 100,
  error: 0
}

export default function TransferProgress({ isVisible, step, errorMessage }: TransferProgressProps) {
  if (!isVisible) return null

  const progress = stepProgress[step]
  const label = stepLabels[step]
  const isCompleted = step === 'completed'
  const isError = step === 'error'
  const statusIcon = isCompleted ? '完成' : isError ? '!' : '...'

  return (
    <div className="transfer-progress-overlay">
      <div className="transfer-progress-modal">
        <div className="progress-header">
          <span className="progress-title">
            {statusIcon} 动作风格迁移
          </span>
        </div>

        <div className="progress-bar-container">
          <div
            className={`progress-bar-fill ${isCompleted ? 'completed' : isError ? 'error' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={`progress-label ${isCompleted ? 'completed' : isError ? 'error' : ''}`}>
          {isError ? errorMessage || label : label}
        </div>

        {isCompleted && (
          <div className="progress-success-hint">
            输出已显示在画布中。
          </div>
        )}
      </div>
    </div>
  )
}
