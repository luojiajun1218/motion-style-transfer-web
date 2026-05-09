import { useRef } from 'react'
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader'
import * as THREE from 'three'
import { LocalFileResult, calculateBVHBounds } from '../types'
import { debugLog } from '../utils/debug'

interface FileUploaderProps {
  onSelect: (result: LocalFileResult) => void
  label: string
}

export default function FileUploader({ onSelect, label }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const loader = new BVHLoader()
      const result = loader.parse(text)

      const boneGroup = new THREE.Group()
      const rootBones = result.skeleton.bones.filter(
        (bone: THREE.Bone) => !bone.parent || !(bone.parent instanceof THREE.Bone)
      )
      rootBones.forEach((rootBone: THREE.Bone) => boneGroup.add(rootBone))

      boneGroup.rotation.y = -Math.PI / 2

      const fps = 30
      const frameTime = 1 / fps
      const frameCount = Math.ceil(result.clip.duration * fps)
      const { bounds, size, center } = calculateBVHBounds(boneGroup, result.clip)

      debugLog('FileUploader', 'BVH loaded', {
        name: file.name,
        bones: result.skeleton.bones.length,
        frames: frameCount,
        boundsSize: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`,
        boundsCenter: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`
      })

      onSelect({
        file,
        parsedData: {
          skeleton: result.skeleton,
          clip: result.clip,
          boneGroup,
          frameCount,
          frameTime,
          fps,
          bounds,
          boundsSize: size,
          boundsCenter: center
        }
      })
    } catch (error) {
      debugLog('FileUploader', 'Parse failed', { error: String(error) })
      alert('Invalid BVH file. Choose a valid BVH file and try again.')
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".bvh"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleClick}
        className="blender-btn"
      >
        {label}
      </button>
    </div>
  )
}
