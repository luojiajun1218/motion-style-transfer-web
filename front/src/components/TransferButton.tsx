export default function TransferButton({ onClick, disabled, loading = false }: {
  onClick: () => Promise<void | unknown>
  disabled: boolean
  loading?: boolean
}) {
  const handleClick = async () => {
    try {
      await onClick()
    } catch (error) {
      console.error('Style transfer failed:', error)
      alert('Style transfer failed. Check the selected files and try again.')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="blender-btn blender-btn-primary"
    >
      {loading ? 'Processing...' : 'Start Transfer'}
    </button>
  )
}
