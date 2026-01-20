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

Use inside a bottom sheet component to access its state and close function.

```tsx
const {
  bottomSheetState,
  close,
} = useBottomSheetState();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `bottomSheetState` | `BottomSheetState` | Current sheet's state object |
| `close` | `() => void` | Closes this sheet |

### BottomSheetState

```tsx
interface BottomSheetState {
  id: string;
  status: 'opening' | 'open' | 'closing' | 'hidden';
  groupId: string;
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
| `open` | `(options?) => void` | Opens the sheet |
| `close` | `() => void` | Closes the sheet |
| `isOpen` | `boolean` | Whether sheet is open or opening |
| `status` | `BottomSheetStatus \| null` | Current status |

### open Options

```tsx
open({
  scaleBackground: true,  // Enable background scaling
});
```

### Status Values

| Status | Description |
|--------|-------------|
| `'opening'` | Sheet is animating open |
| `'open'` | Sheet is fully open |
| `'closing'` | Sheet is animating closed |
| `'hidden'` | Sheet is hidden (switch mode) |
| `null` | Sheet has not been opened |
