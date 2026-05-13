import {
  getFileIndexForSkeletonSelection,
  getPaneSelectionAfterArchivedResultSelect,
  getPaneSelectionAfterCurrentResultSelect,
  getPaneSelectionAfterSourceRowSelect,
  getPreviewSelectionAfterCurrentResultRemoval,
  getPreviewSelectionAfterFileRemoval,
  getSelectedBvhDownloadEnabled,
  getSkeletonSelectionForFile,
  getSelectionAfterFileRemoval,
  getSelectedBvhTargetAfterFileRemoval,
  type SelectableFile,
  type SelectedBvhTarget,
} from '../src/utils/selectionState'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const files: SelectableFile[] = [
  { role: 'source' },
  { role: 'unassigned' },
  { role: 'style' },
]

assertEqual(getSkeletonSelectionForFile(files, 0), 'source', 'source file maps to source skeleton')
assertEqual(getSkeletonSelectionForFile(files, 1), 1, 'unassigned file maps to its index')
assertEqual(getSkeletonSelectionForFile(files, 2), 'style', 'style file maps to style skeleton')
assertEqual(getFileIndexForSkeletonSelection(files, 'source'), 0, 'source skeleton maps to source file')
assertEqual(getFileIndexForSkeletonSelection(files, 'style'), 2, 'style skeleton maps to style file')
assertEqual(getFileIndexForSkeletonSelection(files, 1), 1, 'numeric skeleton maps to same file')
assertEqual(getFileIndexForSkeletonSelection(files, 'result'), null, 'result clears file selection')

const removedSelected = getSelectionAfterFileRemoval(files, 1, 1, 1)
assertEqual(removedSelected.fileIndex, null, 'removing selected file clears file selection')
assertEqual(removedSelected.skeleton, null, 'removing selected file clears skeleton selection')

const shifted = getSelectionAfterFileRemoval(files, 0, 2, 'style')
assertEqual(shifted.fileIndex, 1, 'file selection shifts after removing earlier file')
assertEqual(shifted.skeleton, 'style', 'role skeleton survives removing unrelated earlier file')

const shiftedNumeric = getSelectionAfterFileRemoval(files, 0, 1, 1)
assertEqual(shiftedNumeric.fileIndex, 0, 'numeric file selection shifts after removing earlier file')
assertEqual(shiftedNumeric.skeleton, 0, 'numeric skeleton selection shifts after removing earlier file')

const selectedTarget: SelectedBvhTarget = { kind: 'file', fileIndex: 2 }
const shiftedDownloadTarget = getSelectedBvhTargetAfterFileRemoval(selectedTarget, 0)
assertEqual(shiftedDownloadTarget?.kind, 'file', 'download target keeps file kind after earlier removal')
assertEqual(shiftedDownloadTarget?.kind === 'file' ? shiftedDownloadTarget.fileIndex : null, 1, 'download target shifts after removing earlier file')

const clearedDownloadTarget = getSelectedBvhTargetAfterFileRemoval({ kind: 'file', fileIndex: 1 }, 1)
assertEqual(clearedDownloadTarget, null, 'removing selected download file clears target')

const currentResultTarget = getSelectedBvhTargetAfterFileRemoval({ kind: 'current-result' }, 1)
assertEqual(currentResultTarget?.kind, 'current-result', 'current result download target survives file removal')

const sourceRowSelection = getPaneSelectionAfterSourceRowSelect(files, 1)
assertEqual(sourceRowSelection.fileIndex, 1, 'selecting source pane row selects file index')
assertEqual(sourceRowSelection.skeleton, 1, 'selecting unassigned source pane row previews numeric skeleton')
assertEqual(sourceRowSelection.downloadTarget?.kind, 'file', 'selecting source pane row selects file download target')
assertEqual(sourceRowSelection.downloadTarget?.kind === 'file' ? sourceRowSelection.downloadTarget.fileIndex : null, 1, 'source pane download target keeps selected index')

const invalidSourceRowSelection = getPaneSelectionAfterSourceRowSelect(files, 99)
assertEqual(invalidSourceRowSelection.fileIndex, null, 'invalid source pane row clears file index')
assertEqual(invalidSourceRowSelection.skeleton, null, 'invalid source pane row clears skeleton')
assertEqual(invalidSourceRowSelection.downloadTarget, null, 'invalid source pane row clears download target')

const currentResultSelection = getPaneSelectionAfterCurrentResultSelect(true)
assertEqual(currentResultSelection.fileIndex, null, 'selecting current result clears file index')
assertEqual(currentResultSelection.skeleton, 'result', 'selecting current result previews result pane')
assertEqual(currentResultSelection.downloadTarget?.kind, 'current-result', 'selecting current result selects current-result download target')

const missingCurrentResultSelection = getPaneSelectionAfterCurrentResultSelect(false)
assertEqual(missingCurrentResultSelection.downloadTarget, null, 'missing current result has no download target')

const archivedResultSelection = getPaneSelectionAfterArchivedResultSelect(files, 1)
assertEqual(archivedResultSelection.fileIndex, 1, 'selecting archived result keeps file index')
assertEqual(archivedResultSelection.skeleton, 'result', 'selecting archived result previews result pane')
assertEqual(archivedResultSelection.downloadTarget?.kind, 'file', 'selecting archived result selects file download target')
assertEqual(archivedResultSelection.downloadTarget?.kind === 'file' ? archivedResultSelection.downloadTarget.fileIndex : null, 1, 'archived result download target keeps index')

const invalidArchivedResultSelection = getPaneSelectionAfterArchivedResultSelect(files, 99)
assertEqual(invalidArchivedResultSelection.fileIndex, null, 'invalid archived result clears file index')
assertEqual(invalidArchivedResultSelection.skeleton, null, 'invalid archived result clears skeleton')
assertEqual(invalidArchivedResultSelection.downloadTarget, null, 'invalid archived result clears download target')

const downloadableFiles = [
  { role: 'source' as const, hasFile: true, hasFileId: false },
  { role: 'unassigned' as const, hasFile: false, hasFileId: true },
  { role: 'style' as const, hasFile: false, hasFileId: false },
]
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, null, false), false, 'download disabled without selected target')
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, { kind: 'file', fileIndex: 0 }, false), true, 'download enabled for selected local file')
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, { kind: 'file', fileIndex: 1 }, false), true, 'download enabled for selected remote file')
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, { kind: 'file', fileIndex: 2 }, false), false, 'download disabled for selected file without downloadable content')
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, { kind: 'current-result' }, true), true, 'download enabled for available current result')
assertEqual(getSelectedBvhDownloadEnabled(downloadableFiles, { kind: 'current-result' }, false), false, 'download disabled for missing current result')

const resultRemovalFiles: SelectableFile[] = [
  { role: 'source' },
  { role: 'unassigned' },
  { role: 'unassigned' },
]
const removedSelectedArchivedWithCurrent = getPreviewSelectionAfterFileRemoval(resultRemovalFiles, 1, {
  selectedFileIndex: 1,
  selectedSkeleton: 'result',
  selectedBvhTarget: { kind: 'file', fileIndex: 1 },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: 1,
  hasCurrentResult: true
})
assertEqual(removedSelectedArchivedWithCurrent.selectedFileIndex, null, 'removed selected archived result with current clears file index')
assertEqual(removedSelectedArchivedWithCurrent.selectedSkeleton, 'result', 'removed selected archived result with current keeps result skeleton')
assertEqual(removedSelectedArchivedWithCurrent.selectedBvhTarget?.kind, 'current-result', 'removed selected archived result with current falls back to current result target')
assertEqual(removedSelectedArchivedWithCurrent.resultPreviewFileIndex, null, 'removed selected archived result with current previews current result')

const removedSelectedArchivedWithoutCurrent = getPreviewSelectionAfterFileRemoval(resultRemovalFiles, 1, {
  selectedFileIndex: 1,
  selectedSkeleton: 'result',
  selectedBvhTarget: { kind: 'file', fileIndex: 1 },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: 1,
  hasCurrentResult: false
})
assertEqual(removedSelectedArchivedWithoutCurrent.selectedFileIndex, null, 'removed selected archived result without current clears file index')
assertEqual(removedSelectedArchivedWithoutCurrent.selectedSkeleton, null, 'removed selected archived result without current clears skeleton')
assertEqual(removedSelectedArchivedWithoutCurrent.selectedBvhTarget, null, 'removed selected archived result without current clears download target')
assertEqual(removedSelectedArchivedWithoutCurrent.resultPreviewFileIndex, null, 'removed selected archived result without current clears result preview')

const sourceRemovalFiles: SelectableFile[] = [
  { role: 'source' },
  { role: 'unassigned' },
  { role: 'unassigned' },
]
const removedSelectedSourceWithFallback = getPreviewSelectionAfterFileRemoval(sourceRemovalFiles, 0, {
  selectedFileIndex: 0,
  selectedSkeleton: 'source',
  selectedBvhTarget: { kind: 'file', fileIndex: 0 },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: null,
  hasCurrentResult: false
})
assertEqual(removedSelectedSourceWithFallback.selectedFileIndex, 0, 'removed selected source falls back to first post-removal source-capable row')
assertEqual(removedSelectedSourceWithFallback.selectedSkeleton, 0, 'removed selected source fallback previews numeric skeleton')
assertEqual(removedSelectedSourceWithFallback.selectedBvhTarget?.kind, 'file', 'removed selected source fallback selects file target')
assertEqual(removedSelectedSourceWithFallback.selectedBvhTarget?.kind === 'file' ? removedSelectedSourceWithFallback.selectedBvhTarget.fileIndex : null, 0, 'removed selected source fallback target uses post-removal index')
assertEqual(removedSelectedSourceWithFallback.sourcePreviewFileIndex, 0, 'removed selected source fallback row is visually selected')

const sourceRemovalSkipsArchivedResult: SelectableFile[] = [
  { role: 'source' },
  { role: 'unassigned', label: 'archived-result' },
  { role: 'unassigned' },
]
const removedSelectedSourceSkippingArchived = getPreviewSelectionAfterFileRemoval(sourceRemovalSkipsArchivedResult, 0, {
  selectedFileIndex: 0,
  selectedSkeleton: 'source',
  selectedBvhTarget: { kind: 'file', fileIndex: 0 },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: null,
  hasCurrentResult: false
})
assertEqual(removedSelectedSourceSkippingArchived.selectedFileIndex, 1, 'source fallback skips labelled archived result')
assertEqual(removedSelectedSourceSkippingArchived.selectedSkeleton, 1, 'source fallback skeleton uses first unlabelled source-capable row')
assertEqual(removedSelectedSourceSkippingArchived.selectedBvhTarget?.kind === 'file' ? removedSelectedSourceSkippingArchived.selectedBvhTarget.fileIndex : null, 1, 'source fallback download target skips labelled archived result')
assertEqual(removedSelectedSourceSkippingArchived.sourcePreviewFileIndex, 1, 'source fallback visual selection skips labelled archived result')

const removedSelectedSourceWithoutFallback = getPreviewSelectionAfterFileRemoval([{ role: 'source' }], 0, {
  selectedFileIndex: 0,
  selectedSkeleton: 'source',
  selectedBvhTarget: { kind: 'file', fileIndex: 0 },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: null,
  hasCurrentResult: false
})
assertEqual(removedSelectedSourceWithoutFallback.selectedFileIndex, null, 'removed only source clears file index')
assertEqual(removedSelectedSourceWithoutFallback.selectedSkeleton, null, 'removed only source clears skeleton')
assertEqual(removedSelectedSourceWithoutFallback.selectedBvhTarget, null, 'removed only source clears download target')
assertEqual(removedSelectedSourceWithoutFallback.sourcePreviewFileIndex, null, 'removed only source clears visual source selection')

const currentResultRemovalFiles: SelectableFile[] = [
  { role: 'source' },
  { role: 'unassigned', label: 'old-result' },
  { role: 'unassigned' },
]
const removedCurrentResultWithArchive = getPreviewSelectionAfterCurrentResultRemoval(currentResultRemovalFiles, {
  selectedFileIndex: null,
  selectedSkeleton: 'result',
  selectedBvhTarget: { kind: 'current-result' },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: null,
  hasCurrentResult: true
})
assertEqual(removedCurrentResultWithArchive.selectedFileIndex, 1, 'removed current result falls back to first archived result file')
assertEqual(removedCurrentResultWithArchive.selectedSkeleton, 'result', 'removed current result with archive keeps result skeleton')
assertEqual(removedCurrentResultWithArchive.selectedBvhTarget?.kind, 'file', 'removed current result with archive selects archived file target')
assertEqual(removedCurrentResultWithArchive.selectedBvhTarget?.kind === 'file' ? removedCurrentResultWithArchive.selectedBvhTarget.fileIndex : null, 1, 'removed current result with archive uses archived result index')
assertEqual(removedCurrentResultWithArchive.resultPreviewFileIndex, 1, 'removed current result with archive previews archived result')

const removedCurrentResultWithoutArchive = getPreviewSelectionAfterCurrentResultRemoval([{ role: 'source' }], {
  selectedFileIndex: null,
  selectedSkeleton: 'result',
  selectedBvhTarget: { kind: 'current-result' },
  sourcePreviewFileIndex: 0,
  resultPreviewFileIndex: null,
  hasCurrentResult: true
})
assertEqual(removedCurrentResultWithoutArchive.selectedFileIndex, null, 'removed current result without archive clears file index')
assertEqual(removedCurrentResultWithoutArchive.selectedSkeleton, null, 'removed current result without archive clears result skeleton')
assertEqual(removedCurrentResultWithoutArchive.selectedBvhTarget, null, 'removed current result without archive clears download target')
assertEqual(removedCurrentResultWithoutArchive.resultPreviewFileIndex, null, 'removed current result without archive clears result preview')
