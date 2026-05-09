import { buildBVHDownloadTarget } from '../src/utils/downloadBVH'
import { getBVHUrl, setApiAuthToken } from '../src/services/api'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const localFile = new File(['HIERARCHY\n'], 'walk.bvh')
const localTarget = buildBVHDownloadTarget(
  { file: localFile, fileId: null },
  () => '/api/file/unused',
  () => 'blob:walk'
)

assertEqual(localTarget?.url, 'blob:walk', 'local files download from an object URL')
assertEqual(localTarget?.filename, 'walk.bvh', 'local files keep their original name')
assertEqual(localTarget?.isObjectUrl, true, 'local downloads mark object URLs for revocation')

const remoteTarget = buildBVHDownloadTarget(
  { file: null, fileId: 'result-123', name: 'Transfer Output' },
  (fileId) => `/api/file/${fileId}`
)

assertEqual(remoteTarget?.url, '/api/file/result-123', 'remote files download from the API URL')
assertEqual(remoteTarget?.filename, 'Transfer Output.bvh', 'remote files get a BVH extension')
assertEqual(remoteTarget?.isObjectUrl, false, 'remote downloads do not mark object URLs')

setApiAuthToken('secret-token')
assertEqual(getBVHUrl('result-123'), '/api/file/result-123', 'remote BVH URLs do not expose auth tokens')
setApiAuthToken(null)

const missingTarget = buildBVHDownloadTarget(
  { file: null, fileId: null, name: 'Missing' },
  () => '/api/file/missing'
)

assertEqual(missingTarget, null, 'files without local content or a remote id cannot be downloaded')
