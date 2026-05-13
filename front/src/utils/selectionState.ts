export type SkeletonSelection = 'source' | 'style' | 'result' | number | null

export type SelectedBvhTarget =
  | { kind: 'file'; fileIndex: number }
  | { kind: 'current-result' }
  | null

export interface SelectableFile {
  role: 'source' | 'style' | 'unassigned'
  label?: string
}

export interface DownloadSelectableFile extends SelectableFile {
  hasFile: boolean
  hasFileId: boolean
}

export interface PaneSelectionState {
  fileIndex: number | null
  skeleton: SkeletonSelection
  downloadTarget: SelectedBvhTarget
}

export interface PreviewRemovalSelectionInput {
  selectedFileIndex: number | null
  selectedSkeleton: SkeletonSelection
  selectedBvhTarget: SelectedBvhTarget
  sourcePreviewFileIndex: number | null
  resultPreviewFileIndex: number | null
  hasCurrentResult: boolean
}

export interface PreviewRemovalSelectionState {
  selectedFileIndex: number | null
  selectedSkeleton: SkeletonSelection
  selectedBvhTarget: SelectedBvhTarget
  sourcePreviewFileIndex: number | null
  resultPreviewFileIndex: number | null
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

export function getSelectedBvhTargetAfterFileRemoval(
  selectedTarget: SelectedBvhTarget,
  removedIndex: number
): SelectedBvhTarget {
  if (!selectedTarget || selectedTarget.kind === 'current-result') return selectedTarget

  if (selectedTarget.fileIndex === removedIndex) return null

  if (selectedTarget.fileIndex > removedIndex) {
    return { kind: 'file', fileIndex: selectedTarget.fileIndex - 1 }
  }

  return selectedTarget
}

export function getPaneSelectionAfterSourceRowSelect(
  files: SelectableFile[],
  index: number
): PaneSelectionState {
  if (index < 0 || index >= files.length) {
    return { fileIndex: null, skeleton: null, downloadTarget: null }
  }

  return {
    fileIndex: index,
    skeleton: getSkeletonSelectionForFile(files, index),
    downloadTarget: { kind: 'file', fileIndex: index }
  }
}

export function getPaneSelectionAfterCurrentResultSelect(
  hasCurrentResult: boolean
): PaneSelectionState {
  return {
    fileIndex: null,
    skeleton: hasCurrentResult ? 'result' : null,
    downloadTarget: hasCurrentResult ? { kind: 'current-result' } : null
  }
}

export function getPaneSelectionAfterArchivedResultSelect(
  files: SelectableFile[],
  index: number
): PaneSelectionState {
  if (index < 0 || index >= files.length) {
    return { fileIndex: null, skeleton: null, downloadTarget: null }
  }

  return {
    fileIndex: index,
    skeleton: 'result',
    downloadTarget: { kind: 'file', fileIndex: index }
  }
}

export function getSelectedBvhDownloadEnabled(
  files: DownloadSelectableFile[],
  selectedTarget: SelectedBvhTarget,
  hasCurrentResult: boolean
): boolean {
  if (!selectedTarget) return false
  if (selectedTarget.kind === 'current-result') return hasCurrentResult

  const selectedFile = files[selectedTarget.fileIndex]
  return Boolean(selectedFile?.hasFile || selectedFile?.hasFileId)
}

function shiftIndexAfterRemoval(index: number | null, removedIndex: number): number | null {
  if (index === null) return null
  if (index === removedIndex) return null
  return index > removedIndex ? index - 1 : index
}

function getFirstSourceCapableIndex(files: SelectableFile[]): number | null {
  const index = files.findIndex(file => file.role !== 'style' && !file.label)
  return index === -1 ? null : index
}

function getFirstArchivedResultIndex(files: SelectableFile[]): number | null {
  const index = files.findIndex(file => file.role === 'unassigned' && Boolean(file.label))
  return index === -1 ? null : index
}

export function getPreviewSelectionAfterCurrentResultRemoval(
  files: SelectableFile[],
  selection: PreviewRemovalSelectionInput
): PreviewRemovalSelectionState {
  const fallbackResultIndex = getFirstArchivedResultIndex(files)

  if (fallbackResultIndex !== null) {
    return {
      selectedFileIndex: fallbackResultIndex,
      selectedSkeleton: 'result',
      selectedBvhTarget: { kind: 'file', fileIndex: fallbackResultIndex },
      sourcePreviewFileIndex: selection.sourcePreviewFileIndex,
      resultPreviewFileIndex: fallbackResultIndex
    }
  }

  return {
    selectedFileIndex: selection.selectedSkeleton === 'result' ? null : selection.selectedFileIndex,
    selectedSkeleton: selection.selectedSkeleton === 'result' ? null : selection.selectedSkeleton,
    selectedBvhTarget: selection.selectedBvhTarget?.kind === 'current-result' ? null : selection.selectedBvhTarget,
    sourcePreviewFileIndex: selection.sourcePreviewFileIndex,
    resultPreviewFileIndex: null
  }
}

export function getPreviewSelectionAfterFileRemoval(
  files: SelectableFile[],
  removedIndex: number,
  selection: PreviewRemovalSelectionInput
): PreviewRemovalSelectionState {
  const nextFiles = files.filter((_, fileIndex) => fileIndex !== removedIndex)
  let selectedFileIndex = shiftIndexAfterRemoval(selection.selectedFileIndex, removedIndex)
  let selectedSkeleton = selection.selectedSkeleton
  let selectedBvhTarget = getSelectedBvhTargetAfterFileRemoval(selection.selectedBvhTarget, removedIndex)
  let sourcePreviewFileIndex = shiftIndexAfterRemoval(selection.sourcePreviewFileIndex, removedIndex)
  let resultPreviewFileIndex = shiftIndexAfterRemoval(selection.resultPreviewFileIndex, removedIndex)

  if (typeof selectedSkeleton === 'number') {
    selectedSkeleton = shiftIndexAfterRemoval(selectedSkeleton, removedIndex)
  } else {
    const removedFile = files[removedIndex]
    if (
      removedFile &&
      (selectedSkeleton === 'source' || selectedSkeleton === 'style') &&
      removedFile.role === selectedSkeleton
    ) {
      selectedSkeleton = null
    }
  }

  if (selection.sourcePreviewFileIndex === removedIndex) {
    const fallbackSourceIndex = getFirstSourceCapableIndex(nextFiles)
    sourcePreviewFileIndex = fallbackSourceIndex

    if (fallbackSourceIndex === null) {
      selectedFileIndex = null
      selectedSkeleton = null
      selectedBvhTarget = null
    } else {
      selectedFileIndex = fallbackSourceIndex
      selectedSkeleton = getSkeletonSelectionForFile(nextFiles, fallbackSourceIndex)
      selectedBvhTarget = { kind: 'file', fileIndex: fallbackSourceIndex }
    }
  }

  if (selection.resultPreviewFileIndex === removedIndex) {
    resultPreviewFileIndex = null

    if (selection.hasCurrentResult) {
      selectedFileIndex = null
      selectedSkeleton = 'result'
      selectedBvhTarget = { kind: 'current-result' }
    } else if (
      selection.selectedSkeleton === 'result' ||
      (selection.selectedBvhTarget?.kind === 'file' && selection.selectedBvhTarget.fileIndex === removedIndex)
    ) {
      selectedFileIndex = null
      selectedSkeleton = null
      selectedBvhTarget = null
    }
  }

  return {
    selectedFileIndex,
    selectedSkeleton,
    selectedBvhTarget,
    sourcePreviewFileIndex,
    resultPreviewFileIndex
  }
}
