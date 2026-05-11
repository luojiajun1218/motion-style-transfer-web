# Remove Right BVH Sidebar Design

## Goal

Remove the right-side BVH file panel and redistribute its behavior into the areas where users already work:

- BVH file selection and preview live with each preview window.
- Download stays as a single action for the currently selected BVH.
- The main viewer gains the width previously occupied by the right panel.

The design keeps the current source/result comparison model, but removes the misleading global BVH list. The old list looked like a generic file manager while actually filtering style files and appending the current result through separate logic.

## Current Context

`Home.tsx` currently owns BVH files, result state, playback state, selection state, and download behavior.

`RightSidebar.tsx` currently receives `bvhFiles`, `selectedFileIndex`, `resultFileName`, and `selectedSkeleton`. It renders a right-side list and a download button. The list is built through `buildRightSidebarFileEntries`, which filters out `role: 'style'` files. The current result is not part of that helper and is rendered as a separate item after the file list.

This makes the right panel hard to generalize:

- It is not an all-BVH list because style files are excluded.
- It is not only a source list because result is appended.
- It owns file selection UI even though selection affects specific preview panes.
- Its download button depends on whichever item the global selection model points at.

## Proposed Approach

Remove `RightSidebar` from the page layout.

The page becomes a two-column application layout:

- Left operation area: import, style transfer controls, and the single download action.
- Main preview area: source and result preview panes, each with its own single-column BVH list.

Desktop layout:

```text
Left operation area | Main preview area
```

Main preview area when panes are side-by-side:

```text
Source BVH list      Result BVH list
Source preview pane  Result preview pane
```

Narrow layout:

```text
Left operation area
Source BVH list
Source preview pane
Result BVH list
Result preview pane
```

## Left Operation Area

The left area keeps the existing import and style-transfer workflow. It also receives the download button that used to be in the right sidebar.

Recommended ordering:

1. Import source/action BVH.
2. Style library and transfer controls.
3. Download current BVH button at the bottom of the button/action area.

The download button remains a single button:

```text
Download selected BVH
```

Behavior:

- Disabled when no downloadable BVH is selected.
- Downloads the currently selected BVH.
- The selected BVH may come from the source list or result list.
- It does not introduce separate source/result download buttons.

This preserves the current mental model while moving the action into the persistent operation area.

## Preview Pane File Lists

Each preview window owns one single-column scrolling list.

### Source Pane List

The source pane list controls the source preview pane.

It should show BVH files that can be previewed as source/action content:

- The active source file.
- Imported non-style BVH files that are available for source preview.
- Archived or unassigned input BVH files if the application keeps them in `bvhFiles`.

It should not show style-only entries from the style library.

Row behavior:

- Clicking a row previews that BVH in the source pane.
- Clicking a row updates the global selected BVH used by the download button.
- The active row is visually selected.
- A row-level remove button deletes that BVH from the file list when deletion is allowed.

### Result Pane List

The result pane list controls the result preview pane.

It should show result BVH entries:

- The current transfer result.
- Archived previous transfer results.

Row behavior:

- Clicking a row previews that BVH in the result pane.
- Clicking a row updates the global selected BVH used by the download button.
- The current latest result should be visually distinguishable from older archived results.
- A row-level remove button deletes archived result entries when deletion is allowed.
- The current remote result should only expose deletion if the existing result state can be safely cleared.

## Selection Model

Replace the right-sidebar-driven selection flow with pane-list-driven selection.

The app should maintain one global selected BVH target for cross-cutting actions such as download. Conceptually:

```ts
type SelectedBvhTarget =
  | { kind: 'source-file'; fileIndex: number }
  | { kind: 'result-current' }
  | { kind: 'result-archive'; fileIndex: number }
  | null
```

The exact TypeScript shape can follow existing local patterns, but the important boundary is:

- Pane lists choose what each pane previews.
- The download button reads the global selected BVH target.
- Style selection for transfer remains separate from BVH preview selection.

Existing `selectedSkeleton` behavior may still be needed by the 3D viewer for pane highlighting. If retained, it should be derived from pane selection rather than from a global right-sidebar row.

## Data Flow

Source flow:

1. User imports a source/action BVH from the left area.
2. The app stores it in `bvhFiles`.
3. The source pane list displays it.
4. Clicking it renders it in the source pane and makes it the selected downloadable BVH.

Result flow:

1. User runs style transfer.
2. The app stores the current result in result state.
3. The result pane list displays the current result.
4. If another result already exists, the app may archive the previous result into the result list using the existing archive behavior.
5. Clicking a result row renders it in the result pane and makes it the selected downloadable BVH.

Download flow:

1. User selects a BVH row in either preview pane list.
2. The left-side download button becomes enabled.
3. Clicking the button downloads the selected target through the existing local-file or remote-file download utilities.

Style flow:

1. Style remains selected through the left style workflow.
2. Style files do not appear in source or result pane lists unless a future feature explicitly adds style preview.
3. Transfer input state remains separate from preview and download selection.

## Component Design

### Remove Right Sidebar

`RightSidebar.tsx` and `RightSidebar.css` should no longer be used by `Home.tsx`.

The helper `buildRightSidebarFileEntries` should be removed or replaced by pane-specific list builders. Its current filtering behavior is too specific to keep as a generic BVH-list abstraction.

### Pane BVH List Component

Create a reusable compact list component for preview panes.

Responsibilities:

- Render a single-column scrollable list.
- Show filename, short status label, and optional remove action.
- Expose row click and remove callbacks.
- Support selected and disabled row states.

The component should not know about transfer APIs or download mechanics. It receives already-built entries from `Home.tsx` or a small utility.

### Pane-Specific Entry Builders

Use small utilities to build entries for each pane:

- Source pane entries from source/action-capable files.
- Result pane entries from current result plus archived results.

These utilities should preserve original indexes where needed for deletion and download.

### Download Button

Move the existing download button into the left operation area.

The button should call the existing selected-download handler after that handler is updated to read the new selected BVH target.

## Layout

Removing the right panel should let the main preview area expand.

Desktop:

- Left operation area keeps its current width range.
- Main area takes the remaining width.
- Source and result panes remain side-by-side when there is enough horizontal space.
- Each pane list sits directly above its matching preview pane.

Narrow screens:

- Source and result panes stack vertically.
- Each list remains directly above its pane.
- The download button stays in the left/operation area according to the existing responsive layout.

The pane lists should have stable height constraints so a long file history scrolls inside the list without pushing the preview panes out of view.

## Empty States

Source list:

- Empty state: no source BVH imported.

Source pane:

- Empty state remains focused on importing a source/action BVH.

Result list:

- Empty state: no transfer result yet.

Result pane:

- Empty state remains focused on running transfer.

Download button:

- Disabled when no selected BVH target exists or the selected target cannot be downloaded.

## Error Handling

If a selected remote result fails to load:

- Show the load error in the result pane.
- Keep the selected row visible.
- Keep the source pane usable.
- Disable download only if the selected target cannot produce a valid local or remote download target.

If a selected file is removed:

- Clear selected BVH if the removed row was selected.
- Clear or update pane preview selection consistently.
- Do not affect the other pane unless it was previewing the removed file.

If a transfer result is replaced:

- Archive the previous result using the existing archive behavior when possible.
- Select the new current result after transfer completes.
- Keep old archived results in the result list.

## Testing

Focused frontend tests should cover:

- Source pane list excludes style entries.
- Result pane list includes current result and archived results.
- Selecting a source-list row updates the selected download target.
- Selecting a result-list row updates the selected download target.
- Download button is disabled with no selected BVH and enabled with a downloadable selected BVH.
- Removing a selected row clears or updates selection without leaving stale indexes.

Verification should include:

- Existing frontend test suite.
- TypeScript build or the repository's existing frontend validation command.
- Manual check that the right panel is gone and the main preview area expands.

## Out of Scope

- Changing transfer API behavior.
- Adding style BVH preview.
- Adding multiple download buttons.
- Reworking authentication or remote BVH storage.
- Synchronizing camera controls between source and result panes.
- Redesigning the style library beyond relocating the download action into the left operation area.
