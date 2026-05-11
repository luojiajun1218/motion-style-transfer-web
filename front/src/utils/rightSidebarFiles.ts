export interface RightSidebarFile {
  role: 'source' | 'style' | 'unassigned'
}

export interface RightSidebarFileEntry<TFile extends RightSidebarFile> {
  file: TFile
  originalIndex: number
}

export function buildRightSidebarFileEntries<TFile extends RightSidebarFile>(
  files: TFile[]
): RightSidebarFileEntry<TFile>[] {
  return files
    .map((file, originalIndex) => ({ file, originalIndex }))
    .filter(entry => entry.file.role !== 'style')
}
