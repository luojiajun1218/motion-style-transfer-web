import {
  buildRightSidebarFileEntries,
  type RightSidebarFile,
} from '../src/utils/rightSidebarFiles'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const files: RightSidebarFile[] = [
  { role: 'source' },
  { role: 'style' },
  { role: 'unassigned' },
  { role: 'style' },
]

const entries = buildRightSidebarFileEntries(files)

assertEqual(entries.length, 2, 'style files are filtered from the right sidebar')
assertEqual(entries[0]?.file.role, 'source', 'source remains visible')
assertEqual(entries[0]?.originalIndex, 0, 'source keeps original index')
assertEqual(entries[1]?.file.role, 'unassigned', 'unassigned non-style file remains visible')
assertEqual(entries[1]?.originalIndex, 2, 'unassigned file keeps original index')
