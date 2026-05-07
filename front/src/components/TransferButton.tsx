export default function TransferButton({ onClick, disabled, loading = false }: {
  onClick: () => Promise<void | unknown>
  disabled: boolean
  loading?: boolean
}) {
  const handleClick = async () => {
    try {
      await onClick()
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Transfer failed. Please check your files and try again.')
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
