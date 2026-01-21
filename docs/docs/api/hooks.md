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

---

## useBottomSheetManager

Main hook for opening and managing bottom sheets imperatively.

```tsx
const { open, close, clear } = useBottomSheetManager();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(content, options?) => string` | Opens a bottom sheet and returns its ID |
| `close` | `(id: string) => void` | Closes a specific sheet by ID |
| `clear` | `() => void` | Closes all sheets in the current group |

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
This hook can **only** be used inside a `BottomSheetManaged` component. It reads from React context - no ID parameter needed.
:::

```tsx
// Basic usage
const { id, params, close } = useBottomSheetContext();

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
| `close` | `() => void` | Closes this sheet |

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
const { open, close, updateParams, resetParams } = useBottomSheetControl('my-sheet');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `BottomSheetPortalId` | The portal sheet ID to control |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(options?) => void` | Opens the sheet |
| `close` | `() => void` | Closes the sheet |
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

:::tip When to Use
Use this when you need to show UI based on whether a sheet is open, or react to status changes. Separate from `useBottomSheetControl` to avoid unnecessary re-renders in components that only need to trigger sheets.
:::

```tsx
const { status, isOpen } = useBottomSheetStatus('my-sheet');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `BottomSheetPortalId` | The sheet ID to observe |

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
