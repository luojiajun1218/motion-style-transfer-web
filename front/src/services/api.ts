import axios from 'axios'
import * as THREE from 'three'
import { debugLog } from '../utils/debug'

// 开发环境使用 Vite 代理（/api -> localhost:9000），生产环境需要配置实际后端地址
const API_BASE_URL = '/api'
let authToken: string | null = null

export const setApiAuthToken = (token: string | null): void => {
  authToken = token
}

const getAuthHeaders = () => (
  authToken ? { Authorization: `Bearer ${authToken}` } : undefined
)

export const getApiAuthHeaders = (): Record<string, string> => (
  authToken ? { Authorization: `Bearer ${authToken}` } : {}
)

export interface UploadResponse {
  id: string
  filename: string
  file_url: string
}

export interface TransferResponse {
  result_id: string
  result_url: string
  result_name: string
  style_name: string
}

export interface RequestCodeResponse {
  email: string
  expires_in_seconds: number
  debug_code?: string | null
}

export interface AuthSessionResponse {
  email: string
  token: string
}

// Parsed BVH data for local preview
export interface ParsedBVHData {
  skeleton: THREE.Skeleton
  clip: THREE.AnimationClip
  boneGroup: THREE.Group
  frameCount: number
  frameTime: number
  fps: number
  // Bounding box calculated at parse time
  bounds: THREE.Box3
  boundsSize: THREE.Vector3
  boundsCenter: THREE.Vector3
}

// Extended file state for each BVH (source/style/result)
export interface BVHFileState {
  file: File | null
  parsedData: ParsedBVHData | null
  fileId: string | null
  isUploaded: boolean
}

// Local file result (before upload)
export interface LocalFileResult {
  file: File
  parsedData: ParsedBVHData
}

// Calculate bounds from bone world positions AFTER applying animation frame 0
export function calculateBVHBounds(boneGroup: THREE.Group, clip?: THREE.AnimationClip): { bounds: THREE.Box3, size: THREE.Vector3, center: THREE.Vector3 } {
  const bounds = new THREE.Box3()

  // Traverse the boneGroup to find all bones
  const bones: THREE.Bone[] = []
  boneGroup.traverse((child) => {
    if (child instanceof THREE.Bone) {
      bones.push(child)
    }
  })

  // Apply animation frame 0 if clip provided - this sets correct bone rotations
  if (clip) {
    const mixer = new THREE.AnimationMixer(boneGroup)
    const action = mixer.clipAction(clip)
    action.play()
    action.paused = true
    action.time = 0
    mixer.update(0)  // Apply frame 0 state

    // Now get world positions with animation applied
    bones.forEach(bone => {
      const pos = new THREE.Vector3()
      bone.getWorldPosition(pos)
      bounds.expandByPoint(pos)
    })

    mixer.stopAllAction()
  } else {
    // Fallback: calculate world positions by accumulating parent positions
    // (used when no clip available - e.g., partially loaded data)
    bones.forEach(bone => {
      const worldPos = new THREE.Vector3()
      let current: THREE.Object3D | null = bone
      while (current) {
        worldPos.add(current.position)
        current = current.parent
      }
      bounds.expandByPoint(worldPos)
    })
  }

  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  bounds.getSize(size)
  bounds.getCenter(center)

  debugLog('calculateBVHBounds', `center=${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)} size=${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)}`)

  return { bounds, size, center }
}

export const uploadBVH = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() }
  })
  return response.data
}

export const requestLoginCode = async (email: string): Promise<RequestCodeResponse> => {
  const response = await axios.post<RequestCodeResponse>(`${API_BASE_URL}/auth/request-code`, { email })
  return response.data
}

export const verifyLoginCode = async (email: string, code: string): Promise<AuthSessionResponse> => {
  const response = await axios.post<AuthSessionResponse>(`${API_BASE_URL}/auth/verify-code`, { email, code })
  return response.data
}

export const getAuthSession = async (token: string): Promise<AuthSessionResponse> => {
  const response = await axios.get<AuthSessionResponse>(`${API_BASE_URL}/auth/session`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

export const logoutAuthSession = async (token: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/auth/logout`, undefined, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export const transferStyle = async (sourceId: string, styleId: string, styleName?: string): Promise<TransferResponse> => {
  const response = await axios.post<TransferResponse>(`${API_BASE_URL}/transfer`, {
    source: sourceId,
    style: styleId,
    style_name: styleName
  }, { headers: getAuthHeaders() })
  return response.data
}

export const getBVHUrl = (fileId: string): string => {
  return `${API_BASE_URL}/file/${fileId}`
}

// 预设风格相关类型
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

// 获取预设风格列表
export const getPresetStyles = async (): Promise<PresetStylesResponse> => {
  const response = await axios.get<PresetStylesResponse>(`${API_BASE_URL}/preset/styles`, {
    headers: getAuthHeaders()
  })
  return response.data
}

// 获取指定预设风格的 file_id
export const getPresetFileId = async (styleId: string): Promise<PresetFileIdResponse> => {
  const response = await axios.get<PresetFileIdResponse>(`${API_BASE_URL}/preset/${styleId}`, {
    headers: getAuthHeaders()
  })
  return response.data
}
