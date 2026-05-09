import { ensureFileUploaded } from '../src/utils/uploadFileIfNeeded'

async function main() {
  const file = new File(['HIERARCHY\n'], 'walk.bvh')
  const calls: File[] = []

  const result = await ensureFileUploaded(
    { file, fileId: null, isUploaded: false },
    async (uploadedFile) => {
      calls.push(uploadedFile)
      return { id: 'uploaded-id' }
    }
  )

  if (calls.length !== 1 || calls[0] !== file) {
    throw new Error('expected uploader to be called once with the file')
  }
  if (result.fileId !== 'uploaded-id' || !result.isUploaded) {
    throw new Error('expected returned state to contain uploaded file id')
  }
}

main().catch(error => {
  setTimeout(() => {
    throw error
  }, 0)
})
