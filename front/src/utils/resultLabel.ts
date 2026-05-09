const BVH_EXTENSION = /\.bvh$/i

function stripBvhExtension(fileName: string): string {
  return fileName.trim().replace(BVH_EXTENSION, '')
}

export function buildResultLabel(
  sourceFileName: string | null | undefined,
  styleFileName: string | null | undefined
): string {
  if (!sourceFileName || !styleFileName) {
    return 'Styled'
  }

  const sourceName = stripBvhExtension(sourceFileName)
  const styleName = stripBvhExtension(styleFileName)

  if (!sourceName || !styleName) {
    return 'Styled'
  }

  return `${sourceName}_${styleName}`
}
