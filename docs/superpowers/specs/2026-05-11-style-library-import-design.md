# Style Library Import Design

Date: 2026-05-11

## Goal

Simplify the motion style transfer workflow by removing explicit source/style role assignment and the standalone transfer button. Users should import a motion as the active source action, import style BVH files directly into the custom style library, then click a style to run transfer.

## Current Behavior

- BVH files are imported into a shared file list with role `unassigned`.
- The user selects a file and clicks `Set as source action` or `Set as style`.
- The user clicks `Start transfer` after both roles are assigned.
- Custom styles are stored by `useCustomStyles` in `localStorage` with a persistent limit of 4.
- Preset styles already trigger transfer directly when clicked, using the current source file.

## Target Behavior

The left sidebar exposes two import actions:

- `Import Motion`
- `Import Style`

`Import Motion` loads a source motion into the main workspace. It is visible in the canvas, selectable in the right sidebar, and used as the source for transfers.

`Import Style` opens a style import dialog. The dialog asks for:

- Style name
- Save mode: `Temporary` or `Persistent`
- Confirmation to import

After confirmation, the BVH style file is uploaded and added to the custom style library. It is not added to the main file list, not rendered in the canvas, and not included in playback frame calculations.

Clicking any preset style or custom style starts transfer immediately with the current source motion. If there is no source motion, the UI shows a clear prompt to import a motion first.

The standalone `Start transfer` button is removed.

## Temporary And Persistent Styles

Custom styles support two storage modes:

- Temporary styles live only in React state. They disappear when the page refreshes.
- Persistent styles are saved to `localStorage`. They remain after refresh in the same browser.

Persistent styles keep the existing maximum of 4 entries. Temporary styles do not count toward that limit.

Style names are unique across both temporary and persistent styles. This avoids ambiguous style buttons in the custom library.

The custom style library shows each style's storage status. Temporary styles should display a small `Temporary` marker. Persistent styles may display `Persistent` or remain unmarked if the visual design is cleaner, but the storage mode must be obvious enough that temporary styles are not mistaken for saved styles.

## UI Changes

### Left Sidebar

Replace the current generic import and role sections with:

- A file section containing `Import Motion`.
- A style library section containing preset styles, custom styles, and `Import Style`.

Remove:

- `Set as source action`
- `Set as style`
- Standalone transfer section and `Start transfer`

### Style Import Dialog

The dialog appears after clicking `Import Style`.

Fields:

- Style name text input
- Save mode segmented control or radio group: `Temporary`, `Persistent`
- Cancel button
- Confirm import button

Validation:

- Style name is required.
- Style name must not duplicate any temporary or persistent custom style.
- Persistent mode is disabled or blocked with a clear message when 4 persistent styles already exist.
- Invalid BVH files show the existing invalid-file error flow.
- Upload or transfer errors use the existing transfer progress/error messaging conventions.

### Custom Style Library

Custom style entries remain clickable transfer triggers.

Each entry supports:

- Apply style by clicking the style name/button.
- Rename.
- Delete.
- Visible storage status for temporary styles.

Renaming must keep names unique across temporary and persistent custom styles.

Deleting a temporary style removes it from state. Deleting a persistent style removes it from state and `localStorage`.

## Data Model

Extend `CustomStyle` with a storage mode:

```ts
type CustomStyleStorage = 'temporary' | 'persistent'

interface CustomStyle {
  name: string
  fileId: string
  addedAt: number
  storage: CustomStyleStorage
}
```

For backward compatibility, existing `localStorage` entries without `storage` are treated as `persistent`.

`useCustomStyles` should manage both temporary and persistent styles through one returned list, while only persisting the persistent subset.

Suggested hook capabilities:

- `customStyles`: combined temporary and persistent styles.
- `persistentCount`: number of persistent styles.
- `canAddPersistent`: true when persistent count is below 4.
- `addStyle(name, fileId, storage)`.
- `renameStyle(index, newName)`.
- `deleteStyle(index)`.

## Data Flow

### Import Motion

1. User clicks `Import Motion`.
2. User selects a BVH file.
3. The file is parsed locally.
4. The source motion state is replaced or upserted.
5. The source appears in the canvas and right sidebar.
6. Previous transfer result can remain visible until the next transfer, unless implementation chooses to clear it to avoid stale comparisons.

### Import Style

1. User clicks `Import Style`.
2. User selects a BVH file.
3. The file is parsed enough to validate it as BVH.
4. Dialog collects style name and storage mode.
5. The file is uploaded.
6. A custom style record is created with `fileId` and storage mode.
7. The style appears in the custom style library.
8. The style file is never added to `bvhFiles`.

### Transfer

1. User clicks a preset or custom style.
2. If no source motion exists, show a prompt to import a motion.
3. Upload the source motion if needed.
4. Call the transfer API with source `fileId` and style `fileId`.
5. Load result into the result pane.
6. Archive any previous result using the existing result archive behavior.
7. Show progress and errors through the existing transfer progress modal.

## Component Impact

Expected affected frontend modules:

- `front/src/pages/Home.tsx`
  - Replace role assignment state flow with direct source import flow.
  - Remove `handleRoleAssign` and standalone `handleTransfer` usage from the left sidebar.
  - Keep shared transfer completion and result archive behavior.

- `front/src/components/LeftSidebar.tsx`
  - Replace role and transfer sections with motion import and style library flow.
  - Pass separate handlers for importing motion and importing style.

- `front/src/components/FileUploader.tsx`
  - Reuse for both motion and style imports if the caller can control the resulting behavior.
  - It may remain a generic BVH parser/uploader input.

- `front/src/components/StyleLibrary.tsx`
  - Own the `Import Style` action and dialog.
  - Add temporary/persistent choice.
  - Render temporary markers.
  - Continue direct transfer on preset/custom style click.

- `front/src/hooks/useCustomStyles.ts`
  - Add storage mode support.
  - Keep persistent styles in `localStorage`.
  - Keep temporary styles in memory.
  - Preserve backward compatibility for existing saved styles.

- `front/src/types/index.ts`
  - Add style storage type if shared across modules.

- `front/src/components/TransferButton.tsx`
  - Remove if no longer referenced.

## Testing

Update or add frontend unit tests for:

- Adding a temporary style does not write it to `localStorage`.
- Adding a persistent style writes it to `localStorage`.
- Existing stored styles without `storage` load as persistent.
- Persistent styles are limited to 4.
- Temporary styles do not count toward the persistent limit.
- Duplicate names are rejected across temporary and persistent styles.
- Renaming preserves name uniqueness across both storage modes.

Manual verification:

- Import a motion and confirm it appears in the canvas.
- Import a temporary style and confirm it appears in the custom style library.
- Refresh the page and confirm the temporary style disappears.
- Import a persistent style and confirm it remains after refresh.
- Click a custom style and confirm transfer runs without pressing a start button.
- Confirm style BVH files never appear in the canvas or right sidebar file list.

## Out Of Scope

- Account-level persistent style storage on the backend.
- Previewing imported style BVH files.
- Automatic inference of source versus style from BVH file contents.
- Changing preset style behavior beyond aligning it with the direct-click transfer model.
