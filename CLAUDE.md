# CLAUDE.md - LLM Guide for react-native-bottom-sheet-stack

## CRITICAL: React Compiler - NO MANUAL MEMOIZATION

**This project uses React Compiler (`babel-plugin-react-compiler` v1.0.0) with React 19.**

### DO NOT USE:
- `React.memo()`
- `useMemo()`
- `useCallback()`
- `memo()` HOC
- Any manual memoization patterns

### WHY:
React Compiler automatically handles all memoization at build time. Manual memoization is:
1. **Redundant** - Compiler does it better
2. **Harmful** - Can conflict with compiler optimizations
3. **Unnecessary** - Compiler tracks dependencies automatically

### Babel Configuration (babel.config.js):
```javascript
plugins: [
  ['babel-plugin-react-compiler', {
    target: '19',
    panicThreshold: 'all_errors',  // Strict mode
  }],
]
```

### SANCTIONED EXCEPTION 1: `QueueItem.tsx`
`QueueItem` is wrapped in `memo`, and that is **sanctioned**. The compiler
memoizes work *inside* a component; it does not wrap one in `memo`. Because
`BottomSheetHost` builds its children with `.map()`, every host render produces
fresh element references and React must call each `QueueItem` to find out the
output is unchanged — including persistent sheets that the opening sheet does
not touch.

Measured on device, opening one sheet with three persistent sheets mounted:
three `QueueItem` bodies ran for nothing without `memo`, zero with it. The cost
grows linearly with the number of persistent sheets in the group.

It costs no correctness: a `QueueItem` whose `stackIndex` changes still
re-renders, and `ScaleWrapper` holds its own store subscription, so scale depth
updates while its parent is skipped (verified with a push). Do not "clean up"
this one either.

### SANCTIONED EXCEPTION 2: `useStableCallback.ts`
`useStableCallback` uses `useCallback` deliberately, and that is **sanctioned**.
It is not an optimization: the whole point of the hook is that the returned
function has a *stable identity* while its closure stays fresh (the useEvent
RFC). `useCallback([])` is the mechanism that produces the stable identity —
removing it removes the feature. Do not add another, and do not "clean up" this
one.

Those two are the only sanctioned manual memoization in `src/`. Anything else
is still forbidden — and both were added only after measuring, not on a hunch.

### When Compiler Cannot Optimize:
Use the `'use no memo'` directive at the top of the file. This is RARE. The only
current use is `BottomSheetPortal.tsx`, which reads the module-global refs map
(`getSheetRef(id)`) **during render** — not a reactive source, so the compiler's
analysis of when to re-run the component is unsound. See "Not attempted" in
`API-REVIEW.md`; it works only because `portalSession` changes in the same store
write that creates the ref.

---

## Project Overview

A library-agnostic stack manager for bottom sheets and modals in React Native. Provides:
- **Adapter architecture**: Pluggable adapters for any bottom sheet/modal library
- **Navigation modes**: push, switch, replace
- **iOS-style scale animations**: Background content scales when sheets open
- **Context preservation**: Via portals (`react-native-teleport`)
- **Persistent sheets**: Pre-mounted sheets that maintain state across open/close cycles
- **Type-safe APIs**: TypeScript with augmentable type registry

### Tech Stack (core)
| Category | Package | Version |
|----------|---------|---------|
| React | react | 19.1.0 |
| React Native | react-native | 0.81.5 |
| Animation | react-native-reanimated | ^4.2.1 |
| State | zustand | ^5.0.3 |
| Portals | react-native-teleport | ^1.1.7 |

### Shipped Adapters (separate subpath exports)
| Adapter | Import subpath | Wraps |
|---------|---------------|-------|
| `GorhomSheetAdapter` | `react-native-bottom-sheet-stack/gorhom` | `@gorhom/bottom-sheet` |
| `CustomModalAdapter` | `react-native-bottom-sheet-stack` (main) | Custom animated modal (zero deps) |
| `ReactNativeModalAdapter` | `react-native-bottom-sheet-stack/react-native-modal` | `react-native-modal` |
| `ActionsSheetAdapter` | `react-native-bottom-sheet-stack/actions-sheet` | `react-native-actions-sheet` |
| `SwmansionSheetAdapter` | `react-native-bottom-sheet-stack/swmansion` | `@swmansion/react-native-bottom-sheet` (Fabric / New Arch) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BottomSheetManagerProvider                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PortalProvider                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │          BottomSheetManagerContext                  │  │   │
│  │  │  (groupId, scaleConfig)                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│  BottomSheetScaleView │                 │   BottomSheetHost   │
│  (wraps app content)  │                 │   (renders sheets)  │
└─────────────────────┘                 └─────────────────────┘
                                                   │
                    ┌──────────────────────────────┴──────────────────────────────┐
                    ▼                              ▼                              ▼
          ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
          │    QueueItem    │          │    QueueItem    │          │    QueueItem    │
          │  (sheet slot)   │          │  (sheet slot)   │          │  (sheet slot)   │
          │  zIndex: B+0,1  │          │  zIndex: B+2,3  │          │  zIndex: B+4,5  │
          └─────────────────┘          └─────────────────┘          └─────────────────┘
                    B = baseZIndex = 100_000_000 (lifts the stack above app chrome)
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ PortalHost      │   │ Inline Content  │
│ (portal mode)   │   │ (dynamic mode)  │
└─────────────────┘   └─────────────────┘
```

---

## Source File Guide (`src/`)

### Core State Management

#### `store/` - Central Zustand Store
**Purpose**: Single source of truth for all sheet state and stack ordering.
Split into `store.ts` (actions), `hooks.ts` (selectors), `helpers.ts` (pure
stack operations) and `types.ts`. Import from `./store`.

**State Structure**:
```typescript
interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;      // All sheets by ID
  stackOrderByGroup: Record<string, string[]>;       // Visible IDs, per group
}

// @internal — the full record. NOT what consumers see.
interface BottomSheetState {
  groupId: string;              // Manager group ID
  id: string;                   // Unique sheet ID
  content?: ReactNode;          // For inline mode only
  status: BottomSheetStatus;    // 'opening' | 'open' | 'closing' | 'hidden'
  scaleBackground?: boolean;    // Enable iOS-style scale
  backdrop?: boolean;           // false = suppress the manager's shared backdrop
  usePortal?: boolean;          // Portal mode flag
  params?: Record<string, unknown>;  // Type-safe params
  keepMounted?: boolean;        // Persistent sheet flag
  portalSession?: number;       // Unique Portal/PortalHost name counter
  preventDismiss?: boolean;     // Adapter should block native dismiss gestures
}

// The public surface, re-exported from index.tsx *as* `BottomSheetState`.
type PublicBottomSheetState = Pick<
  BottomSheetState,
  'id' | 'groupId' | 'status' | 'params' | 'scaleBackground' | 'keepMounted'
>;
```

**Two names, one of them a lie.** `index.tsx` exports
`PublicBottomSheetState as BottomSheetState`. So inside `src/`,
`BottomSheetState` is the full internal record; to a consumer,
`BottomSheetState` is the narrowed `Pick`. When adding a field, decide
deliberately whether it belongs in the `Pick` — anything added there is
semver-locked. `content`, `backdrop`, `usePortal`, `portalSession` and
`preventDismiss` are all deliberately outside it.

**CRITICAL — the stack is keyed by group.** There is no global `stackOrder`.
Every stack operation takes a *single group's* array, which is what makes group
isolation structural rather than a filter someone has to remember. Reaching for
`Object.values(stackOrderByGroup).flat()` inside a store action or selector
re-introduces the exact bug this shape exists to prevent (`switch`/`replace` in
one group closing a sheet in another).

**Key Actions**:
- `open(sheet: OpenPayload, mode?)` - Opens sheet with navigation mode. Returns
  `OpenResult` — `{ opened: false, id, reason }` for `'already-active'`,
  `'group-busy'` or `'group-mismatch'`, each with a `__DEV__` warning. Never
  silently drops the request.
- `markOpen(id)` - Transitions 'opening' → 'open'
- `startClosing(id)` - Initiates close animation. Also re-opens the sheet below
  when the closing one is the group's top and the one below is `hidden`
  (undoing a `switch`).
- `finishClosing(id)` - Completes close (hides if keepMounted, removes otherwise)
- `mount(sheet: MountPayload)` - Pre-mounts persistent sheet with 'hidden' status
- `unmount(id)` - Removes persistent sheet
- `setBackdrop(id, boolean)` / `setPreventDismiss(id, boolean)` - Field patches
- `clearGroup(groupId)` / `clearAll()` - Teardown. No animation, no interceptors.

**`open()` takes a discriminated union, not a bag of optional flags:**
```typescript
type OpenPayload =
  | { kind: 'inline'; id; groupId; content: ReactNode; scaleBackground?; backdrop?; params? }
  | { kind: 'portal'; id; groupId; scaleBackground?; backdrop?; params? };

type MountPayload = /* the base fields, no kind */;
```
`kind` is what callers reason about; `usePortal` is what the renderer checks.
`toStoreFields()` in `store.ts` is the single place that maps one to the other —
don't re-encode the mode at a call site. There is no `kind: 'persistent'`: a
persistent sheet is registered by `mount()` and re-opened as `'portal'`, keeping
the `keepMounted` flag its store record already carries.

**Navigation Modes** (`OpenMode`):
- `push` - Keeps previous sheet visible (stacking)
- `switch` - Hides previous sheet (hidden status, not removed)
- `replace` - Closes previous sheet (closing status, then removed)

#### `bottomSheetCoordinator.ts` - State↔UI Synchronization
**Purpose**: Bidirectional sync between Zustand store and sheet adapters.

**Two Directions**:
1. **Store → Adapter** (`initBottomSheetCoordinator`):
   - Subscribes to store changes
   - Calls `ref.expand()` when status becomes 'opening'
   - Calls `ref.close()` when status becomes 'hidden' or 'closing'

2. **Adapter → Store** (`createSheetEventHandlers`):
   - `handleDismiss`: User swipes down / back button → **`requestClose(id)` when
     an `onBeforeClose` interceptor is registered**, otherwise `startClosing()`
     directly. Routing through `requestClose` is what makes a user gesture
     honour the interceptor; do not "simplify" it back to a bare
     `startClosing()`.
   - `handleOpened`: Show animation completes → `markOpen()`
   - `handleClosed`: Hide animation completes → `finishClosing()`

**Also exported from the coordinator** (and publicly, for adapter authors):
`requestClose(id): Promise<CloseResult>` and
`closeAllAnimated(groupId, opts): Promise<CloseAllResult>`.

**`driveSheetRef`** retries a ref call across up to `REF_CALL_MAX_FRAMES` (10)
`requestAnimationFrame`s, re-checking the status each time. The store can reach
a terminal status before the adapter has mounted (a portal sheet must teleport
first); a single attempt would silently no-op and wedge the sheet — and for
`'closing'`, wedge every later open in the group on the `group-busy` guard.

### Global Registries (Module-Level Maps)

Four of them. All are module state, so they outlive React — which is why
`resetBottomSheetRegistries()` exists (see Testing Utilities).

#### `refsMap.ts` - Sheet Reference Registry
```typescript
const sheetRefsMap = new Map<string, SheetRef>();
// SheetRef = RefObject<SheetAdapterRef | null>
```
**Why**: Refs cannot be stored in Zustand (not serializable). Global map allows
coordinator to access refs by sheet ID. Cleaned up by `QueueItem`'s unmount
effect — which is why `useBottomSheetManager` registers the ref only *after*
the store accepts the open, or a rejected open would leak an unreclaimable entry.

#### `animatedRegistry.ts` - Animated Index Registry
```typescript
const animatedIndexRegistry = new Map<string, SharedValue<number>>();
```
**Why**: Shared animated values for backdrop opacity interpolation.

Created **eagerly** in store actions (`open` / `mount`) before any component
renders, so the value always exists by the time the backdrop reads it:
- `ensureAnimatedIndex(id)` — get-or-create, initialised to `HIDDEN_ANIMATED_INDEX` (`-1`)
- `resetAnimatedIndex(id)` — ensure **and rewind to `-1`**; called by `open()`
  so a re-opened persistent sheet does not still carry last cycle's value
- `getAnimatedIndex(id)` — a pure read, returns `undefined` if absent. It does
  **not** create.

#### `onBeforeCloseRegistry.ts` - Close Interceptors
```typescript
const onBeforeCloseMap = new Map<string, OnBeforeCloseCallback>();
```
**Why**: `requestClose` and `handleDismiss` need to find a sheet's interceptor
from outside React. Written by `useOnBeforeClose`, removed by `QueueItem` on
unmount. Its presence is also what flips `preventDismiss` on the store record.

#### `portalSessionRegistry.ts` - Portal Session Counters
```typescript
const portalSessionRegistry = new Map<string, number>();
```
**Why**: `getNextPortalSession(id)` mints a monotonically increasing counter that
goes into the `Portal`/`PortalHost` name (`bottomsheet-${id}-${session}`). It
**persists across sheet deletion** on purpose — reusing a name after a replace
flow hits a react-native-teleport connection bug. Allocated once at `mount()`
for a persistent sheet, and on every open for a non-persistent portal sheet.

### Components

#### `BottomSheetManager.provider.tsx` - Root Provider
Exports `BottomSheetManagerProvider`. Wraps app with:
- `PortalProvider` (from react-native-teleport)
- `BottomSheetManagerContext` (groupId, scaleConfig)

#### `BottomSheetHost.tsx` - Sheet Queue Renderer
**Purpose**: Renders active sheets from store.
**Responsibilities**:
- Initializes coordinator subscription
- Clears group on unmount
- Renders QueueItems for each sheet

#### `QueueItem.tsx` - Individual Sheet Slot
**Purpose**: Single sheet rendering with proper z-index layering.

**Z-Index Strategy**:
```typescript
const baseZIndex = 100_000_000;

const backdropZIndex = baseZIndex + stackIndex * 2;      // 100000000, 100000002, ...
const contentZIndex  = baseZIndex + stackIndex * 2 + 1;  // 100000001, 100000003, ...
```
Even/odd pairing ensures a backdrop always renders below its own sheet's content
but above the sheet beneath it. The `baseZIndex` offset lifts the whole stack
above arbitrary app chrome — without it, any host app view with a modest
`zIndex` would paint over the sheets. Keep it when touching this.

**Rendering Modes**:
- **Portal Mode** (`usePortal: true`): Renders `<PortalHost>` that receives content from `BottomSheetPortal`
- **Inline Mode** (`usePortal: false`): Renders content directly with `BottomSheetContext.Provider`

#### `BottomSheetPortal.tsx` - Portal Mode Sheet Definition
**Uses `'use no memo'` directive** — it calls `getSheetRef(id)`, a read of a
module-global map, **during render**. That is not a reactive source, so the
compiler cannot know when the component must re-run. (Ref *cloning* is a
different thing and lives in `useBottomSheetManager`, not here.)

**Purpose**: Defines portal-based sheet content. Renders into PortalHost in QueueItem.
**When to use**: When sheet needs access to parent React context (Redux, custom contexts, etc.)

#### `BottomSheetPersistent.tsx` - Pre-Mounted Persistent Sheet
**Purpose**: Sheet that stays mounted even when closed.

**Lifecycle**:
1. On mount: `mount()` action creates sheet with `status: 'hidden'`, `keepMounted: true`
2. On open: Store moves to stack, status → 'opening'
3. On close: Status → 'hidden' (NOT removed from sheetsById)
4. On unmount: `unmount()` action removes from store

**Use Case**: Sheets with heavy state (forms, media players) that need to preserve state.

#### `BottomSheetScaleView.tsx` - Background Scale Animation
**Purpose**: Wraps app content to apply iOS-style scale animation.
**Note**: Must be sibling to `BottomSheetHost`, not parent.

#### `BottomSheetBackdrop.tsx` - Custom Backdrop
**Purpose**: Animated backdrop with opacity based on sheet's animatedIndex.
**Key**: Mounted from the sheet's first frame and faded purely by `animatedIndex`.
The store rewinds `animatedIndex` to `-1` in `open()` (`resetAnimatedIndex`), so
the fade always starts from transparent. Do **not** reintroduce a timer/delay
gate here — deferring the mount drops the opening frames the adapter has already
driven, and the backdrop pops in part-way through the fade.

### Hooks

#### `useBottomSheetManager.tsx` - Dynamic Sheet Opening
**Purpose**: Imperative API for opening sheets with content.

```typescript
const { open, close, closeAll, destroyAll } = useBottomSheetManager();

// Open with inline content (content cloned with ref).
// Returns `string | null` — null when the store declined the open.
const id = open(<MySheet />, { mode: 'push', scaleBackground: true });
if (id !== null) {
  await close(id); // Promise<CloseResult>
}

await closeAll();  // Promise<CloseAllResult>, staggered, respects interceptors
destroyAll();      // void, immediate, BYPASSES interceptors
```

There is no `clear()`. `destroyAll()` is the teardown primitive (no animation,
`onBeforeClose` never runs); `closeAll()` is the user-facing one.

`open()` is where the inline ref is minted: `React.createRef()`, cloned onto the
element, and registered in `refsMap` **only after** the store accepts the sheet.

**When to use**: Opening sheets dynamically with content as parameter.

#### `useBottomSheetControl.ts` - Portal Sheet Control
**Purpose**: Type-safe control for portal-based sheets.

```typescript
const { open, close, closeAll, updateParams, resetParams } =
  useBottomSheetControl('user-sheet');

open({ params: { userId: '123' } });  // boolean — false when declined
updateParams({ userId: '456' });
await close();                        // Promise<CloseResult>
```

Note the asymmetry with `useBottomSheetManager().open()`, which is deliberate:
both report the same rejection, each in the currency useful at that call site —
an ID you did not have, or a yes/no when you already know the ID.

**When to use**: Controlling pre-defined portal sheets with type-safe params.

#### `useBottomSheetContext.ts` - Sheet Internal Context
**Purpose**: Access current sheet's ID, params and close functions from within
the sheet. Throws outside a sheet.

```typescript
// Inside a sheet component
const { id, params, preventDismiss, close, forceClose } =
  useBottomSheetContext<'user-sheet'>();
```

`close()` respects `onBeforeClose`; `forceClose()` calls `startClosing()`
directly and bypasses it. Selectors are called with a `NO_SHEET_ID` sentinel
rather than conditionally, so the hook count stays stable before the throw.

#### `useOnBeforeClose.ts` - Close Interception
**Purpose**: Registers a callback in `onBeforeCloseRegistry` for the current
sheet, and sets `preventDismiss: true` on its store record so adapters disable
native dismiss gestures. Inside-a-sheet only.

#### `useBottomSheetStatus.ts` - Sheet Status Monitoring
**Purpose**: Observe sheet status from outside the sheet.

**Works with all sheet types**: Portal, persistent, and inline sheets.

```typescript
// Portal/persistent sheet (registered ID)
const { status, isOpen, isOpening, isClosing, isVisible } =
  useBottomSheetStatus('user-sheet');

// Inline sheet (dynamic ID from useBottomSheetManager).
// open() returns `string | null`, so guard before handing it over.
const { open } = useBottomSheetManager();
const [sheetId, setSheetId] = useState<string | null>(null);
setSheetId(open(<MySheet />));
// Later...
const { status } = useBottomSheetStatus(sheetId ?? '');
```

**BREAKING in 2.0 — `isOpen` was narrowed** to `status === 'open'`. It used to
include `'opening'`. Four flags now:

| Flag | True when |
|------|-----------|
| `isOpen` | `'open'` only — fully open and interactive |
| `isOpening` | `'opening'` |
| `isClosing` | `'closing'` |
| `isVisible` | `'opening' \| 'open' \| 'closing'` — the "on screen at all" one |

The classic bug this causes: branching on `isOpen` to choose update-vs-open.
A second call while the sheet is still `'opening'` takes the open branch and the
store rejects it as `'already-active'`. Use `isVisible` for that.

#### `useScaleAnimation.ts` - Scale Animation Logic
**Purpose**: Calculates scale animation values based on sheet depth.

**Key Concept - Power Scaling**:
```typescript
const currentScale = Math.pow(scale, depth);  // e.g., 0.92^1 = 0.92, 0.92^2 = 0.85
```
Creates cascading scale effect for nested sheets.

**Two depth hooks, and they do different things** (there is no `useScaleDepth`):

- **`useBackgroundScaleDepth(groupId)`** — for `BottomSheetScaleView`. Walks the
  group's stack from the bottom, finds the **first** sheet that is not `closing`
  or `hidden`, and returns *that sheet's* `scaleBackground` flag as `1` or `0`.
  It stops there. So a stack whose bottom-most live sheet has
  `scaleBackground: false` yields `0` no matter what sits above it — it does
  **not** count all scaling sheets. Binary on purpose: the app background scales
  once, however deep the stack goes.
- **`useSheetScaleDepth(groupId, sheetId)`** — for an individual sheet. Counts
  the live `scaleBackground` sheets strictly *above* it in its own group's
  stack, so nested sheets cascade.

`useSheetScaleDepth` returns `null` from the selector once the sheet leaves the
stack, and the caller holds the last known depth in state — a sheet mid-exit
must keep its scale rather than snap back to 0 while animating out. That hold
lives in an **effect, not the selector**: a Zustand selector runs on every store
change (twice per render under StrictMode), so a ref write inside it would make
the result depend on how often it ran (see B6 in `API-REVIEW.md`).

Public exports are the style hooks — `useBackgroundScaleAnimatedStyle()` and
`useSheetScaleAnimatedStyle(sheetId)`; the depth hooks are module-private.

#### `useSheetRenderData.ts` - Render Order Logic
**Purpose**: Determines which sheets to render and in what order.

**Render Order**:
1. Hidden persistent sheets (keepMounted=true, not in stack)
2. Active sheets (in its group's stack)

This prevents React from unmounting/remounting during state transitions.

#### `useStableCallback.ts` - Stable Callback Utility
**Purpose**: RFC useEvent implementation — stable function identity with latest closure.

**Named `useStableCallback`, not `useEvent`**, because `react-native-reanimated`
exports an unrelated `useEvent` for native event handlers and adapters import
both side by side (`SwmansionSheetAdapter` does). Do not rename it back.

**Usage**: `BottomSheetPersistent`'s mount callback. Holds the codebase's only
sanctioned `useCallback` — see the memoization section at the top.

### Adapter-Facing Hooks

All four are **public exports**, so a third-party adapter can reach parity with
the shipped ones (this was P7 in `API-REVIEW.md`).

#### `useAdapterRef.ts`
`useAdapterRef(forwardedRef)` returns the ref an adapter should pass to
`useImperativeHandle`: the one from `BottomSheetRefContext` when present
(portal/persistent), otherwise the forwarded one (inline). One line, but it is
what lets a single adapter work in all three modes.

#### `useAnimatedIndex.ts`
`ensureAnimatedIndex(id)` for the current sheet, read from context. The value is
`-1` hidden → `0` fully visible; the backdrop interpolates it.

**Drive it continuously.** Setting it discretely in expand/close snaps the
backdrop to full opacity a whole animation ahead of the sheet. That was B5, and
all three offending adapters were fixed: `CustomModalAdapter` derives it from
its own `progress` shared value, `ReactNativeModalAdapter` runs `withTiming`
over the modal's own `animationInTiming`/`OutTiming`, `ActionsSheetAdapter`
runs `withSpring` with the sheet's own open/close configs, and gorhom/swmansion
get a continuous position from the library itself.

#### `useBackHandler.ts`
`useBackHandler(id, onBackPress)`. The listener is only registered while the
sheet is fully open **and** topmost **in its own group** (via
`useIsTopmostAndOpen`, which resolves the group from the sheet). Used by gorhom,
custom-modal and swmansion; rn-modal and actions-sheet route their library's own
back callback into `handleDismiss` instead.

#### `useSetBackdrop` / `useSheetPreventDismiss` (from `store/hooks.ts`)
Re-exported from `index.tsx` for adapter authors.
- `useSetBackdrop()` returns `setBackdrop(id, boolean)` — suppress the manager's
  shared backdrop when the adapter renders its own. Only `GorhomSheetAdapter`
  uses it, and only when given a custom `backdropComponent`.
- `useSheetPreventDismiss(id)` returns whether an interceptor is blocking, so
  the adapter can disable its native gestures. Every shipped adapter reads it
  **except `CustomModalAdapter`**, which has no dismiss gesture of its own.

### Context Files

#### `BottomSheet.context.ts`
Provides current sheet ID to children. Used by `useBottomSheetContext`.

#### `BottomSheetManager.context.tsx`
Provides groupId and scaleConfig to all components within a manager.

#### `BottomSheetRef.context.ts`
Passes the sheet ref from `BottomSheetPersistent` / `BottomSheetPortal` down to
the adapter, which picks it up via `useAdapterRef()` — so the user never wires a
ref by hand. Read with `useMaybeBottomSheetRef()` (may be `null`: inline mode
has no ref context and uses the forwarded ref instead).

#### `BottomSheetDefaultIndex.context.ts`
Supplies the adapter's initial `index`: `0` from `BottomSheetPortal` (a portal
sheet renders only once it is being opened) and `-1` from
`BottomSheetPersistent` (which is mounted long before it is opened, and must
start closed). `useBottomSheetDefaultIndex()` defaults to `0` with no provider.
Currently consumed by `GorhomSheetAdapter`.

### Type Definitions

#### `portal.types.ts` - Type-Safe Portal Registry
**Purpose**: Enables type-safe sheet IDs and params via module augmentation.

```typescript
// In your app:
declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'simple-sheet': true;                    // No params
    'user-sheet': { userId: string };        // With params
  }
}
```

**Key Types** (public — exported from `index.tsx`):
- `BottomSheetPortalRegistry` - The interface consumers augment
- `BottomSheetPortalId` - Union of registered sheet IDs (or `string` if no registry)
- `BottomSheetPortalParams<T>` - Params type for a specific sheet ID. **Always
  unions `| undefined`**, even for required params, because `resetParams()` can
  clear them on an open sheet. Consumers must read `params?.foo`.

**Internal** (defined here, *not* exported from `index.tsx`):
- `HasParams<T>` - Boolean type driving whether `open()` requires a `params`
  property. Only `useBottomSheetControl` consumes it. Keep it unexported —
  exporting it would semver-lock a helper that exists to shape one signature.

---

## Sheet Lifecycle States

```
                    mount() (persistent only)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        'hidden'                              │
│  (persistent sheets only - not rendered, but in sheetsById) │
└─────────────────────────────────────────────────────────────┘
                           │
                     open() action
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       'opening'                              │
│  (coordinator calls ref.expand(), animation starting)        │
└─────────────────────────────────────────────────────────────┘
                           │
                    handleOpened()
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         'open'                               │
│  (fully visible, interactive)                                │
└─────────────────────────────────────────────────────────────┘
                           │
         startClosing() (user swipe or API call)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       'closing'                              │
│  (coordinator calls ref.close(), animation running)          │
└─────────────────────────────────────────────────────────────┘
                           │
                   handleClosed()
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ keepMounted=true │              │ keepMounted=false│
│   → 'hidden'     │              │   → REMOVED      │
└──────────────────┘              └──────────────────┘
```

---

## Three Operating Modes

This library provides three distinct ways to use bottom sheets. Each mode has different trade-offs:

| Mode | Component | Context Preserved | State Preserved | Use Case |
|------|-----------|-------------------|-----------------|----------|
| **Inline** | `useBottomSheetManager` | No | No | Dynamic, one-off sheets |
| **Portal** | `BottomSheetPortal` | Yes | No | Pre-defined sheets needing context |
| **Persistent** | `BottomSheetPersistent` | Yes | Yes | Heavy state sheets (forms, media) |

---

### 1. Inline Mode (Dynamic Content)

**Component**: `useBottomSheetManager` hook
**Flags**: `usePortal: false`, `keepMounted: false`

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

const { open, close } = useBottomSheetManager();

// Open with inline content — `string | null`
const id = open(
  <GorhomSheetAdapter snapPoints={['50%']}>
    <DynamicContent data={someData} />
  </GorhomSheetAdapter>,
  { scaleBackground: true, mode: 'push' }
);

// Close by ID — guard, since a rejected open returns null
if (id !== null) {
  await close(id);
}
```

**Data Flow**:
1. `useBottomSheetManager.open()` clones content with ref attached
2. Content stored in `sheetsById[id].content`
3. `QueueItem` renders content directly with `BottomSheetContext.Provider`
4. On close: Sheet removed from store entirely

**Characteristics**:
- Content passed as JSX parameter at runtime
- Sheet unmounted on close (state lost)
- No access to parent React context (Redux, etc.)
- Random ID generated if not provided

**Use When**:
- Sheet content determined at runtime
- Quick confirmation dialogs, alerts
- No need for parent context access
- State doesn't need to persist

---

### 2. Portal Mode (Context Preservation)

**Component**: `BottomSheetPortal`
**Flags**: `usePortal: true`, `keepMounted: false`

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

// 1. Define sheet at declaration site (near context providers)
<BottomSheetPortal id="user-sheet">
  <GorhomSheetAdapter snapPoints={['50%']}>
    <UserSheetContent />  {/* Has access to parent contexts! */}
  </GorhomSheetAdapter>
</BottomSheetPortal>

// 2. Control from anywhere
const { open, close, updateParams } = useBottomSheetControl('user-sheet');

open({ params: { userId: '123' }, scaleBackground: true });
updateParams({ userId: '456' });
close();
```

**Data Flow**:
1. `BottomSheetPortal` defines content at declaration site (renders `<Portal>`)
2. Content stays in React tree where declared (context preserved)
3. `QueueItem` provides `<PortalHost>` when sheet is in stack
4. `react-native-teleport` teleports content into PortalHost
5. On close: Sheet removed from store (content unmounts)

**Characteristics**:
- Content defined once, controlled imperatively
- Sheet unmounted on close (state lost)
- Full access to parent React context
- Type-safe params via registry augmentation
- Uses `'use no memo'` directive (React Compiler exception)

**Use When**:
- Sheet needs Redux, React Query, or custom context
- Sheet ID and structure known at compile time
- Type-safe params desired
- State doesn't need to persist across open/close

---

### 3. Persistent Mode (State Preservation)

**Component**: `BottomSheetPersistent`
**Flags**: `usePortal: true`, `keepMounted: true`

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

// 1. Define persistent sheet (content stays mounted!)
<BottomSheetPersistent id="scanner-sheet">
  <GorhomSheetAdapter snapPoints={['90%']}>
    <ScannerWithHeavyState />  {/* State preserved across close/open! */}
  </GorhomSheetAdapter>
</BottomSheetPersistent>

// 2. Control from anywhere
const { open, close } = useBottomSheetControl('scanner-sheet');

open({ scaleBackground: true });
// User interacts, builds up state...
close();
// State is NOT lost!
open();  // Reopens with previous state intact
```

**Data Flow**:
1. On component mount: `mount()` action creates sheet with `status: 'hidden'`
2. Sheet exists in `sheetsById` but NOT in its group's stack
3. On `open()`: Sheet added to its group's stack, status → 'opening'
4. On close: Status → 'hidden', removed from its group's stack but KEPT in `sheetsById`
5. Content stays mounted (just hidden), state preserved
6. On component unmount: `unmount()` removes from store completely

**Lifecycle Diagram**:
```
Component Mount → store.mount() → status: 'hidden' (in sheetsById, not in its group's stack)
                                         │
                                   open() called
                                         │
                                         ▼
                             status: 'opening' (added to its group's stack)
                                         │
                                   animation done
                                         │
                                         ▼
                                  status: 'open'
                                         │
                                  close() called
                                         │
                                         ▼
                              status: 'closing' → 'hidden'
                              (removed from its group's stack, kept in sheetsById)
                              Content stays mounted! State preserved!
                                         │
                                   open() again
                                         │
                                         ▼
                             status: 'opening' (same content, same state)
```

**Characteristics**:
- Content stays mounted even when sheet is closed
- Full state preservation (form inputs, scroll position, media playback)
- Full access to parent React context
- Uses own `useRef` for sheet reference (not createRef)
- Re-mounts automatically if cleared by `clearGroup()` during fast refresh

**Use When**:
- Heavy initialization (camera, media player, complex forms)
- User expects to return to same state
- Performance-critical (avoid remount cost)
- Long-lived sheets opened/closed frequently

---

### Mode Comparison: Store State

```
INLINE MODE (useBottomSheetManager):
┌─────────────────────────────────────────────────────┐
│ sheetsById: { 'abc123': { content: <JSX>, ... } }   │
│ stackOrderByGroup: { default: ['abc123'] }                              │
└─────────────────────────────────────────────────────┘
After close: Sheet DELETED from sheetsById

PORTAL MODE (BottomSheetPortal):
┌─────────────────────────────────────────────────────┐
│ sheetsById: { 'user-sheet': { usePortal: true } }   │
│ stackOrderByGroup: { default: ['user-sheet'] }                          │
└─────────────────────────────────────────────────────┘
After close: Sheet DELETED from sheetsById

PERSISTENT MODE (BottomSheetPersistent):
┌──────────────────────────────────────────────────────────────────┐
│ sheetsById: { 'scanner': { usePortal: true, keepMounted: true } }│
│ stackOrderByGroup: { default: ['scanner'] }                                          │
└──────────────────────────────────────────────────────────────────┘
After close: Sheet KEPT in sheetsById with status: 'hidden'
             Removed from its group's stack only
```

---

### Choosing the Right Mode

```
                    ┌─────────────────────────────┐
                    │ Need parent React context?  │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
                   NO                            YES
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐      ┌─────────────────────────┐
          │  INLINE MODE    │      │ Need state preservation │
          │ useBottomSheet- │      │   across open/close?    │
          │    Manager      │      └───────────┬─────────────┘
          └─────────────────┘                  │
                                  ┌────────────┴────────────┐
                                  │                         │
                                 NO                        YES
                                  │                         │
                                  ▼                         ▼
                        ┌─────────────────┐      ┌─────────────────┐
                        │  PORTAL MODE    │      │ PERSISTENT MODE │
                        │ BottomSheet-    │      │ BottomSheet-    │
                        │    Portal       │      │   Persistent    │
                        └─────────────────┘      └─────────────────┘
```

---

## Scale Animation System

### Configuration

```typescript
interface ScaleConfig {
  scale?: number;        // Default: 0.92 (scale factor per depth level)
  translateY?: number;   // Default: 10 (vertical shift per depth level)
  borderRadius?: number; // Default: 12 (corner radius when scaled)
  animation?: ScaleAnimationConfig;  // Timing or spring
}

type ScaleAnimationConfig =
  | { type: 'timing'; config?: WithTimingConfig }
  | { type: 'spring'; config?: WithSpringConfig };
```

### How It Works

1. **Depth Calculation** — two different hooks, see `useScaleAnimation.ts` above:
   - `useBackgroundScaleDepth(groupId)` for `BottomSheetScaleView`: binary `0`/`1`,
     taken from the `scaleBackground` flag of the **first live sheet** in the
     group's stack. It stops at that sheet — it does *not* count all scaling
     sheets, so a stack whose bottom-most live sheet is `false` yields `0`
     regardless of what is above it.
   - `useSheetScaleDepth(groupId, sheetId)` for an individual sheet: counts the
     live `scaleBackground` sheets strictly above it in its own group's stack.

2. **Power Scaling** (`p` is the animated depth; an empty style is returned when
   `p` is 0, because an identity transform on the first frame collapses layout
   in RN 0.85's animation backend):
   ```typescript
   currentScale = scale^depth      // e.g., 0.92^2 = 0.8464
   currentTranslateY = translateY * depth
   currentBorderRadius = min(borderRadius * depth, borderRadius)
   ```

3. **Animation**:
   - `useDerivedValue` computes animated progress
   - `useAnimatedStyle` applies transforms

---

## Group Isolation

Multiple `BottomSheetManagerProvider` instances can run independently:

```tsx
<BottomSheetManagerProvider id="main-group">
  {/* Main app sheets */}
</BottomSheetManagerProvider>

<BottomSheetManagerProvider id="modal-group">
  {/* Modal-specific sheets */}
</BottomSheetManagerProvider>
```

Each group:
- Has its own entry in `stackOrderByGroup`
- Stack is keyed by group, so no filtering is needed anywhere
- `clearGroup(groupId)` clears only that group

---

## Code Conventions

### TypeScript
- Strict mode enabled
- `noUncheckedIndexedAccess: true` - Always check map/array access
- `verbatimModuleSyntax: true` - Explicit `type` imports

### Zustand Patterns
- Use `shallow` comparison for object selectors
- Use `subscribeWithSelector` for coordinator subscription
- Never store refs in store (use global maps instead)

### Animation Patterns
- Use `react-native-reanimated` worklets
- Shared values via `makeMutable()` for global access
- `useAnimatedStyle` for animated components

### Ref Handling
- Global refs map instead of context drilling
- `createRef` for dynamic sheets
- `useRef` for persistent sheets

---

## Testing Utilities

```typescript
import { resetBottomSheetRegistries } from 'react-native-bottom-sheet-stack/testing';

// Clears the store and every module-level registry (refs, animated values,
// portal sessions, onBeforeClose). One call, so it cannot go stale as
// registries are added.
beforeEach(resetBottomSheetRegistries);
```

---

## Common Patterns

### Opening a Sheet with Scale

```typescript
// Portal mode
const { open } = useBottomSheetControl('my-sheet');
open({ scaleBackground: true });

// Inline mode
const { open } = useBottomSheetManager();
open(<MySheet />, { scaleBackground: true });
```

### Updating Sheet Params

```typescript
const { updateParams, resetParams } = useBottomSheetControl('user-sheet');

// Update
updateParams({ userId: newId });

// Reset to undefined
resetParams();
```

### Accessing Params Inside Sheet

```typescript
function UserSheet() {
  const { params, close } = useBottomSheetContext<'user-sheet'>();
  // params is typed as { userId: string } | undefined
}
```

### Navigation Modes

```typescript
// Push: Stack sheets (both visible)
open({ mode: 'push' });

// Switch: Hide previous, show new (can restore)
open({ mode: 'switch' });

// Replace: Close previous, show new (cannot restore)
open({ mode: 'replace' });
```

---

## File Structure Summary

```
src/
├── index.tsx                    # Public exports (no 3rd-party adapter deps)
├── testing.ts                   # → 'react-native-bottom-sheet-stack/testing'
├── store/                       # Zustand store (store/hooks/helpers/types)
├── bottomSheetCoordinator.ts    # Store ↔ adapter sync
├── refsMap.ts                   # Global sheet refs registry
├── animatedRegistry.ts          # Global animated values registry
├── onBeforeCloseRegistry.ts     # Global close-interceptor registry
├── portalSessionRegistry.ts     # Global portal session counters
├── adapter.types.ts             # SheetAdapterRef, SheetAdapterEvents types
├── portal.types.ts              # Type-safe portal registry types
│
├── BottomSheetManager.provider.tsx     # Root provider component
├── BottomSheetManager.context.tsx      # Manager context + useMaybe… hooks
├── BottomSheet.context.ts              # Sheet context definition
├── BottomSheetRef.context.ts           # Ref context definition
├── BottomSheetDefaultIndex.context.ts  # Initial adapter index (0 portal / -1 persistent)
│
├── BottomSheetHost.tsx          # Sheet queue renderer
├── QueueItem.tsx                # Individual sheet slot
├── BottomSheetPortal.tsx        # Portal mode definition ('use no memo')
├── BottomSheetPersistent.tsx    # Persistent sheet component
├── BottomSheetScaleView.tsx     # Background scale wrapper
├── BottomSheetBackdrop.tsx      # Custom backdrop component
│
├── useBottomSheetManager.tsx    # Dynamic sheet opening hook
├── useBottomSheetControl.ts     # Portal sheet control hook
├── useBottomSheetContext.ts     # Sheet internal context hook
├── useBottomSheetStatus.ts      # External status monitoring hook
├── useOnBeforeClose.ts          # Close interception hook
├── useAdapterRef.ts             # Adapter ref helper hook
├── useAnimatedIndex.ts          # Animated index context hook
├── useBackHandler.ts            # Android back button handler
├── useScaleAnimation.ts         # Scale animation hooks
├── useSheetRenderData.ts        # Render order computation hook
├── useStableCallback.ts         # Stable callback utility (RFC useEvent)
│
└── adapters/                    # Each adapter is a separate subpath export
    ├── gorhom-sheet/            # → 'react-native-bottom-sheet-stack/gorhom'
    │   ├── index.ts
    │   └── GorhomSheetAdapter.tsx
    ├── custom-modal/            # → 'react-native-bottom-sheet-stack' (main)
    │   ├── index.ts
    │   └── CustomModalAdapter.tsx
    ├── react-native-modal/      # → 'react-native-bottom-sheet-stack/react-native-modal'
    │   ├── index.ts
    │   └── ReactNativeModalAdapter.tsx
    ├── actions-sheet/           # → 'react-native-bottom-sheet-stack/actions-sheet'
    │   ├── index.ts
    │   └── ActionsSheetAdapter.tsx
    └── swmansion/               # → 'react-native-bottom-sheet-stack/swmansion'
        ├── index.ts
        ├── SwmansionSheetAdapter.tsx
        └── SwmansionKeyboardInset.tsx  # keyboardBehavior="inset" (optional peer)
```

Note there is no `adapters/index.ts` barrel — it was deleted. A barrel would
import every adapter, which is exactly the Metro resolution error the subpath
exports exist to avoid. Import each adapter from its own directory.

---

## Dependencies Graph

```
CORE (main entry — no 3rd-party bottom sheet deps):
react-native-reanimated ──────▶ bottomSheetCoordinator, useScaleAnimation
zustand ──────────────────────▶ store/ (store.ts, hooks.ts)
react-native-teleport ────────▶ BottomSheetPortal, BottomSheetPersistent, QueueItem
react-native-safe-area-context ▶ QueueItem (useSafeAreaFrame)

ADAPTERS (separate subpath exports — isolated dependency trees):
react-native-bottom-sheet-stack/gorhom:
  @gorhom/bottom-sheet ────────▶ GorhomSheetAdapter
  react-native-gesture-handler ─▶ (peer of @gorhom/bottom-sheet)

react-native-bottom-sheet-stack/react-native-modal:
  react-native-modal ──────────▶ ReactNativeModalAdapter

react-native-bottom-sheet-stack/actions-sheet:
  react-native-actions-sheet ──▶ ActionsSheetAdapter

react-native-bottom-sheet-stack/swmansion:
  @swmansion/react-native-bottom-sheet ──▶ SwmansionSheetAdapter
  (Fabric native component — requires New Architecture, RN >= 0.76, and the
   sheet library >= 0.16: geometry is measured natively from 0.16 on, and the
   backdrop fade rides its rewritten position-follower path)
  react-native-keyboard-controller ──────▶ SwmansionKeyboardInset (OPTIONAL peer;
    lazy require, only used by keyboardBehavior="inset"; degrades gracefully)
```

**SwmansionSheetAdapter constraints** (learned the hard way — don't regress):
- The native `scrimColor` / `scrimOpacities` are gated on `modal` sheets on both
  platforms. The manager always renders inline, so those props can never paint —
  the adapter does not accept them. Use `backdrop: false` to suppress instead.
- `fullHeight` passes a detent taller than any screen and lets native clamp it to
  the measured cap. Do **not** recompute `windowHeight - insets.top` in JS: since
  0.16 there is no JS-provided cap, and a JS estimate ignores the fact that the
  sheet lives inside the manager's `QueueItem` layer.
- `detached` wraps the sheet in an inset frame that the native host fills, so the
  natively measured detent cap shrinks with it and `'content'` / `fullHeight`
  stay correct. The frame's `overflow: 'hidden'` is **required**: the native
  sheet container is a full-canvas view translated to the current position and
  sets `clipsToBounds = false` / `clipChildren = false`, so its surface hangs
  below the host and would paint over the bottom gap.

---

## Subpath Exports Architecture

Adapters with 3rd-party dependencies are shipped as **separate subpath exports** so the main entry point never causes Metro resolution errors for uninstalled libraries.

**package.json `exports` field**:
```json
{
  ".": "./lib/commonjs/index.js",
  "./testing": "./lib/commonjs/testing.js",
  "./gorhom": "./lib/commonjs/adapters/gorhom-sheet/index.js",
  "./react-native-modal": "./lib/commonjs/adapters/react-native-modal/index.js",
  "./actions-sheet": "./lib/commonjs/adapters/actions-sheet/index.js",
  "./swmansion": "./lib/commonjs/adapters/swmansion/index.js"
}
```

**Import patterns**:
```typescript
// Core — safe to import without any adapter deps installed
import { BottomSheetManagerProvider, useBottomSheetManager } from 'react-native-bottom-sheet-stack';
import { CustomModalAdapter } from 'react-native-bottom-sheet-stack'; // zero deps

// Adapters — import only when the underlying library is installed
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';
import { ReactNativeModalAdapter } from 'react-native-bottom-sheet-stack/react-native-modal';
import { ActionsSheetAdapter } from 'react-native-bottom-sheet-stack/actions-sheet';
import { SwmansionSheetAdapter } from 'react-native-bottom-sheet-stack/swmansion';
```

**Deprecated aliases were removed in 2.0**: use `GorhomSheetAdapter` / `GorhomSheetAdapterProps`, `CustomModalAdapter`, `useBottomSheetContext`, `open`, `close` and `destroyAll` directly.

**One exception to that renaming**: `CustomModalAdapter`'s props type is still
exported as **`ModalAdapterProps`**, not `CustomModalAdapterProps`. The component
was renamed; the props type was not. Don't "fix" this without a major bump.

**Example app (monorepo dev)**: RNBB's `babel-plugin-module-resolver` alias breaks subpath imports. The example's `babel.config.js` adds a separate module-resolver plugin with explicit subpath aliases that runs before RNBB's override. Consumer apps do NOT need this — Metro reads `exports` from package.json directly.

---

## Pitfalls to Avoid

1. **DO NOT memoize** - React Compiler handles it. `useStableCallback` is the one sanctioned exception
2. **DO NOT store refs in Zustand** - Use refsMap instead
3. **DO NOT forget `BottomSheetHost`** - Sheets won't render without it
4. **DO NOT nest `BottomSheetScaleView` around `BottomSheetHost`** - They must be siblings
5. **DO NOT use same sheet ID in multiple groups** - IDs must be globally unique; the store rejects a cross-group open with `'group-mismatch'`
6. **DO NOT call `open()` on an already-open sheet** - It does not open, returns `{ opened: false, reason: 'already-active' }` and warns in `__DEV__`. Use `updateParams()` to change an open sheet, or close it first
7. **DO NOT export 3rd-party adapters from `src/index.tsx`** - They must use subpath exports to avoid Metro resolution errors
8. **DO NOT set `animatedIndex` discretely in an adapter** - The backdrop snaps a whole animation ahead of the sheet. Animate it alongside your own animation
9. **DO NOT branch on `isOpen` for "is it on screen"** - It excludes `'opening'`. Use `isVisible`
10. **DO NOT read `params` without `?.`** - `BottomSheetPortalParams<T>` always unions `| undefined`
