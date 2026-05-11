const BVH_EXTENSION = /\.bvh$/i

function stripBvhExtension(fileName: string): string {
  return fileName.trim().replace(BVH_EXTENSION, '')
}

export function buildResultLabel(
  sourceFileName: string | null | undefined,
  styleFileName: string | null | undefined
): string {
  if (!sourceFileName || !styleFileName) {
    return '已迁移'
  }

  const sourceName = stripBvhExtension(sourceFileName)
  const styleName = stripBvhExtension(styleFileName)

  if (!sourceName || !styleName) {
    return '已迁移'
  }

  return `${sourceName}_${styleName}`
}

export function buildMotionFileLabel(
  fileName: string | null | undefined,
  fallbackLabel: string
): string {
  const trimmedFileName = fileName?.trim()
  return trimmedFileName || fallbackLabel
}

export function buildTransferResultLabel(
  resultName: string | null | undefined,
  sourceFileName: string | null | undefined,
  styleFileName: string | null | undefined
): string {
  const trimmedResultName = resultName?.trim()
  if (trimmedResultName) {
    return trimmedResultName
  }

  return buildResultLabel(sourceFileName, styleFileName)
}
