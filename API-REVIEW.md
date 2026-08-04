# API review — `react-native-bottom-sheet-stack`

A read-through of the whole API surface (public and internal) looking for
inconsistencies, hazards and things that make the library harder to use or
maintain. Baseline: the swmansion 0.16.2 bump.

Every finding comes from reading the code. **Nothing was run on a device or
covered by a test** — the repo has no test suite. Where telling "bug" from
"deliberate" would need a device, that is called out.

Numbering: `B*` = bug, `P*` = public API, `W*` = internal, `M*` = dead code.

Each finding carries a status. See `## Status` at the end for what has been
applied and what is deliberately left alone.

---

## 1. Bugs

### B1. Group isolation is broken in three places — **priority 1**

`BottomSheetManagerProvider` promises independent groups ("Each group has its own
stackOrder"). The store, however, keeps **one global `stackOrder`**, and three
operations reach into it without filtering by `groupId`:

| Site | Code | Effect |
|---|---|---|
| `store.ts:37` | `applyModeToTopSheet(sheetsById, state.stackOrder, mode)` | `mode: 'switch'`/`'replace'` in group B hides/closes a sheet in group A |
| `store.ts:118` | `getTopSheetId(newStackOrder)` | Closing a sheet in group B auto-restores a hidden sheet from group A |
| `store.ts:92` | `getSheetBelowId(state.stackOrder, id)` | `startClosing` restores the sheet "below" from another group |

For contrast, the same operations **do** filter correctly in
`initBottomSheetCoordinator`, `useSheetRenderData`, `closeAllAnimated` and
`clearGroup`. So the invariant is known — just applied inconsistently.

**Fix:** pass `groupId` into the three helpers and filter, or — cleaner — key the
stack by group: `stackOrderByGroup: Record<string, string[]>`. The latter kills
this whole class of bug structurally and simplifies the selectors.

### B2. Ref leak when `open()` is rejected — **priority 1**

`useBottomSheetManager.open()` (`useBottomSheetManager.tsx:36-38`):

```ts
const id = options.id || Math.random().toString(36);
const ref = React.createRef<SheetAdapterRef>();
setSheetRef(id, ref);          // ← writes to the global map
// ...
storeOpen({ id, ... });        // ← the store may reject this SILENTLY (B3)
return id;
```

`cleanupSheetRef(id)` only ever runs from the `useEffect` cleanup in `QueueItem`.
If the store rejects the open, `QueueItem` never mounts, so the `sheetRefsMap`
entry stays **forever**. With random IDs every rejected open adds another
unreclaimable entry. `useBottomSheetControl` has the same shape but a stable ID,
so its leak is bounded to one entry.

**Fix:** register the ref only once the store has accepted the sheet — which
requires `open()` to report its outcome (see B3).

### B3. `open()` is sometimes a silent no-op

`store.ts:28-35` — two guards abort the open without any signal:

```ts
if (existingSheet && !isActivatableKeepMounted(existingSheet)) return state;
const hasOpeningInGroup = Object.values(state.sheetsById).some(
  (s) => s.groupId === sheet.groupId && s.status === 'opening');
if (hasOpeningInGroup) return state;
```

The second guard is timing-dependent: two `open()` calls in the same tick (or a
second one while the first is still animating in) and the second vanishes. The
caller gets an `id` back and has no way to tell that nothing happened. This is
the shape of "the sheet sometimes doesn't open" reports.

**Fix:** have `open()` return `{ id, opened: boolean }` (or `string | null`), plus
a `__DEV__` warning naming the reason.

### B4. Conditional hook call in `useOnBeforeClose`

`useOnBeforeClose.ts:75-84`:

```ts
const context = useMaybeBottomSheetContext();
const setPreventDismiss = useSetPreventDismiss();
if (!context?.id) throw new Error(...);        // ← throws BEFORE the later hooks
const stableCallback = useEvent(callback);      // hook #3
useEffect(...);                                 // hook #4
```

If the context disappears between renders (sheet unmounting, `clearGroup` during
a fast refresh), the hook count drops from 4 to 2 and React throws "Rendered
fewer hooks than expected", masking the real cause.

`useBottomSheetContext` has the opposite, correct ordering (all hooks, then
throw) — at the cost of calling selectors with `''` as the ID.

**Fix:** call every hook, then throw. Unify the pattern across both hooks.

### B5. `animatedIndex` is binary in three adapters, so their backdrops snap

The `animatedIndex` contract (`-1` hidden → `0` open) is honoured in two
incompatible ways:

| Adapter | How | Backdrop |
|---|---|---|
| `GorhomSheetAdapter` | shared value handed to the library | smooth |
| `SwmansionSheetAdapter` | written from native `onPositionChange` | smooth |
| `CustomModalAdapter` | `animatedIndex.set(0)` / `set(-1)` | **snaps** |
| `ReactNativeModalAdapter` | `set(0)` / `set(-1)` | **snaps** |
| `ActionsSheetAdapter` | `set(0)` / `set(-1)` | **snaps** |

`CustomModalAdapter` is the clearest case: it has its own `progress` animated with
`withTiming(…, 300ms)` and sets `animatedIndex` discretely in the very same
`expand()`. The modal fades in over 300 ms; the backdrop appears instantly at
full opacity.

This is the same symptom that was reported for swmansion — there it came from a
timing gate in the backdrop, here it is baked into the adapters.

**Fix:** for adapters with their own animation, `animatedIndex.value =
withTiming(0, cfg)` using the same config as the sheet animation; for
`CustomModalAdapter`, derive it straight from the existing `progress`.

### B6. Ref mutated inside a Zustand selector

`useScaleAnimation.ts:63-92` — `useSheetScaleDepth`:

```ts
const result = useBottomSheetStore((state) => {
  if (sheetIndex === -1) return prevDepthRef.current;   // read
  // ...
  prevDepthRef.current = depth;                          // ← write inside selector
  return depth;
});
```

A Zustand selector must be pure — it runs on every store change, potentially
several times per render and twice under StrictMode. Mutating makes the result
depend on how many times it ran. The intent (hold the last depth once the sheet
leaves the stack, so the exit animation doesn't jump) is right; the mechanism
isn't.

**Fix:** return `sheetIndex === -1 ? null : depth` from the selector and hold the
last-known value in an effect or in the shared value itself.

### B7. A sheet can get stuck in `'closing'`

`bottomSheetCoordinator.ts:24-40`:

```ts
const ref = getSheetRef(id)?.current;      // read once, up front
switch (status) {
  case 'opening':
    requestAnimationFrame(() => { getSheetRef(id)?.current?.expand(); });  // fresh read
    break;
  case 'hidden':
  case 'closing':
    ref?.close();                          // ← stale ref, no retry
}
```

Two different strategies in one switch. If `ref.current` is still `null` (the
adapter hasn't mounted — realistic for a portal, whose content must first
teleport into its `PortalHost`), `ref?.close()` is a silent no-op. Nothing ever
calls `handleClosed()`, so the sheet sits in `'closing'` indefinitely: it doesn't
render properly and it blocks `hasOpeningInGroup` (B3) for the whole group.

**Fix:** use the same strategy as `expand` (read inside rAF, re-check status),
plus a `__DEV__` watchdog warning about sheets stuck in a transitional state.

### B8. `closeAllAnimated` calls `indexOf` in a loop

`bottomSheetCoordinator.ts:152`:

```ts
if (stagger > 0 && reversed.indexOf(sheetId) < reversed.length - 1) {
```

`indexOf` over the array being iterated: O(n²), and it returns the **first**
match. At realistic stack sizes the cost is irrelevant, but the semantics are
wrong and the loop index is right there.

### B9. `requestClose` returns `true` when it did nothing

`bottomSheetCoordinator.ts:100-104` — for a sheet in `'hidden'` (or one that
doesn't exist) the function falls past `if (currentStatus === 'open' || …)` and
returns `true`. The return value means "the interceptor didn't block", not "the
sheet is closing" — which neither the name nor the docs convey.

---

## 2. Public API — inconsistencies

### P1. `close()` throws away the interceptor result

```ts
requestClose(id)                       → Promise<boolean>   // low-level, public
useBottomSheetManager().close(id)      → void               // Promise dropped
useBottomSheetControl().close()        → void               // Promise dropped
useBottomSheetContext().close()        → void               // Promise dropped
useBottomSheetManager().closeAll()     → Promise<void>      // returned
```

`onBeforeClose` can block a close, but none of the three main `close()` calls
reports it. Finding out means reaching for `requestClose` — i.e. the
adapter-author API. Meanwhile `closeAll` does return its promise, so the rule
isn't even consistent within one hook.

**Proposal:** every `close()` returns `Promise<boolean>`. Backwards compatible —
callers ignoring `void` can keep ignoring it.

### P2. `clear()` and `closeAll()` don't read as what they are

```ts
closeAll()  // animated cascade, respects onBeforeClose, async
clear()     // immediate store wipe, BYPASSES onBeforeClose, sync
```

`clear()` sounds like tidying up but is a hard reset that skips the entire
data-loss guard. And `clearAll` is a deprecated alias of `clear` — a name that
implies kinship with `closeAll`, which it has nothing to do with.

**Proposal:** `destroyAll()` / `resetGroup()` with explicit JSDoc: "skips
onBeforeClose, no animation — for teardown, not for closing".

### P3. `params` are unavailable to inline sheets

`useBottomSheetControl.open()` takes `params`. `useBottomSheetManager.open()`
does not. Yet `useBottomSheetContext()` returns `params` **always**, so in an
inline sheet it is permanently `undefined`. The store and `BottomSheetState`
support `params` regardless of mode — only the hook surface restricts it.

For inline sheets they're partly redundant (values can be closed over in JSX),
but the asymmetry is undocumented and reads as an oversight.

### P4. `isOpen` includes `'opening'`

```ts
isOpen: status === 'open' || status === 'opening'
```

The name says "is open", the value means "is open or opening". There's no way to
tell the interactive state from the animation — a distinction the library itself
relies on internally (`useBackHandler` only fires on `status === 'open'`).

**Proposal:** add `isOpening` / `isClosing` / `isVisible`, and narrow `isOpen` to
`status === 'open'` (breaking — 2.0).

### P5. `useBottomSheetStatus(id: string)` has no type support

The rest of the type-safe API works in `BottomSheetPortalId`. This one takes a
bare `string`, because inline sheet IDs are random. Result: no completion for
registered IDs.

**Proposal:** `id: BottomSheetPortalId | (string & {})` — completion for
registered IDs, any string still accepted.

### P6. The store's internals are public

```ts
export { useBottomSheetStore } from './bottomSheet.store';
export type { BottomSheetState } from './bottomSheet.store';
```

`useBottomSheetStore` exposes the full state and every action — including
`markOpen`, `finishClosing`, `mount` and `unmount`, which only make sense for the
coordinator. `BottomSheetState` exposes `content`, `portalSession` and
`preventDismiss`, all pure implementation detail. Any change to the store's shape
is now a breaking change.

**Proposal:** mark `@internal`, expose narrow selectors instead
(`useSheetStatus`, `useSheetParams`), and narrow the public `BottomSheetState` to
`Pick<…, 'id' | 'groupId' | 'status' | 'params'>`.

### P7. Custom adapter authors don't get the full toolkit

Every built-in adapter calls `useSetBackdrop(id, false)` to suppress the manager
backdrop when it provides its own. **That function is not exported** from the
main entry (neither is `useSheetPreventDismiss` — though `preventDismiss` is
reachable indirectly via `useBottomSheetContext()`).

So an adapter written against `docs/custom-adapters.md` cannot match the
built-ins. The "Adapter utilities (for custom adapter authors)" section of
`index.tsx` is incomplete.

### P8. Test helpers ship in the main entry

`__resetSheetRefs`, `__resetAnimatedIndexes`, `__getAllAnimatedIndexes`,
`__resetPortalSessions`, `__resetOnBeforeClose` — five symbols in the production
bundle, prefixed with `__` but not marked `@internal`.

**Proposal:** a `react-native-bottom-sheet-stack/testing` subpath, consistent
with the existing subpath-export pattern for adapters.

### P9. Deprecated API with no removal horizon

`openBottomSheet`, `clearAll`, `closeBottomSheet`, `useBottomSheetState`,
`ModalAdapter`, `BottomSheetManaged`, `BottomSheetManagedProps`, plus the
unmarked `SheetAdapterRef as BottomSheetRef` alias.

Eight aliases at version 1.18.4, none of which says when it goes away.

### P10. Two tiers of adapter quality

```ts
// swmansion / gorhom — typed
interface SwmansionSheetAdapterProps extends Omit<BottomSheetProps, …> {}

// actions-sheet / react-native-modal — untyped
interface ActionsSheetAdapterProps { children: ReactNode; [key: string]: unknown; }
```

`[key: string]: unknown` disables type checking entirely — a typo in a prop name
passes silently. Both libraries ship types, so there's something to build on.

---

## 3. Internal — consistency and maintenance

### W1. Three naming conventions for context hooks

| File | Hook |
|---|---|
| `BottomSheet.context.ts` | `useMaybeBottomSheetContext` |
| `BottomSheetRef.context.ts` | `useBottomSheetRefContext` |
| `BottomSheetDefaultIndex.context.ts` | `useBottomSheetDefaultIndex` |
| `BottomSheetManager.**provider**.tsx` | `useBottomSheetManagerContext` + `useMaybe…` |

On top of that the manager hook lives in the provider file rather than the
context file — even though `BottomSheetManager.context.tsx` exists and holds the
context itself.

### W2. Two layers of store re-export

`bottomSheet.store.ts` is a single line, `export * from './store'`. Imports in
the codebase go through `./bottomSheet.store` in some files and `./store` in
others, with no semantic difference. A layer to delete.

### W3. `TriggerState` is defined but used inconsistently

```ts
export type TriggerState = Omit<BottomSheetState, 'status'>;
open(sheet: TriggerState, mode?: OpenMode): void;
mount(sheet: Omit<BottomSheetState, 'status'>): void;   // ← same type, spelled out
```

### W4. `open()` takes a shape that conflates two disjoint modes

`useBottomSheetControl` passes `content: null` even though `content` is optional
— without it there's no signal that this is a portal sheet. The mode is encoded
in the combination of `usePortal` + `keepMounted` + `content`, of which only
three of eight combinations are real.

**Proposal:** a discriminated union:

```ts
type OpenPayload =
  | { kind: 'inline';     id: string; groupId: string; content: ReactNode; … }
  | { kind: 'portal';     id: string; groupId: string; … }
  | { kind: 'persistent'; id: string; groupId: string; … };
```

This makes the three documented modes explicit in the types and removes
`content: null`.

### W5. `MODE_STATUS_MAP` uses `null` for "no action"

Which forces `if (!targetStatus) return sheetsById;`. It works, but `push` isn't
"no status" — it's "leave the previous sheet alone". Clearer as an explicit
branch.

### W6. `shallow` on selectors returning primitives

Eight of the eleven selectors in `store/hooks.ts` return `string | boolean |
number | undefined` and still go through `shallow`. Reference comparison is
enough; `shallow` only adds a call. `useSheet` and `useSheetParams` are the ones
that actually need it.

### W7. `useEvent` name collision

`src/useEvent.ts` (the useEvent RFC) and `useEvent` from
`react-native-reanimated` (a native event handler) are entirely different things
under one name, used in the same repo — and imported side by side in
`SwmansionSheetAdapter`.

**Proposal:** rename the local one to `useStableCallback`.

### W8. `useBottomSheetContext` calls selectors with `''`

```ts
const params = useSheetParams(context?.id || '');
```

It works (the selector returns `undefined`), but empty string as "no ID" is an
unwritten convention scattered through the code.

---

## 4. Dead code

Zero uses in `src/` and `example/`:

| Symbol | File |
|---|---|
| `isOpening` | `store/helpers.ts` |
| `useSheet` | `store/hooks.ts` |
| `useIsSheetOpen` | `store/hooks.ts` |
| `useHasScaleBackgroundAbove` | `store/hooks.ts` |
| `getCurrentPortalSession` | `portalSessionRegistry.ts` |
| `useTracePropChanges` | `useTracePropChanges.ts` (whole file — a debug tool with `console.log`) |

None is exported publicly from `index.tsx`, so removing them is not a breaking
change. `setAnimatedIndexValue` has one use — and is public despite duplicating
`useAnimatedIndex()`.

---

## Status

Applied across three stages on top of the swmansion 0.16.2 bump.

**Stage 1 — bugs, no API change:**
B1, B2, B4, B6, B7, B8, B9 — done.

**Stage 2 — behavioural consistency:**
B3, B5, P1, P5, P7, P10, and the dead code in section 4 — done.

**Stage 3 — cleanup (breaking, 2.0):**
P2, P4, P6, P8, P9, W2, W3, W5, W6, W7, W8 — done.

### Still open

- **W1** (three naming conventions for context hooks) — not done.
  `useMaybeBottomSheetContext`, `useBottomSheetRefContext` and
  `useBottomSheetDefaultIndex` still disagree, and the manager hook still lives
  in the provider file rather than the context file.
- **W4** (discriminated union for the `open()` payload) — not done. The mode is
  still encoded in the `usePortal` + `keepMounted` + `content` combination, of
  which only three of eight are real.
- **P3** is partly done: `useBottomSheetManager().open()` now accepts `params`,
  but see the asymmetry below.

### Introduced by this work

- `useBottomSheetManager().open()` returns `string | null`, but
  `useBottomSheetControl().open()` still returns `void` — the store hands it an
  `OpenResult`, which it consumes internally and drops. The same rejection is
  visible through one hook and invisible through the other.
- `requestClose` (and therefore every `close()`) now returns `false` for four
  distinct outcomes: the sheet was already closing, the interceptor returned
  false, the interceptor threw, and there was nothing to close. Fixing B9 made
  the value honest about "is it closing" at the cost of conflating why not.
- `closeAllAnimated` still returns `Promise<void>`, so a cascade stopped by an
  interceptor is indistinguishable from one that closed everything — even
  though the docs say it can stop.

### Not attempted

`BottomSheetPortal` reads `getSheetRef(id)` during render — a module-global map
consulted from render, which is not reactive. It works only because
`portalSession` changes in the same store write that creates the ref. Fragile,
but untangling it means reworking how portals learn about refs, which is a
larger change than anything here.

The native detent cap derives from `getLocationInWindow` / `convert(to: window)`,
which account for transforms — so a sheet scaled by another above it (via
`ScaleWrapper`) may recompute its cap mid-animation and twitch.

None of this is covered by a test or verified on a device; the repo still has no
test suite. That is the largest outstanding gap: this work changed the store's
shape, the open/close contract and the animation timing of three adapters, and
nothing guards any of it. The changes most worth exercising on hardware are B5
(the three adapters whose backdrop timing changed) and B7 (the coordinator's
close path).
