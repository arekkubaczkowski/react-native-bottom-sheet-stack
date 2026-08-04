---
sidebar_position: 2
---

# Hooks

Hooks are divided into two categories based on where they can be used:

| Hook | Where to use | Purpose |
|------|--------------|---------|
| `useBottomSheetManager` | Anywhere | Open/close sheets imperatively |
| `useBottomSheetControl` | Anywhere | Control portal-based sheets |
| `useBottomSheetStatus` | Anywhere | Subscribe to sheet status by ID |
| `useBottomSheetContext` | **Inside sheet only** | Access current sheet's state and params |
| `useOnBeforeClose` | **Inside sheet only** | Intercept close and optionally prevent it |

---

## useBottomSheetManager

Main hook for opening and managing bottom sheets imperatively.

```tsx
const { open, close, closeAll, destroyAll } = useBottomSheetManager();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(content, options?) => string \| null` | Opens a bottom sheet and returns its ID, or `null` if the store declined |
| `close` | `(id: string) => Promise<CloseResult>` | Closes a specific sheet by ID |
| `closeAll` | `(options?) => Promise<CloseAllResult>` | Closes all sheets with cascading animation |
| `destroyAll` | `() => void` | Removes all sheets immediately — no animation, **bypasses `onBeforeClose`** |

### closeAll Options

Closes all sheets in the group from top to bottom with a staggered animation. Respects [`useOnBeforeClose`](#useonbeforeclose) interceptors — if one blocks, the cascade stops.

```tsx
// Default stagger (100ms between each close)
await closeAll();

// Custom stagger
await closeAll({ stagger: 200 });

// No stagger (all close at once)
await closeAll({ stagger: 0 });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stagger` | `number` | `100` | Delay in ms between each cascading close |

### open Options

```tsx
open(<MySheet />, {
  id: 'my-sheet-id',      // Custom ID (optional)
  groupId: 'my-group',    // Custom group (optional)
  mode: 'push',           // 'push' | 'switch' | 'replace'
  scaleBackground: true,  // Enable scale animation
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | random | Custom sheet ID |
| `groupId` | `string` | context or `'default'` | Group ID for the sheet |
| `mode` | `OpenMode` | `'push'` | Navigation mode |
| `scaleBackground` | `boolean` | `false` | Enable background scaling |
| `backdrop` | `boolean` | `true` | When `false`, the manager's shared backdrop is not rendered for this sheet. Built-in adapters set this automatically when you give them their own backdrop (e.g. a custom gorhom `backdropComponent`), so you rarely set it by hand. |

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
if (!cascade.closedAll) {
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
const { id, params, close, forceClose } = useBottomSheetContext();

// With typed params (for portal sheets)
const { params, close } = useBottomSheetContext<'my-sheet'>();
```

### Generic Parameter

Pass the portal sheet ID as a generic to get typed params:

```tsx
// If registry defines: 'user-sheet': { userId: string }
const { params } = useBottomSheetContext<'user-sheet'>();
console.log(params.userId); // type-safe: string
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Current sheet's ID |
| `params` | `BottomSheetPortalParams<T>` or `unknown` | Type-safe params when generic provided |
| `preventDismiss` | `boolean` | Whether dismissal is currently blocked for this sheet (set via `useOnBeforeClose`). Useful for UI that should reflect it — e.g. hiding a grab handle. |
| `close` | `() => Promise<CloseResult>` | Closes this sheet (respects `useOnBeforeClose`). See [Close results](#close-results). |
| `forceClose` | `() => void` | Closes this sheet immediately, bypassing any `useOnBeforeClose` interceptor |

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
| `backdrop` | `boolean` | `true` | When `false`, the manager's shared backdrop is not rendered for this sheet. Built-in adapters set this automatically when given their own native backdrop/scrim, so you rarely set it by hand. |
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
const sheetId = open(<MySheet />);
// ...
const { status, isOpen } = useBottomSheetStatus(sheetId);
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
