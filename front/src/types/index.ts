// 公共类型定义

import type { Skeleton, AnimationClip, Group, Box3, Vector3 } from 'three'

// BVH 文件状态（基础）
export interface BVHFileState {
  file: File | null
  parsedData: ParsedBVHData | null
  fileId: string | null
  isUploaded: boolean
}

// BVH 文件状态（带角色）
export interface BVHFileWithRole extends BVHFileState {
  role: 'unassigned' | 'source' | 'style'
}

// Parsed BVH data for local preview
export interface ParsedBVHData {
  skeleton: Skeleton
  clip: AnimationClip
  boneGroup: Group
  frameCount: number
  frameTime: number
  fps: number
  bounds: Box3
  boundsSize: Vector3
  boundsCenter: Vector3
}

// Local file result (before upload)
export interface LocalFileResult {
  file: File
  parsedData: ParsedBVHData
}

// API Response types
export interface UploadResponse {
  id: string
  filename: string
  file_url: string
}

export interface TransferResponse {
  result_id: string
  result_url: string
}

// Preset style types
export interface PresetStyle {
  id: string
  name: string
  file_id: string
}

export interface PresetStylesResponse {
  emotion: PresetStyle[]
  body: PresetStyle[]
}

export interface PresetFileIdResponse {
  file_id: string
}

// Re-export API functions from api.ts
export { uploadBVH, transferStyle, getBVHUrl, getPresetStyles, getPresetFileId, calculateBVHBounds } from '../services/api'