# Character Set Limit: 50 → 150 + Frontend Enforcement

## Summary

Raise the max characters-per-set from 50 to 150 and add proper frontend feedback so users can't accidentally hit the limit without warning.

## Backend

File: `backend/internal/services/player_service.go`

- Change the `> 50` guard to `> 150` in both `CreateSet` (line ~137) and `UpdateSet` (line ~220)
- Error message updates to match: "a set can have at most 150 characters"

## Frontend

### `ImageCropperIntegration.js`

Add a `disabled` boolean prop (default `false`). When `true`:
- Drop zone rendered with `opacity: 0.5`, `pointerEvents: "none"`, `cursor: "default"`
- `onDrop`, `onDragOver`, `onDragLeave` handlers become no-ops
- File input not clickable (parent div click handler skipped when disabled)

### Both `create/page.js` and `edit/[setId]/page.js`

Add `const MAX_CHARACTERS = 150`.

Counter display (replaces the current `{totalCount} / {MIN_CHARACTERS} minimum`):

| State | Condition | Color | Text |
|---|---|---|---|
| Below min | `totalCount < MIN_CHARACTERS` | red (`T.stateOut`) | `{totalCount} / 6 minimum` |
| Normal | `6 ≤ totalCount ≤ 139` | muted (`T.text400`) | `{totalCount} / 150` |
| Warning | `140 ≤ totalCount ≤ 149` | amber (`#D97706`) | `{totalCount} / 150` |
| At limit | `totalCount >= 150` | red (`T.stateOut`) | `{totalCount} / 150 — limit reached` |

Submit button disabled when `totalCount < MIN_CHARACTERS || totalCount > MAX_CHARACTERS`.

Pass `disabled={totalCount >= MAX_CHARACTERS}` to `<ImageCropperIntegration />`.

## Files Changed

1. `backend/internal/services/player_service.go`
2. `frontend/src/app/create/ImageCropperIntegration.js`
3. `frontend/src/app/create/page.js`
4. `frontend/src/app/edit/[setId]/page.js`
