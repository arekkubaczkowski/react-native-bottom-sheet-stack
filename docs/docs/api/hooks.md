---
sidebar_position: 2
---

# Hooks

Hooks fall into two groups: the ones you use to drive sheets from your app, and
the ones an [adapter](/custom-adapters) uses to wire a UI library into the stack.

### App hooks

| Hook | Where to use | Purpose |
|------|--------------|---------|
| `useBottomSheetManager` | Anywhere | Open/close sheets imperatively |
| `useBottomSheetControl` | Anywhere | Control portal-based sheets |
| `useBottomSheetStatus` | Anywhere | Subscribe to sheet status by ID |
| `useBottomSheetContext` | **Inside sheet only** | Access current sheet's state and params |
| `useOnBeforeClose` | **Inside sheet only** | Intercept close and optionally prevent it |

### Adapter hooks

Exported for [custom adapter authors](/custom-adapters) — every shipped adapter
is built from these. You do not need them to use the library.

| Hook | Where to use | Purpose |
|------|--------------|---------|
| `useAdapterRef` | **Inside adapter only** | Resolve the right ref for inline/portal/persistent mode |
| `useAnimatedIndex` | **Inside adapter only** | The sheet's `animatedIndex` shared value, driving backdrop and scale |
| `useBackHandler` | **Inside adapter only** | Android back button, scoped to the topmost open sheet **of its own group** |
| `useAdapterBackdrop` | **Inside adapter only** | Applies the adapter's `backdrop` prop (`BackdropConfig \| false`) to the sheet — see [Backdrop](/backdrop) |
| `useSetBackdrop` | Anywhere | Returns `setBackdrop(id, value)` — `false` suppresses the manager's shared backdrop, a `BackdropConfig` restyles/replaces it, `true` clears the override |
| `useSheetPreventDismiss` | Anywhere | `useSheetPreventDismiss(id)` — whether an interceptor is currently blocking dismissal, so the adapter can disable native gestures |

---

## useBottomSheetManager

Main hook for opening and managing bottom sheets imperatively.

```tsx
const { open, close, closeAll, closeTo, closeDepth, destroyAll } =
  useBottomSheetManager();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(content, options?) => string \| null` | Opens a bottom sheet and returns its ID, or `null` if the store declined |
| `close` | `(id: string) => Promise<CloseResult>` | Closes a specific sheet by ID |
| `closeAll` | `(options?) => Promise<CloseAllResult>` | Closes the group's sheets with cascading animation |
| `closeTo` | `(id, options?) => Promise<CloseAllResult>` | Closes down to `id`, leaving it open |
| `closeDepth` | `(count, options?) => Promise<CloseAllResult>` | Closes at most `count` sheets from the top |
| `destroyAll` | `() => void` | Removes all sheets immediately — no animation, **bypasses `onBeforeClose`** |

### Cascade options

`closeAll()` walks the group from the top down with a staggered animation, and
respects [`useOnBeforeClose`](#useonbeforeclose) interceptors — if one blocks,
the cascade stops there and the sheets below it stay open.

```tsx
await closeAll();                  // default 100ms stagger
await closeAll({ stagger: 200 });  // slower
await closeAll({ stagger: 0 });    // all at once
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stagger` | `number` | `100` | Delay in ms between each cascading close |
| `until` | `string` | — | Stop at this sheet instead of emptying the group |
| `inclusive` | `boolean` | `false` | Whether the `until` sheet closes as well |
| `depth` | `number` | — | Close at most this many sheets, counting from the top |

### Closing part of the stack

`closeTo()` and `closeDepth()` are the same cascade with one bound pre-filled —
the stack equivalent of navigating back rather than starting over.

```tsx
await closeTo('checkout');            // everything above 'checkout' goes
await closeTo('checkout', { inclusive: true });  // 'checkout' too
await closeDepth(2);                  // just the top two
```

An `until` that is not on this group's stack closes **nothing** — a bounded call
must not fall back to emptying the group. It warns in `__DEV__`. A `depth` of
zero or less closes nothing; one past the stack's height empties it.

With both bounds set, whichever closes fewer sheets wins.

From inside a sheet, [`closeAbove()`](#usebottomsheetcontext) does the same
without naming your own ID.

### open Options

```tsx
open(<MySheet />, {
  id: 'my-sheet-id',        // Custom ID (optional)
  groupId: 'my-group',      // Custom group (optional)
  mode: 'push',             // 'push' | 'switch' | 'replace'
  scaleBackground: true,    // Enable scale animation
  params: { userId: '1' },  // Readable via useBottomSheetContext()
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | random | Custom sheet ID |
| `groupId` | `string` | context or `'default'` | Group ID for the sheet |
| `mode` | `OpenMode` | `'push'` | Navigation mode |
| `scaleBackground` | `boolean` | `false` | Enable background scaling |
| `backdrop` | `boolean` | `true` | **Deprecated.** Configure the backdrop on the adapter (`backdrop={false}`, or a `BackdropConfig`) or on the provider instead — the adapter prop works in all three modes and can restyle, not just disable. See [Backdrop → Deprecations](/backdrop#deprecations). |
| `params` | `Record<string, unknown>` | - | Params for the sheet, readable inside it via `useBottomSheetContext()`. Untyped here — the typed variant lives on `useBottomSheetControl` |

`open()` returns the sheet's ID, or **`null`** when the store declined to open it — because the sheet is already on the stack, or another sheet in the group is still animating open. A dev-mode warning explains which.

```tsx
const id = open(<MySheet />);
if (id === null) {
  // Not opened. Nothing to close, nothing to track.
}
```

### `destroyAll()` vs `closeAll()`

| | `closeAll()` | `destroyAll()` |
|---|---|---|
| Animation | staggered cascade | none |
| `onBeforeClose` | respected | **bypassed** |
| Returns | `Promise<CloseAllResult>` | `void` |

`destroyAll()` is a teardown primitive — it drops every sheet in the group from the store immediately, without asking an interceptor that may be guarding unsaved work. Use `closeAll()` for anything user-facing.

### Close results

Every `close()` resolves to a `CloseResult`, and `closeAll()` to a `CloseAllResult`. Both carry more than a boolean, because "the user declined" and "there was nothing to close" are different answers:

```tsx
const result = await close(id);
if (!result.closed) {
  switch (result.reason) {
    case 'blocked':            // an onBeforeClose interceptor said no
    case 'interceptor-error':  // the interceptor threw; cancelled for safety
    case 'not-closable':       // already closing, hidden, or unknown sheet
  }
}

const cascade = await closeAll();
if (!cascade.completed) {
  // cascade.stoppedAt — the sheet whose interceptor stopped it.
  // cascade.closed    — the ones that did close, topmost first.
}
```

A sheet with nothing to close no longer stops a cascade — only a refusal does.

---

## useBottomSheetContext

Access the current sheet's state, params, and close function.

:::warning Inside Sheet Only
This hook can **only** be used inside a sheet adapter component (e.g. `GorhomSheetAdapter`, `CustomModalAdapter`). It reads from React context - no ID parameter needed.
:::

```tsx
// Basic usage
const { id, params, close, closeAbove, forceClose } = useBottomSheetContext();

// With typed params (for portal sheets)
const { params, close } = useBottomSheetContext<'my-sheet'>();
```

### Generic Parameter

Pass the portal sheet ID as a generic to get typed params:

```tsx
// If registry defines: 'user-sheet': { userId: string }
const { params } = useBottomSheetContext<'user-sheet'>();
console.log(params?.userId); // type-safe: string | undefined
```

:::note Always optional
`BottomSheetPortalParams<T>` resolves to `{ userId: string } | undefined`, even
when the registry marks the params as required. `resetParams()` can clear them
while the sheet is open, so the sheet must handle their absence — under `strict`,
`params.userId` is a type error. Read them with `params?.userId`.
:::

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Current sheet's ID |
| `params` | `BottomSheetPortalParams<T>` or `unknown` | Type-safe params when generic provided |
| `preventDismiss` | `boolean` | Whether dismissal is currently blocked for this sheet (set via `useOnBeforeClose`). Useful for UI that should reflect it — e.g. hiding a grab handle. |
| `close` | `() => Promise<CloseResult>` | Closes this sheet (respects `useOnBeforeClose`). See [Close results](#close-results). |
| `closeAbove` | `(options?) => Promise<CloseAllResult>` | Closes every sheet stacked above this one, leaving this one open. Pass `inclusive` to close this one too. |
| `forceClose` | `() => void` | Closes this sheet immediately, bypassing any `useOnBeforeClose` interceptor |

`closeAbove()` is the common case for a sheet deep in a stack: finish here, then
land back on this screen rather than an empty one — without naming your own ID
or counting how many sheets are above you.

```tsx
await closeAbove();                     // land back on this sheet
await closeAbove({ inclusive: true });  // and close this one as well
```

---

## useBottomSheetControl

Control portal-based sheets from anywhere in your app. Pass the sheet ID to identify which sheet to control.

:::tip No Re-renders
Returns only methods - no state subscriptions. Use `useBottomSheetStatus` separately if you need to react to status changes.
:::

```tsx
const { open, close, closeAll, updateParams, resetParams } = useBottomSheetControl('my-sheet');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `BottomSheetPortalId` | The portal sheet ID to control |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(options?) => boolean` | Opens the sheet. `false` if the store declined |
| `close` | `() => Promise<CloseResult>` | Closes the sheet (respects `useOnBeforeClose`) |
| `closeAll` | `(options?) => Promise<CloseAllResult>` | Closes all sheets with cascading animation |
| `updateParams` | `(params) => void` | Updates the sheet's params |
| `resetParams` | `() => void` | Resets params to `undefined` |

### open Options

```tsx
// Sheet without params (registry: 'simple-sheet': true)
open();
open({ scaleBackground: true });

// Sheet with params (registry: 'user-sheet': { userId: string })
open({
  mode: 'push',
  scaleBackground: true,
  params: { userId: '123' }  // Required when params defined in registry
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `OpenMode` | `'push'` | Navigation mode |
| `scaleBackground` | `boolean` | `false` | Enable background scaling |
| `backdrop` | `boolean` | `true` | **Deprecated.** Configure the backdrop on the adapter (`backdrop={false}`, or a `BackdropConfig`) or on the provider instead — the adapter prop works in all three modes and can restyle, not just disable. See [Backdrop → Deprecations](/backdrop#deprecations). |
| `params` | `BottomSheetPortalParams<T>` | - | Type-safe params |

`useBottomSheetManager().open()` also accepts `params` now, so inline sheets can read them from `useBottomSheetContext()` just like portal sheets.

---

## useBottomSheetStatus

Subscribe to any sheet's status from anywhere in your app. Pass the sheet ID to identify which sheet to observe.

:::tip Works with All Sheet Types
This hook accepts any string ID, so it works with portal sheets, persistent sheets, and inline sheets (using the ID returned from `useBottomSheetManager().open()`).
:::

```tsx
// Portal/persistent sheet
const { status, isOpen } = useBottomSheetStatus('my-sheet');

// Inline sheet (using ID from open())
const { open } = useBottomSheetManager();
const [sheetId, setSheetId] = useState<string | null>(null);

const handleOpen = () => {
  // open() returns `string | null` — null means the store declined
  setSheetId(open(<MySheet />));
};

// The hook needs a string, so fall back to an ID that matches nothing
const { status, isOpen } = useBottomSheetStatus(sheetId ?? '');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `BottomSheetPortalId \| (string & {})` | The sheet ID to observe. Registered portal IDs get completion; the random IDs from `open()` are accepted too |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `status` | `BottomSheetStatus \| null` | Current status or `null` if never opened |
| `isOpen` | `boolean` | Fully open and interactive — **not** during the opening animation |
| `isOpening` | `boolean` | Animating in |
| `isClosing` | `boolean` | Animating out |
| `isVisible` | `boolean` | On screen in any form: opening, open, or closing |

:::warning `isOpen` narrowed in 2.0
It used to be `true` during the opening animation as well. If you were using it to mean "on screen", switch to `isVisible`.
:::

### Status Values

| Status | Description |
|--------|-------------|
| `'opening'` | Sheet is animating open |
| `'open'` | Sheet is fully open |
| `'closing'` | Sheet is animating closed |
| `'hidden'` | Sheet is hidden (switch mode) |
| `null` | Sheet has not been opened |

### Example: Separating Control and Status

```tsx
function MyComponent() {
  // No re-renders from this hook
  const { open, close } = useBottomSheetControl('my-sheet');

  return <Button onPress={() => open()} title="Open" />;
}

function StatusIndicator() {
  // Only this component re-renders on status changes
  const { isOpen } = useBottomSheetStatus('my-sheet');

  return <Text>{isOpen ? 'Sheet is open' : 'Sheet is closed'}</Text>;
}
```

---

## useOnBeforeClose

Registers an interceptor that runs before the sheet closes. Receives `onConfirm` and `onCancel` callbacks to call when the user makes a decision.

:::warning Inside Sheet Only
This hook can **only** be used inside a sheet adapter component. It reads from React context — no ID parameter needed.
:::

```tsx
import { useOnBeforeClose } from 'react-native-bottom-sheet-stack';

function MySheet() {
  const [dirty, setDirty] = useState(false);

  useOnBeforeClose(({ onConfirm, onCancel }) => {
    if (!dirty) {
      onConfirm(); // Allow close immediately
      return;
    }

    Alert.alert('Discard?', '', [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Discard', onPress: onConfirm },
    ]);
  });

  // ...
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `OnBeforeCloseCallback` | Function called before close. Call `onConfirm()` to allow or `onCancel()` to block. |

### Callback Signature

```tsx
type OnBeforeCloseCallback = (context: {
  onConfirm: () => void;
  onCancel: () => void;
}) => void | boolean | Promise<boolean>;
```

**Callback Pattern (Recommended):**
- Call `onConfirm()` — close proceeds
- Call `onCancel()` — close is cancelled
- Perfect for `Alert.alert` and `closeAll()` integration

**Backward Compatible Patterns:**
- Return `true` — close proceeds normally
- Return `false` — close is cancelled
- Return `Promise<boolean>` — async confirmation supported
- If the promise rejects — close is cancelled for safety

### Behavior

When active, the hook:
1. Sets `preventDismiss` on the sheet so adapters block native dismiss gestures (swipe, pan-to-close)
2. Intercepts all close paths: `close()`, backdrop tap, back button, `closeAll()`
3. With callback pattern, `closeAll()` waits for user decision before continuing cascade

Use `forceClose()` from `useBottomSheetContext` to bypass the interceptor entirely.

See [Close Interception](/close-interception) for detailed guide and examples.

---

## Testing

Test helpers ship on the `react-native-bottom-sheet-stack/testing` subpath, so
they stay out of your production bundle.

```tsx
import { resetBottomSheetRegistries } from 'react-native-bottom-sheet-stack/testing';

beforeEach(resetBottomSheetRegistries);
```

### resetBottomSheetRegistries

Clears the store **and** every module-level registry the library keeps: sheet
refs, animated index values, portal sessions and `onBeforeClose` interceptors.

Those registries are module state, so they outlive React. Without this, a test
that opens a sheet leaves its ref and animated value behind for the next test,
which then sees a sheet it never opened. Prefer this one call over resetting
registries by hand — it cannot go out of date as registries are added.

| Export | Type | Description |
|--------|------|-------------|
| `resetBottomSheetRegistries` | `() => void` | Clears the store and all registries |

:::warning Tests only
Nothing on this subpath is meant for application code. It clears state without
running animations or `onBeforeClose` interceptors.
:::
