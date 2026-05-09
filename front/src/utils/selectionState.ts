export type SkeletonSelection = 'source' | 'style' | 'result' | number | null

export interface SelectableFile {
  role: 'source' | 'style' | 'unassigned'
}

export function getSkeletonSelectionForFile(
  files: SelectableFile[],
  index: number
): SkeletonSelection {
  const file = files[index]
  if (!file) return null
  return file.role === 'unassigned' ? index : file.role
}

export function getFileIndexForSkeletonSelection(
  files: SelectableFile[],
  skeleton: SkeletonSelection
): number | null {
  if (typeof skeleton === 'number') {
    return skeleton >= 0 && skeleton < files.length ? skeleton : null
  }

  if (skeleton === 'source' || skeleton === 'style') {
    const index = files.findIndex(file => file.role === skeleton)
    return index === -1 ? null : index
  }

  return null
}

export function getSelectionAfterFileRemoval(
  files: SelectableFile[],
  removedIndex: number,
  selectedFileIndex: number | null,
  selectedSkeleton: SkeletonSelection
): { fileIndex: number | null; skeleton: SkeletonSelection } {
  const removedFile = files[removedIndex]
  let nextFileIndex = selectedFileIndex
  let nextSkeleton = selectedSkeleton

  if (selectedFileIndex === removedIndex) {
    nextFileIndex = null
  } else if (selectedFileIndex !== null && selectedFileIndex > removedIndex) {
    nextFileIndex = selectedFileIndex - 1
  }

  if (typeof selectedSkeleton === 'number') {
    if (selectedSkeleton === removedIndex) {
      nextSkeleton = null
    } else if (selectedSkeleton > removedIndex) {
      nextSkeleton = selectedSkeleton - 1
    }
  } else if (
    removedFile &&
    (selectedSkeleton === 'source' || selectedSkeleton === 'style') &&
    removedFile.role === selectedSkeleton
  ) {
    nextSkeleton = null
  }

  if (nextSkeleton === null || nextSkeleton === 'result') {
    nextFileIndex = null
  }

  return { fileIndex: nextFileIndex, skeleton: nextSkeleton }
}
