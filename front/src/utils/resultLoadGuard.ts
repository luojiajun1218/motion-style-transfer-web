export function isCurrentResultLoad(
  loadingFileId: string,
  getCurrentFileId: () => string | null
): boolean {
  return getCurrentFileId() === loadingFileId
}
