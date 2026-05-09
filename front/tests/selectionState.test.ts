import {
  getFileIndexForSkeletonSelection,
  getSkeletonSelectionForFile,
  getSelectionAfterFileRemoval,
  type SelectableFile,
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
