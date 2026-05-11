import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'most_custom_styles'
const MAX_PERSISTENT_STYLES = 4

export type CustomStyleStorage = 'temporary' | 'persistent'

export interface CustomStyle {
  name: string
  fileId: string
  addedAt: number
  storage: CustomStyleStorage
}

export interface UseCustomStylesReturn {
  customStyles: CustomStyle[]
  addStyle: (name: string, fileId: string, storage: CustomStyleStorage) => boolean
  renameStyle: (index: number, newName: string) => boolean
  deleteStyle: (index: number) => boolean
  canAddPersistent: boolean
  canAddMore: boolean
  persistentCount: number
}

type StoredCustomStyle = Omit<CustomStyle, 'storage'> & {
  storage?: CustomStyleStorage
}

export function normalizeStoredStyles(styles: StoredCustomStyle[]): CustomStyle[] {
  return styles
    .filter(style => Boolean(style.name && style.fileId && style.addedAt))
    .map(style => ({
      name: style.name,
      fileId: style.fileId,
      addedAt: style.addedAt,
      storage: style.storage === 'temporary' ? 'temporary' : 'persistent'
    }))
}

export function getPersistentStyleCount(styles: CustomStyle[]): number {
  return styles.filter(style => style.storage === 'persistent').length
}

export function buildNextCustomStyles(
  styles: CustomStyle[],
  name: string,
  fileId: string,
  storage: CustomStyleStorage
): { ok: boolean; styles: CustomStyle[]; reason?: 'duplicate' | 'persistent-limit' | 'empty-name' } {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { ok: false, styles, reason: 'empty-name' }
  }

  if (styles.some(style => style.name === trimmedName)) {
    return { ok: false, styles, reason: 'duplicate' }
  }

  if (storage === 'persistent' && getPersistentStyleCount(styles) >= MAX_PERSISTENT_STYLES) {
    return { ok: false, styles, reason: 'persistent-limit' }
  }

  return {
    ok: true,
    styles: [
      ...styles,
      {
        name: trimmedName,
        fileId,
        addedAt: Date.now(),
        storage
      }
    ]
  }
}

function readPersistentStyles(): CustomStyle[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as StoredCustomStyle[]
    return normalizeStoredStyles(parsed).filter(style => style.storage === 'persistent')
  } catch {
    return []
  }
}

function writePersistentStyles(styles: CustomStyle[]) {
  const persistentStyles = styles.filter(style => style.storage === 'persistent')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentStyles))
}

export function useCustomStyles(): UseCustomStylesReturn {
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([])

  useEffect(() => {
    setCustomStyles(readPersistentStyles())
  }, [])

  const saveStyles = (styles: CustomStyle[]) => {
    writePersistentStyles(styles)
    setCustomStyles(styles)
  }

  const addStyle = (name: string, fileId: string, storage: CustomStyleStorage): boolean => {
    const result = buildNextCustomStyles(customStyles, name, fileId, storage)
    if (!result.ok) {
      return false
    }

    saveStyles(result.styles)
    return true
  }

  const renameStyle = (index: number, newName: string): boolean => {
    const trimmedName = newName.trim()
    if (!trimmedName || index < 0 || index >= customStyles.length) {
      return false
    }

    if (customStyles.some((style, styleIndex) => styleIndex !== index && style.name === trimmedName)) {
      return false
    }

    const updated = customStyles.map((style, styleIndex) =>
      styleIndex === index ? { ...style, name: trimmedName } : style
    )
    saveStyles(updated)
    return true
  }

  const deleteStyle = (index: number): boolean => {
    if (index < 0 || index >= customStyles.length) {
      return false
    }

    const updated = customStyles.filter((_, styleIndex) => styleIndex !== index)
    saveStyles(updated)
    return true
  }

  const persistentCount = useMemo(() => getPersistentStyleCount(customStyles), [customStyles])
  const canAddPersistent = persistentCount < MAX_PERSISTENT_STYLES

  return {
    customStyles,
    addStyle,
    renameStyle,
    deleteStyle,
    canAddPersistent,
    canAddMore: canAddPersistent,
    persistentCount
  }
}
