import {
  buildSourcePaneEntries,
  buildResultPaneEntries,
  type PreviewPaneFile,
  type CurrentResultFile,
} from '../src/utils/previewPaneFiles'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const files: PreviewPaneFile[] = [
  { role: 'source' },
  { role: 'style' },
  { role: 'unassigned', label: 'archived-result' },
  { role: 'unassigned' },
]

const sourceEntries = buildSourcePaneEntries(files)
assertEqual(sourceEntries.length, 2, 'source pane excludes style and labelled archived results')
assertEqual(sourceEntries[0]?.originalIndex, 0, 'source entry keeps original source index')
assertEqual(sourceEntries[1]?.originalIndex, 3, 'source entry keeps original unassigned index')

const currentResult: CurrentResultFile = { name: 'current-result.bvh', fileId: 'result-1' }
const resultEntries = buildResultPaneEntries(files, currentResult)
assertEqual(resultEntries.length, 2, 'result pane includes current result and archived labelled result')
assertEqual(resultEntries[0]?.kind, 'current-result', 'current result is first')
assertEqual(resultEntries[0]?.name, 'current-result.bvh', 'current result keeps display name')
assertEqual(resultEntries[1]?.kind, 'archived-result', 'labelled unassigned file is treated as archived result')
assertEqual(resultEntries[1]?.originalIndex, 2, 'archived result keeps original index')

const archivedOnly = buildResultPaneEntries(files, null)
assertEqual(archivedOnly.length, 1, 'result pane can show archived results without current result')
assertEqual(archivedOnly[0]?.originalIndex, 2, 'archived-only result keeps original index')
