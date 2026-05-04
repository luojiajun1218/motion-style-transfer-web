declare module 'three/examples/jsm/loaders/BVHLoader' {
  import { Loader, LoadingManager } from 'three'
  import { Skeleton, AnimationClip, Group } from 'three'

  interface BVHLoaderResult {
    skeleton: Skeleton
    clip: AnimationClip
  }

  class BVHLoader extends Loader {
    constructor(manager?: LoadingManager)
    load(
      url: string,
      onLoad: (result: BVHLoaderResult) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void
    parse(text: string): BVHLoaderResult
  }

  export { BVHLoader, BVHLoaderResult }
}