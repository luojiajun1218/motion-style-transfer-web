import type { BVHFileWithRole } from '../types'

export function upsertStyleFile(
  files: BVHFileWithRole[],
  styleFile: BVHFileWithRole
): BVHFileWithRole[] {
  const next = files.map(file =>
    file.role === 'style' ? { ...file, role: 'unassigned' as const } : file
  )
  const existingIndex = next.findIndex(file => file.fileId === styleFile.fileId)

  if (existingIndex === -1) {
    return [...next, { ...styleFile, role: 'style' }]
  }

  return next.map((file, index) =>
    index === existingIndex ? { ...file, ...styleFile, role: 'style' } : file
  )
}
