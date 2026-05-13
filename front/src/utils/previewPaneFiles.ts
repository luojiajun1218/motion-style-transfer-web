export interface PreviewPaneFile {
  role: 'source' | 'style' | 'unassigned'
  label?: string
}

export interface CurrentResultFile {
  name: string
  fileId: string | null
}

export interface SourcePaneEntry<TFile extends PreviewPaneFile> {
  kind: 'source-file'
  file: TFile
  originalIndex: number
}

export interface CurrentResultEntry {
  kind: 'current-result'
  name: string
  fileId: string | null
}

export interface ArchivedResultEntry<TFile extends PreviewPaneFile> {
  kind: 'archived-result'
  file: TFile
  originalIndex: number
}

export type ResultPaneEntry<TFile extends PreviewPaneFile> =
  | CurrentResultEntry
  | ArchivedResultEntry<TFile>

export function buildSourcePaneEntries<TFile extends PreviewPaneFile>(
  files: TFile[]
): SourcePaneEntry<TFile>[] {
  return files
    .map((file, originalIndex) => ({ kind: 'source-file' as const, file, originalIndex }))
    .filter(entry => entry.file.role !== 'style' && !entry.file.label)
}

export function buildResultPaneEntries<TFile extends PreviewPaneFile>(
  files: TFile[],
  currentResult: CurrentResultFile | null
): ResultPaneEntry<TFile>[] {
  const archivedEntries = files
    .map((file, originalIndex) => ({ kind: 'archived-result' as const, file, originalIndex }))
    .filter(entry => entry.file.role === 'unassigned' && Boolean(entry.file.label))

  return currentResult
    ? [{ kind: 'current-result', name: currentResult.name, fileId: currentResult.fileId }, ...archivedEntries]
    : archivedEntries
}
