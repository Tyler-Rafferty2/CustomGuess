# Character Set Limit 150 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the character-per-set cap from 50 to 150 and enforce it clearly in the frontend with a live counter and disabled upload zone.

**Architecture:** Backend validation constants are updated in one service file. The shared `ImageCropperIntegration` component gains a `disabled` prop that greys out and deactivates the drop zone. Both set-creation and set-editing pages add a `MAX_CHARACTERS` constant, update their counter display, and pass `disabled` to the cropper.

**Tech Stack:** Go (backend), Next.js App Router (frontend), inline styles + Lucide icons

## Global Constraints

- Colors: use existing `T` token object already defined in each file — `T.stateOut` (#C0392B) for errors, `T.text400` (#A0937F) for muted, amber `#D97706` for warning
- `MIN_CHARACTERS = 6` stays unchanged
- `MAX_CHARACTERS = 150` is new
- Warning threshold: 140 (10 or fewer remaining)
- No new dependencies

---

### Task 1: Update backend validation limit

**Files:**
- Modify: `backend/internal/services/player_service.go` (lines 137–138 and 219–220)

**Interfaces:**
- Produces: backend rejects sets with > 150 characters with message `"a set can have at most 150 characters"`

- [ ] **Step 1: Update CreateSet guard**

In `player_service.go` at line 137, change:
```go
if len(characters) > 50 {
    return nil, fmt.Errorf("a set can have at most 50 characters")
}
```
to:
```go
if len(characters) > 150 {
    return nil, fmt.Errorf("a set can have at most 150 characters")
}
```

- [ ] **Step 2: Update UpdateSet guard**

In the same file at line 219, change:
```go
if totalCount > 50 {
    return nil, fmt.Errorf("a set can have at most 50 characters")
}
```
to:
```go
if totalCount > 150 {
    return nil, fmt.Errorf("a set can have at most 150 characters")
}
```

- [ ] **Step 3: Verify no other occurrences of the old limit**

```bash
grep -n "50 characters\|> 50" backend/internal/services/player_service.go
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/services/player_service.go
git commit -m "raise character set limit from 50 to 150"
```

---

### Task 2: Add `disabled` prop to ImageCropperIntegration

**Files:**
- Modify: `frontend/src/app/create/ImageCropperIntegration.js`

**Interfaces:**
- Consumes: new `disabled` boolean prop (default `false`)
- Produces: when `disabled={true}`, drop zone is visually greyed out and all interaction is blocked

- [ ] **Step 1: Add `disabled` to the function signature**

Change line 18 from:
```js
export default function ImageCropperIntegration({ images, setImages, triggerEdit = null }) {
```
to:
```js
export default function ImageCropperIntegration({ images, setImages, triggerEdit = null, disabled = false }) {
```

- [ ] **Step 2: Update the drop zone div to respect `disabled`**

Replace the drop zone `<div>` (starting at line 195) with this version that guards clicks, drops, and drag events:
```js
<div
    onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
    onDrop={(e) => { if (!disabled) handleDrop(e); else e.preventDefault(); }}
    onDragOver={(e) => { e.preventDefault(); if (!disabled) setDropHover(true); }}
    onDragLeave={() => { if (!disabled) setDropHover(false); }}
    style={{
        border: `2px dashed ${disabled ? T.border : dropHover ? T.accent : T.border}`,
        borderRadius: 6,
        padding: "28px 24px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? T.surface2 : dropHover ? T.accentLight : T.surface1,
        transition: "all 150ms ease-out",
        opacity: disabled ? 0.55 : 1,
    }}
>
```

Note: `T.surface2` is `"#E8E0D8"` — already defined in the `T` object at the top of the file.

- [ ] **Step 3: Update icon and text colors when disabled**

Replace the `<Upload>` icon line (line 218) with:
```js
<Upload size={22} color={disabled ? T.text400 : dropHover ? T.accent : T.text400} style={{ margin: "0 auto 8px" }} />
```

Replace the first `<p>` text (line 219–221) with:
```js
<p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: disabled ? T.text400 : dropHover ? T.accent : T.text600, margin: "0 0 4px", fontWeight: 500 }}>
    {disabled ? "Character limit reached" : "Drop images here or click to browse"}
</p>
```

- [ ] **Step 4: Verify the file renders without error**

Check that the component still accepts `images`, `setImages`, `triggerEdit`, and now `disabled`.

```bash
grep -n "disabled\|export default" frontend/src/app/create/ImageCropperIntegration.js | head -10
```

Expected output includes:
```
18:export default function ImageCropperIntegration({ images, setImages, triggerEdit = null, disabled = false }) {
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/create/ImageCropperIntegration.js
git commit -m "add disabled prop to ImageCropperIntegration drop zone"
```

---

### Task 3: Update set/new/page.js counter and max enforcement

**Files:**
- Modify: `frontend/src/app/set/new/page.js`

**Interfaces:**
- Consumes: `disabled` prop from Task 2's updated `ImageCropperIntegration`
- Produces: counter with 4 states, submit blocked above 150, upload zone disabled at 150

- [ ] **Step 1: Add MAX_CHARACTERS constant**

Line 17 currently reads `const MIN_CHARACTERS = 6;`. Add the new constant directly after it:
```js
const MIN_CHARACTERS = 6;
const MAX_CHARACTERS = 150;
```

- [ ] **Step 2: Add a counter color/label helper**

Add this just below the constants (before the component function):
```js
function charCounterProps(count) {
    if (count < MIN_CHARACTERS) return { color: "#C0392B", label: `${count} / ${MIN_CHARACTERS} minimum` };
    if (count >= MAX_CHARACTERS) return { color: "#C0392B", label: `${count} / ${MAX_CHARACTERS} — limit reached` };
    if (count >= 140) return { color: "#D97706", label: `${count} / ${MAX_CHARACTERS}` };
    return { color: "#A0937F", label: `${count} / ${MAX_CHARACTERS}` };
}
```

- [ ] **Step 3: Replace the counter span**

Find the counter span at line 269–270:
```js
<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: images.length < MIN_CHARACTERS ? T.stateOut : T.text400 }}>
    {images.length} / {MIN_CHARACTERS} minimum
</span>
```

Replace with:
```js
<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: charCounterProps(images.length).color }}>
    {charCounterProps(images.length).label}
</span>
```

- [ ] **Step 4: Update submit button disabled logic**

Find line 288–289:
```js
disabled={saving || !name.trim() || images.length < MIN_CHARACTERS}
style={{ ...primaryBtn, opacity: saving || !name.trim() || images.length < MIN_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || images.length < MIN_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
```

Replace with:
```js
disabled={saving || !name.trim() || images.length < MIN_CHARACTERS || images.length > MAX_CHARACTERS}
style={{ ...primaryBtn, opacity: saving || !name.trim() || images.length < MIN_CHARACTERS || images.length > MAX_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || images.length < MIN_CHARACTERS || images.length > MAX_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
```

- [ ] **Step 5: Pass disabled prop to ImageCropperIntegration**

Find line 273:
```js
<ImageCropperIntegration images={images} setImages={setImages} />
```

Replace with:
```js
<ImageCropperIntegration images={images} setImages={setImages} disabled={images.length >= MAX_CHARACTERS} />
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/set/new/page.js
git commit -m "enforce 150 character max on set creation page"
```

---

### Task 4: Update edit/[setId]/page.js counter and max enforcement

**Files:**
- Modify: `frontend/src/app/edit/[setId]/page.js`

**Interfaces:**
- Consumes: `disabled` prop from Task 2's updated `ImageCropperIntegration`; `totalCount = existingChars.length + newImages.length` already computed at line 74
- Produces: same 4-state counter, submit blocked above 150, upload zone disabled at 150

- [ ] **Step 1: Add MAX_CHARACTERS constant**

Line 19 reads `const MIN_CHARACTERS = 6;`. Add immediately after:
```js
const MIN_CHARACTERS = 6;
const MAX_CHARACTERS = 150;
```

- [ ] **Step 2: Add the same charCounterProps helper**

Add below the constants (before the component function):
```js
function charCounterProps(count) {
    if (count < MIN_CHARACTERS) return { color: "#C0392B", label: `${count} / ${MIN_CHARACTERS} minimum` };
    if (count >= MAX_CHARACTERS) return { color: "#C0392B", label: `${count} / ${MAX_CHARACTERS} — limit reached` };
    if (count >= 140) return { color: "#D97706", label: `${count} / ${MAX_CHARACTERS}` };
    return { color: "#A0937F", label: `${count} / ${MAX_CHARACTERS}` };
}
```

- [ ] **Step 3: Replace the counter span**

Find lines 457–458:
```js
<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: totalCount < MIN_CHARACTERS ? T.stateOut : T.text400 }}>
    {totalCount} / {MIN_CHARACTERS} minimum
</span>
```

Replace with:
```js
<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: charCounterProps(totalCount).color }}>
    {charCounterProps(totalCount).label}
</span>
```

- [ ] **Step 4: Update submit button disabled logic**

Find lines 556–557:
```js
disabled={saving || !name.trim() || totalCount < MIN_CHARACTERS}
style={{ ...primaryBtn, opacity: saving || !name.trim() || totalCount < MIN_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || totalCount < MIN_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
```

Replace with:
```js
disabled={saving || !name.trim() || totalCount < MIN_CHARACTERS || totalCount > MAX_CHARACTERS}
style={{ ...primaryBtn, opacity: saving || !name.trim() || totalCount < MIN_CHARACTERS || totalCount > MAX_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || totalCount < MIN_CHARACTERS || totalCount > MAX_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
```

- [ ] **Step 5: Pass disabled prop to ImageCropperIntegration**

Find line 539:
```js
<ImageCropperIntegration images={newImages} setImages={setNewImages} triggerEdit={cropTrigger} />
```

Replace with:
```js
<ImageCropperIntegration images={newImages} setImages={setNewImages} triggerEdit={cropTrigger} disabled={totalCount >= MAX_CHARACTERS} />
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/edit/\[setId\]/page.js
git commit -m "enforce 150 character max on set edit page"
```
