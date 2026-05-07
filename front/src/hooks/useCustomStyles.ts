import { useState, useEffect } from 'react'

const STORAGE_KEY = 'most_custom_styles'
const MAX_CUSTOM_STYLES = 4

export interface CustomStyle {
  name: string
  fileId: string
  addedAt: number
}

export interface UseCustomStylesReturn {
  customStyles: CustomStyle[]
  addStyle: (name: string, fileId: string) => boolean
  renameStyle: (index: number, newName: string) => boolean
  deleteStyle: (index: number) => boolean
  canAddMore: boolean
}

export function useCustomStyles(): UseCustomStylesReturn {
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([])

  // 从 localStorage 加载
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CustomStyle[]
        setCustomStyles(parsed)
      } catch {
        setCustomStyles([])
      }
    }
  }, [])

  // 保存到 localStorage
  const saveToStorage = (styles: CustomStyle[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(styles))
    setCustomStyles(styles)
  }

  // 添加风格
  const addStyle = (name: string, fileId: string): boolean => {
    if (customStyles.length >= MAX_CUSTOM_STYLES) {
      return false
    }

    // 检查是否已存在同名风格
    if (customStyles.some(s => s.name === name)) {
      return false
    }

    const newStyle: CustomStyle = {
      name,
      fileId,
      addedAt: Date.now()
    }

    saveToStorage([...customStyles, newStyle])
    return true
  }

  // 重命名风格
  const renameStyle = (index: number, newName: string): boolean => {
    if (index < 0 || index >= customStyles.length) {
      return false
    }

    // 检查新名称是否已存在
    if (customStyles.some((s, i) => i !== index && s.name === newName)) {
      return false
    }

    const updated = customStyles.map((s, i) =>
      i === index ? { ...s, name: newName } : s
    )
    saveToStorage(updated)
    return true
  }

  // 删除风格
  const deleteStyle = (index: number): boolean => {
    if (index < 0 || index >= customStyles.length) {
      return false
    }

    const updated = customStyles.filter((_, i) => i !== index)
    saveToStorage(updated)
    return true
  }

  return {
    customStyles,
    addStyle,
    renameStyle,
    deleteStyle,
    canAddMore: customStyles.length < MAX_CUSTOM_STYLES
  }
}