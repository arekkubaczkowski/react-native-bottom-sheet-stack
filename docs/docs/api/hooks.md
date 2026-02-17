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
const { open, close, closeAll, clear } = useBottomSheetManager();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(content, options?) => string` | Opens a bottom sheet and returns its ID |
| `close` | `(id: string) => void` | Closes a specific sheet by ID |
| `closeAll` | `(options?) => Promise<void>` | Closes all sheets with cascading animation |
| `clear` | `() => void` | Removes all sheets immediately (no animation) |

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

### Deprecated Aliases

| Deprecated | Use Instead |
|------------|-------------|
| `openBottomSheet` | `open` |
| `clearAll` | `clear` |

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
| `close` | `() => void` | Closes this sheet (respects `useOnBeforeClose`) |
| `forceClose` | `() => void` | Closes this sheet immediately, bypassing any `useOnBeforeClose` interceptor |

### Deprecated Aliases

| Deprecated | Use Instead |
|------------|-------------|
| `useBottomSheetState` | `useBottomSheetContext` |
| `closeBottomSheet` | `close` |

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
| `open` | `(options?) => void` | Opens the sheet |
| `close` | `() => void` | Closes the sheet (respects `useOnBeforeClose`) |
| `closeAll` | `(options?) => Promise<void>` | Closes all sheets with cascading animation |
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
| `params` | `BottomSheetPortalParams<T>` | - | Type-safe params |

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
| `id` | `string` | The sheet ID to observe (portal ID or inline sheet ID) |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `status` | `BottomSheetStatus \| null` | Current status or `null` if never opened |
| `isOpen` | `boolean` | `true` if status is `'open'` or `'opening'` |

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
