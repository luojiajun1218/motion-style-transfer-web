import './PlaybackBar.css'

interface PlaybackBarProps {
  frameIndex: number
  maxFrames: number
  isPlaying: boolean
  onFrameChange: (frame: number) => void
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  fps: number
}

export default function PlaybackBar({
  frameIndex,
  maxFrames,
  isPlaying,
  onFrameChange,
  onPlay,
  onPause,
  onReset,
  fps
}: PlaybackBarProps) {
  const progress = maxFrames > 0 ? (frameIndex / maxFrames) * 100 : 0

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause()
    } else {
      onPlay()
    }
  }

  return (
    <div className="status-bar">
      <div className="status-controls">
        <button
          className="status-btn"
          onClick={onReset}
          disabled={frameIndex === 0}
          title="Jump to start"
        >
          ⏮
        </button>
        <button
          className="status-btn play-btn"
          onClick={handlePlayPause}
          disabled={maxFrames === 0}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div className="status-frame">
        <span className="frame-current">{frameIndex}</span>
        <span className="frame-divider">/</span>
        <span className="frame-total">{maxFrames}</span>
      </div>

      <div className="status-timeline">
        <div className="timeline-track">
          <div
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          />
          <div
            className="timeline-slider-handle"
            style={{ left: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={maxFrames}
            value={frameIndex}
            onChange={(e) => onFrameChange(parseInt(e.target.value))}
            className="timeline-input"
          />
        </div>
      </div>

      <div className="status-right">
        <span className="status-fps">{fps} fps</span>
      </div>
    </div>
  )
}
