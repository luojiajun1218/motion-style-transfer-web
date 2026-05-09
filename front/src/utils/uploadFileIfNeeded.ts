export interface UploadableFileState {
  file: File | null
  fileId: string | null
  isUploaded: boolean
}

export interface UploadResult {
  id: string
}

export async function ensureFileUploaded<T extends UploadableFileState>(
  fileState: T,
  upload: (file: File) => Promise<UploadResult>
): Promise<T> {
  if (fileState.isUploaded && fileState.fileId) {
    return fileState
  }

  if (!fileState.file) {
    throw new Error('No file selected')
  }

  const uploadResult = await upload(fileState.file)
  return {
    ...fileState,
    fileId: uploadResult.id,
    isUploaded: true
  }
}
