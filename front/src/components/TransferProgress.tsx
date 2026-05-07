import './TransferProgress.css'

export type TransferStep = 'idle' | 'uploading' | 'upload-source' | 'upload-style' | 'transferring' | 'loading-result' | 'completed' | 'error'

interface TransferProgressProps {
  isVisible: boolean
  step: TransferStep
  errorMessage?: string
}

const stepLabels: Record<TransferStep, string> = {
  idle: '',
  uploading: 'Uploading File...',
  'upload-source': 'Uploading Source...',
  'upload-style': 'Uploading Style...',
  transferring: 'Applying Style Transfer...',
  'loading-result': 'Loading Result...',
  completed: 'Transfer Complete!',
  error: 'Transfer Failed'
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

  return (
    <div className="transfer-progress-overlay">
      <div className="transfer-progress-modal">
        <div className="progress-header">
          <span className="progress-title">
            {isCompleted ? '✓' : isError ? '✗' : '⟳'} Motion Style Transfer
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
            Result is now visible in the canvas
          </div>
        )}
      </div>
    </div>
  )
}