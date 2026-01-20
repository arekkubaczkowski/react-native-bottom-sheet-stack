---
sidebar_position: 2
---

# Hooks

## useBottomSheetManager

Main hook for opening and managing bottom sheets.

```tsx
const {
  openBottomSheet,
  close,
  clearAll,
} = useBottomSheetManager();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `openBottomSheet` | `(content, options?) => string` | Opens a bottom sheet and returns its ID |
| `close` | `(id: string) => void` | Closes a specific sheet by ID |
| `clearAll` | `() => void` | Closes all sheets in the stack |

### openBottomSheet Options

```tsx
openBottomSheet(<MySheet />, {
  mode: 'push',           // 'push' | 'switch' | 'replace'
  scaleBackground: true,  // Enable scale animation
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'push' \| 'switch' \| 'replace'` | `'push'` | Navigation mode |
| `scaleBackground` | `boolean` | `false` | Enable background scaling |

---

## useBottomSheetState

Use inside a bottom sheet component to access its state, params, and close function.

```tsx
// Basic usage
const { bottomSheetState, close } = useBottomSheetState();

// With typed params (for portal sheets)
const { params, close } = useBottomSheetState<'my-sheet'>();
```

### Generic Parameter

Pass the portal sheet ID as a generic to get typed params:

```tsx
// If registry defines: 'user-sheet': { userId: string }
const { params } = useBottomSheetState<'user-sheet'>();
console.log(params.userId); // ✅ type-safe: string
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `bottomSheetState` | `BottomSheetState` | Current sheet's state object |
| `params` | `BottomSheetPortalParams<T>` or `unknown` | Type-safe params when generic provided, `unknown` otherwise |
| `close` | `() => void` | Closes this sheet |
| `closeBottomSheet` | `() => void` | Alias for `close` |

### BottomSheetState

```tsx
interface BottomSheetState {
  id: string;
  status: 'opening' | 'open' | 'closing' | 'hidden';
  groupId: string;
  params?: Record<string, unknown>;
  // ...
}
```

---

## useBottomSheetControl

Control portal-based sheets declared with `BottomSheetPortal`.

```tsx
const {
  open,
  close,
  isOpen,
  status,
} = useBottomSheetControl('my-sheet');
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `BottomSheetPortalId` | The portal sheet ID to control |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `open` | `(options?) => void` | Opens the sheet (see below for params) |
| `close` | `() => void` | Closes the sheet |
| `isOpen` | `boolean` | Whether sheet is open or opening |
| `status` | `BottomSheetStatus \| null` | Current status |

### open Options

The `open` function accepts options including type-safe `params`:

```tsx
// Sheet without params (registry: 'simple-sheet': true)
open();
open({ scaleBackground: true });

// Sheet with params (registry: 'user-sheet': { userId: string })
open({
  scaleBackground: true,
  params: { userId: '123' }  // Required when params defined in registry
});
```

| Option | Type | Description |
|--------|------|-------------|
| `scaleBackground` | `boolean` | Enable background scaling |
| `params` | `BottomSheetPortalParams<T>` | Type-safe params (required if defined in registry) |

### Status Values

| Status | Description |
|--------|-------------|
| `'opening'` | Sheet is animating open |
| `'open'` | Sheet is fully open |
| `'closing'` | Sheet is animating closed |
| `'hidden'` | Sheet is hidden (switch mode) |
| `null` | Sheet has not been opened |
