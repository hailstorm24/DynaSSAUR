# Assignment Persistence Plan

## Current state

Sessions are ephemeral. When `handleGenerate` in `UploadPage.tsx` finishes, it calls `openSession()` — which sets `view: 'assignment'` with no `currentAssignmentId`. The `assignmentStore` has an `addAssignment` action but it is **never called anywhere**. The sidebar always shows "No assignments yet." for session-based work.

The active session is auto-saved to `localStorage['assignment-session']` via `debouncedSessionSave`, but it's a single slot — starting a new session overwrites it.

---

## Goal

1. Every session is saved as a named entry in the sidebar — created when the session starts, updated as the user progresses.
2. Clicking a past session in the sidebar restores the full `AssignmentSessionModel` (blocks, student content, chat history, eval state).
3. Each sidebar entry has a download button that exports the session as JSON.
4. The upload page has a "Load session" path that accepts a session JSON and restores it.

---

## Data model changes

### `AssignmentEntry` — add `sessionData` field

**File:** `webapp/client/src/stores/assignmentStore.ts`

```ts
export interface AssignmentEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  notebookData: NotebookData;
  sessionData: AssignmentSessionModel;  // ← add this
}
```

Update `addAssignment` signature to accept `sessionData`:

```ts
addAssignment: (title: string, notebookData: NotebookData, sessionData: AssignmentSessionModel) => string;
```

Add a new action for updating just the session data:

```ts
updateSessionData: (id: string, sessionData: AssignmentSessionModel) => void;
```

---

## Session save — wire up `addAssignment` and `updateSessionData`

### 1. Create the entry when a session starts

**File:** `webapp/client/src/views/UploadPage.tsx`

After `openSession()` succeeds, call `addAssignment` with:
- `title`: derive from the markdown filename (strip `.md`, trim)
- `notebookData`: empty/default notebook (or skip — the session view doesn't use notebook cells)
- `sessionData`: current `useAssignmentSessionStore.getState()` snapshot

Then call `openAssignment(newId)` instead of `openSession()` so the sidebar entry is active.

> `appStore` needs a small update: `openSession()` can remain for restored sessions from startup, but the normal post-upload flow should use `openAssignment(id)`.

### 2. Auto-save session changes into the store entry

**File:** `webapp/client/src/utils/persistence.ts`

Extend `debouncedSessionSave` to also call `updateSessionData` when `currentAssignmentId` is set:

```ts
function debouncedSessionSave() {
  // ... existing debounce logic ...
  const { currentAssignmentId } = useAppStore.getState();
  const state = useAssignmentSessionStore.getState();
  const snapshot: AssignmentSessionModel = { status, uploadedFiles, blocks, activeBlockIndex };

  // Always write to single-slot localStorage (existing behavior)
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));

  // Also persist into the named entry if one exists
  if (currentAssignmentId) {
    useAssignmentStore.getState().updateSessionData(currentAssignmentId, snapshot);
  }
}
```

---

## Sidebar — restore sessions + show progress

### 1. Load session on click

**File:** `webapp/client/src/views/Sidebar.tsx`

Update `handleOpenAssignment`:

```ts
function handleOpenAssignment(entry: AssignmentEntry) {
  // Restore session state
  useAssignmentSessionStore.setState({
    ...entry.sessionData,
    apiError: null,
  });
  // Restore notebook state (existing)
  loadCells(entry.notebookData.cellIds, entry.notebookData.cells);
  loadCellIds(entry.notebookData.cellIds);
  openAssignment(entry.id);
}
```

### 2. Progress indicator in sidebar entry

Show a step count derived from `sessionData`:

```ts
function sessionProgress(entry: AssignmentEntry): string {
  const blocks = entry.sessionData?.blocks ?? [];
  const total = blocks.length;
  const passed = blocks.filter(
    (b) => b.type !== 'summary' && b.evalState.status === 'passed'
  ).length;
  if (entry.sessionData?.status === 'complete') return 'Complete';
  return `${passed}/${total - 1} steps`; // subtract summary block
}
```

Display this as a small line below the timestamp in the sidebar entry row.

---

## Download session as JSON

**File:** `webapp/client/src/views/Sidebar.tsx`

Add a download icon button next to the delete button on each sidebar entry. On click:

```ts
function handleDownload(entry: AssignmentEntry, e: React.MouseEvent) {
  e.stopPropagation();
  const blob = new Blob([JSON.stringify(entry.sessionData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entry.title.replace(/\s+/g, '-').toLowerCase()}-session.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

The download button sits between the progress text and the delete button, uses the same opacity-on-hover style as the delete button.

---

## Upload / restore session from JSON

**File:** `webapp/client/src/views/UploadPage.tsx`

Add a secondary path below the main upload card: "or restore a saved session" with a file input that accepts `.json`.

On file select:
1. Parse the JSON
2. Validate it has the expected shape: `{ uploadedFiles, blocks, activeBlockIndex, status }` — a simple duck-type check (same pattern as `isValidNotebookData` in `notebookSerializer.ts`)
3. Call `addAssignment(title, defaultNotebookData, parsedSession)` to register it in the sidebar
4. Call `useAssignmentSessionStore.setState({ ...parsedSession, apiError: null })`
5. Call `openAssignment(newId)`

Add a `isValidSessionData(data: unknown): data is AssignmentSessionModel` guard in `AssignmentSessionModel.ts` or a new `sessionValidator.ts` utility.

---

## Files changed summary

| File | Change |
|------|--------|
| `stores/assignmentStore.ts` | Add `sessionData` to `AssignmentEntry`; add `updateSessionData` action; update `addAssignment` signature |
| `models/AssignmentSessionModel.ts` | Add `isValidSessionData` type guard |
| `utils/persistence.ts` | `debouncedSessionSave` also calls `updateSessionData` when `currentAssignmentId` is set |
| `views/UploadPage.tsx` | Call `addAssignment` + `openAssignment` after generate; add JSON restore flow |
| `views/Sidebar.tsx` | `handleOpenAssignment` restores session state; add progress indicator; add download button |
| `stores/appStore.ts` | No changes required — `openAssignment(id)` already exists and is correct |

---

## Validation

### Automated tests (Vitest)

The existing suite lives in `webapp/client/src/tests/`. New tests belong in a new file: `tests/assignmentPersistance.test.ts`.

**`assignmentStore` — unit tests**
- `addAssignment` with `sessionData` persists the full model to localStorage and returns an id
- `updateSessionData` updates only `sessionData` and bumps `updatedAt`
- `loadFromStorage` round-trips an entry that includes `sessionData` without data loss

**`isValidSessionData` — unit tests**
- Returns `false` for `null`, empty object, missing `blocks`, missing `uploadedFiles`, wrong `status` value
- Returns `true` for a minimal valid `AssignmentSessionModel`

**`debouncedSessionSave` — spy test**
- When `currentAssignmentId` is set in `appStore`, saving the session store calls `updateSessionData` with the correct snapshot
- When `currentAssignmentId` is `null`, `updateSessionData` is not called

**Sidebar restore — unit test**
- `handleOpenAssignment` calls `useAssignmentSessionStore.setState` with `entry.sessionData` and `apiError: null`

**JSON round-trip — already covered**
- `assignmentSession.test.ts` already has a full round-trip test that validates the shape of the exported JSON. The `isValidSessionData` guard should accept the output of that test's snapshot.

### Manual validation checklist

Run `npm run dev` from `webapp/` and verify:

- [ ] Start a new assignment — a sidebar entry appears immediately with the assignment title and "0/N steps"
- [ ] Complete a planning step — sidebar entry updates to "1/N steps" without a page reload
- [ ] Complete all steps — sidebar entry shows "Complete"
- [ ] Refresh the page — the active session is restored (existing behavior still works)
- [ ] Click a past sidebar entry — all blocks render, student content is populated, chat history is visible, eval badges are correct
- [ ] Click the download button on a sidebar entry — a `.json` file downloads with the correct filename
- [ ] Open the downloaded `.json` in a text editor — it contains `uploadedFiles`, `blocks`, `activeBlockIndex`, `status`
- [ ] Use "Load session" on the upload page with that file — the session restores and a new sidebar entry is created
- [ ] Upload a malformed `.json` — an error message appears, no crash, no corrupt state
- [ ] Delete a session from the sidebar — entry removed, active view returns to upload page if it was the current session

---

## What does NOT change

- `AssignmentView.tsx` — no changes needed; it already reads from `useAssignmentSessionStore`
- `assignmentSessionStore.ts` — no changes needed; it already has all the right actions
- The single-slot `localStorage['assignment-session']` behavior — kept as a crash-recovery fallback for mid-session refreshes
- The notebook/cell stores — sessions don't use them; existing sandbox behavior is untouched
