# Two-Pane Source/Result Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-pane source/result BVH comparison viewer and remove style files from both the main viewer and right file list.

**Architecture:** `Home.tsx` keeps owning transfer state and playback. A new `SourceResultCanvas` component renders two independent motion panes with separate cameras and controls. A small `rightSidebarFiles` utility filters style files out while preserving original indices for selection/removal.

**Tech Stack:** React, TypeScript, Vite, `@react-three/fiber`, `@react-three/drei`, Three.js, existing `tsx` script tests.

---

## File Structure

- Create `front/src/utils/rightSidebarFiles.ts`: filters right-sidebar-visible files and keeps original indices.
- Create `front/tests/rightSidebarFiles.test.ts`: TDD coverage for excluding style files and preserving indices.
- Modify `front/tests/runAll.ts`: include the new utility test.
- Create `front/src/components/SourceResultCanvas.tsx`: two-pane viewer and single-pane loading/rendering logic.
- Modify `front/src/pages/Home.tsx`: use `SourceResultCanvas` instead of `UnifiedCanvas`.
- Modify `front/src/components/RightSidebar.tsx`: render filtered file entries using original indices.
- Modify `front/src/index.css`: add two-pane canvas layout and pane overlay styles.

---

### Task 1: Right Sidebar Style Filtering

**Files:**
- Create: `front/src/utils/rightSidebarFiles.ts`
- Create: `front/tests/rightSidebarFiles.test.ts`
- Modify: `front/tests/runAll.ts`
- Modify: `front/src/components/RightSidebar.tsx`

- [ ] **Step 1: Write the failing utility test**

Create `front/tests/rightSidebarFiles.test.ts`:

```ts
import {
  buildRightSidebarFileEntries,
  type RightSidebarFile,
} from '../src/utils/rightSidebarFiles'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const files: RightSidebarFile[] = [
  { role: 'source' },
  { role: 'style' },
  { role: 'unassigned' },
  { role: 'style' },
]

const entries = buildRightSidebarFileEntries(files)

assertEqual(entries.length, 2, 'style files are filtered from the right sidebar')
assertEqual(entries[0]?.file.role, 'source', 'source remains visible')
assertEqual(entries[0]?.originalIndex, 0, 'source keeps original index')
assertEqual(entries[1]?.file.role, 'unassigned', 'unassigned non-style file remains visible')
assertEqual(entries[1]?.originalIndex, 2, 'unassigned file keeps original index')
```

Add to `front/tests/runAll.ts`:

```ts
import './rightSidebarFiles.test'
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- rightSidebarFiles`

Expected: FAIL because `../src/utils/rightSidebarFiles` does not exist.

- [ ] **Step 3: Implement the utility**

Create `front/src/utils/rightSidebarFiles.ts`:

```ts
export interface RightSidebarFile {
  role: 'source' | 'style' | 'unassigned'
}

export interface RightSidebarFileEntry<TFile extends RightSidebarFile> {
  file: TFile
  originalIndex: number
}

export function buildRightSidebarFileEntries<TFile extends RightSidebarFile>(
  files: TFile[]
): RightSidebarFileEntry<TFile>[] {
  return files
    .map((file, originalIndex) => ({ file, originalIndex }))
    .filter(entry => entry.file.role !== 'style')
}
```

- [ ] **Step 4: Wire RightSidebar to the filtered entries**

In `front/src/components/RightSidebar.tsx`, import `buildRightSidebarFileEntries`, compute `fileEntries`, use `fileEntries.length` for empty state, and render `fileEntries.map(({ file: bvhFile, originalIndex }) => ...)`. Use `originalIndex` for selected state, callbacks, and fallback keys.

- [ ] **Step 5: Verify the utility test passes**

Run: `npm test -- rightSidebarFiles`

Expected: PASS with no thrown errors.

---

### Task 2: Two-Pane Viewer Component

**Files:**
- Create: `front/src/components/SourceResultCanvas.tsx`
- Modify: `front/src/pages/Home.tsx`
- Modify: `front/src/index.css`

- [ ] **Step 1: Create the viewer component**

Create `front/src/components/SourceResultCanvas.tsx` with:

- `SourceResultCanvas` outer component.
- `MotionPane` inner component with one `<Canvas>`, `SkeletonGroup`, grid, camera fit, `OrbitControls`.
- Result remote loading copied from the current guarded `UnifiedCanvas` behavior.
- No style file rendering and no unassigned file rendering.

- [ ] **Step 2: Replace the Home canvas usage**

In `front/src/pages/Home.tsx`, replace the `UnifiedCanvas` import and JSX with `SourceResultCanvas`. Pass current `bvhFiles`, result state, result label, frame index, selected skeleton, and selection callbacks.

- [ ] **Step 3: Add two-pane styles**

In `front/src/index.css`, update `.canvas-shell` to support nested panes and add:

```css
.comparison-canvas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.motion-pane {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--canvas-bg), var(--canvas-bg-deep));
}

.motion-pane.selected {
  outline: 2px solid var(--accent-line);
  outline-offset: -2px;
}

.motion-pane-header {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(18, 22, 27, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 700;
}

.motion-pane-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (max-width: 920px) {
  .comparison-canvas {
    grid-template-columns: 1fr;
  }

  .motion-pane {
    min-height: 320px;
  }
}
```

- [ ] **Step 4: Run TypeScript build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

---

### Task 3: Full Verification

**Files:**
- Verify all modified frontend files.

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`

Expected: all test scripts complete without thrown errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Review git diff**

Run: `git diff --stat` and `git diff -- front/src front/tests docs/superpowers/plans/2026-05-11-two-pane-source-result-viewer.md`.

Expected: diff only covers the planned files and no `.superpowers/` files are staged.

---

## Self-Review

Spec coverage:

- Two independent source/result panes: Task 2.
- Style not in main viewer: Task 2 only passes source/result to panes.
- Style not in right file list: Task 1.
- Shared playback frame with independent camera controls: Task 2.
- Result loading guard preserved: Task 2.
- Verification: Task 3.

Placeholder scan: no TBD/TODO/fill-in-later instructions remain.

Type consistency: `RightSidebarFile.role` matches `BVHFileWithRole.role`; selection names match existing `SkeletonSelection`.
