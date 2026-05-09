export interface DownloadableBVH {
  file: File | null
  fileId: string | null
  name?: string | null
}

export interface BVHDownloadTarget {
  url: string
  filename: string
  isObjectUrl: boolean
  headers?: Record<string, string>
}

const BVH_EXTENSION = /\.bvh$/i

function ensureBVHExtension(name: string): string {
  const trimmedName = name.trim()
  if (!trimmedName) return 'motion.bvh'
  return BVH_EXTENSION.test(trimmedName) ? trimmedName : `${trimmedName}.bvh`
}

export function buildBVHDownloadTarget(
  bvh: DownloadableBVH,
  getRemoteUrl: (fileId: string) => string,
  createObjectURL: (file: File) => string = URL.createObjectURL,
  getRemoteHeaders: () => Record<string, string> = () => ({})
): BVHDownloadTarget | null {
  if (bvh.file) {
    return {
      url: createObjectURL(bvh.file),
      filename: ensureBVHExtension(bvh.file.name),
      isObjectUrl: true
    }
  }

  if (bvh.fileId) {
    return {
      url: getRemoteUrl(bvh.fileId),
      filename: ensureBVHExtension(bvh.name ?? 'motion'),
      isObjectUrl: false,
      headers: getRemoteHeaders()
    }
  }

  return null
}

function clickDownloadLink(target: BVHDownloadTarget, documentRef: Document = document): void {
  const link = documentRef.createElement('a')
  link.href = target.url
  link.download = target.filename
  link.rel = 'noopener'
  documentRef.body.appendChild(link)
  link.click()
  link.remove()

  if (target.isObjectUrl) {
    window.setTimeout(() => URL.revokeObjectURL(target.url), 0)
  }
}

export async function downloadBVHTarget(
  target: BVHDownloadTarget,
  documentRef: Document = document,
  fetchFn: typeof fetch = fetch,
  createObjectURL: (blob: Blob) => string = URL.createObjectURL
): Promise<void> {
  if (target.isObjectUrl) {
    clickDownloadLink(target, documentRef)
    return
  }

  const response = await fetchFn(target.url, { headers: target.headers ?? {} })
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const blobUrl = createObjectURL(await response.blob())
  clickDownloadLink({
    url: blobUrl,
    filename: target.filename,
    isObjectUrl: true
  }, documentRef)
}
