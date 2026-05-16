import * as THREE from 'three'

export function createSkeletonLine(material: THREE.Material): THREE.Line {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))

  const line = new THREE.Line(geometry, material)
  line.frustumCulled = false

  return line
}
