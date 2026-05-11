# Two-Pane Source/Result Viewer Design

## Goal

Replace the current shared 3D viewer with a two-window comparison view:

- Left window: current source motion.
- Right window: current transfer result.
- Style files are not rendered in the main viewer and are not listed in the right file list.

The feature is for comparing the original source motion against the transferred result. Style remains an input to transfer workflows, not a comparison target.

## Current Context

The React frontend currently renders `UnifiedCanvas` inside `Home.tsx`. `UnifiedCanvas` places source, style, result, and unassigned files in one shared `@react-three/fiber` canvas using horizontal offsets. It also owns remote result loading through `resultFileId`, `getBVHUrl`, authenticated loader headers, and `isCurrentResultLoad`.

The right sidebar currently receives all `bvhFiles`, plus `resultFileName`, and can show source/style/unassigned files and the current result.

## Proposed Approach

Use two independent Three.js canvases inside the main canvas area.

The outer viewer component arranges two equal columns:

- `Source` pane receives only the active source file.
- `Result` pane receives only the active result data or result file id.

Each pane owns its own camera and `OrbitControls`, so source and result can be rotated, panned, and zoomed independently. Both panes receive the same `frameIndex`, so playback stays synchronized through the existing playback bar.

## Component Design

### Two-Pane Container

Replace `UnifiedCanvas` usage in `Home.tsx` with a source/result comparison component.

Responsibilities:

- Find the active source file from `bvhFiles`.
- Pass source parsed data and label to the left pane.
- Pass result parsed data, result file id, and result label to the right pane.
- Route pane clicks to existing selection state:
  - source pane selects `source`
  - result pane selects `result`
- Render an empty state per pane when its data is absent.

### Single Motion Pane

Create a reusable single-pane viewer component for one skeleton.

Props should include:

- `title`: display label for the pane, such as `Source` or `Result`.
- `bvhData`: parsed BVH data when already available.
- `fileId`: optional remote BVH id for result loading.
- `fileName`: display label for the rendered skeleton.
- `frameIndex`: shared playback frame.
- `color`: source/result color.
- `selected`: whether this pane is selected.
- `emptyMessage`: pane-specific empty state text.
- `onSelect`: click handler for pane selection.

The pane renders one `<Canvas>`, one `SkeletonGroup`, one grid, one camera controller, and one `OrbitControls`. It does not know about style files or unassigned files.

### Result Loading

Keep the current guarded remote result loading behavior.

The result pane may load BVH data from `resultFileId` when `result.parsedData` is not available. It must keep using:

- authenticated request headers from `getApiAuthHeaders`
- `getBVHUrl`
- `calculateBVHBounds`
- `isCurrentResultLoad`

The stale-load guard remains necessary because users can trigger transfers close together, and an old async load must not overwrite the current result.

## Data Flow

`Home.tsx` remains the owner of:

- uploaded/imported BVH files
- transfer result state
- selected file index
- selected skeleton
- playback frame and playback controls
- result download target

The two-pane viewer is presentational plus result loading. It does not mutate the file list and does not trigger transfers.

Source flow:

1. User imports a source motion.
2. `Home.tsx` marks it as `role: 'source'`.
3. The left pane receives that parsed data and renders it.

Result flow:

1. User runs style transfer.
2. `Home.tsx` stores `result.fileId` and `resultName`.
3. The right pane loads the remote BVH and renders it.
4. Playback uses the same `frameIndex` as source.

Style flow:

1. Style is selected through the existing left-side style workflow.
2. Style may still be stored internally as transfer input if required by existing code.
3. Style is filtered out of the right sidebar file list and never passed to the main viewer.

## Right Sidebar Behavior

The right sidebar should no longer show style files.

It should show:

- source file
- unassigned non-style files if the app still creates any
- current result
- archived previous results

It should not show:

- files whose role is `style`

If a style file is selected internally for transfer, that state should remain controlled by the transfer/style-selection UI, not the right file list.

## Selection Behavior

Supported main-view selections:

- `source`
- `result`
- no selection

The main viewer no longer supports selecting style or unassigned skeletons by clicking in 3D, because those skeletons are not rendered there.

Right sidebar selection should still support source and result. If style files are present in state for transfer purposes, they are filtered out before rendering the right sidebar and cannot be selected there.

## Layout

Desktop:

- The central canvas area becomes a two-column grid.
- Each pane fills half the available width with a stable gap.
- Each pane has a compact title/status overlay.

Mobile/narrow screens:

- The two panes stack vertically.
- Each pane keeps a stable minimum height.
- Playback controls stay unchanged.

## Empty and Loading States

Source pane:

- Empty: `Import Source BVH`

Result pane:

- Empty: `Run style transfer to show Result`
- Loading: `Loading Result...`

These states are per-pane overlays, not global full-canvas states.

## Error Handling

If remote result loading fails:

- Show an error only in the result pane.
- Keep the source pane usable.
- Do not clear the current source or file list.
- Keep logging the load failure for debugging.

If source is missing:

- Result pane may still show an existing result if present.
- Source pane shows its empty state.

## Testing

Focused frontend tests should cover:

- Right sidebar file filtering excludes `role: 'style'`.
- Source/result selection still resolves correctly.
- Result download selection still works when `selectedSkeleton === 'result'`.
- Result label behavior remains unchanged.

Verification should include:

- Run the existing frontend test suite.
- Run TypeScript build or the project’s existing frontend validation command.

## Out of Scope

- Changing transfer API behavior.
- Changing style library behavior beyond removing style from the right file list and main viewer.
- Synchronizing camera controls between panes.
- Rendering side-by-side style comparisons.
- Refactoring unrelated sidebar or authentication code.
