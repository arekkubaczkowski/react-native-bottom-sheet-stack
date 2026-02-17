---
sidebar_position: 3
---

# Types

## Core Types

### BottomSheetStatus

Status of a bottom sheet.

```tsx
type BottomSheetStatus = 'opening' | 'open' | 'closing' | 'hidden';
```

| Status | Description |
|--------|-------------|
| `opening` | Sheet is animating open |
| `open` | Sheet is fully open |
| `closing` | Sheet is animating closed |
| `hidden` | Sheet is hidden (used in switch mode) |

---

### OpenMode

Navigation mode when opening a sheet.

```tsx
type OpenMode = 'push' | 'switch' | 'replace';
```

| Mode | Description |
|------|-------------|
| `push` | Stack new sheet on top |
| `switch` | Hide current, show new (restores on close) |
| `replace` | Close current, open new |

---

### BottomSheetState

Full state object for a bottom sheet.

```tsx
interface BottomSheetState {
  id: string;
  groupId: string;
  status: BottomSheetStatus;
  content: ReactNode;
  scaleBackground?: boolean;
  usePortal?: boolean;
  params?: Record<string, unknown>;
  keepMounted?: boolean;
  preventDismiss?: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `keepMounted` | `boolean` | When `true`, sheet stays in store after close (persistent mode) |
| `preventDismiss` | `boolean` | When `true`, adapters block native dismiss gestures. Set by `useOnBeforeClose`. |

---

### BottomSheetRef

Backward-compatible alias for `SheetAdapterRef`. Ref type for all adapters.

```tsx
import type { BottomSheetRef } from 'react-native-bottom-sheet-stack';

const sheetRef = useRef<BottomSheetRef>(null);
```

---

## Adapter Types

### SheetAdapterRef

The core adapter interface. Every adapter implements these two methods via `useImperativeHandle`.

```tsx
interface SheetAdapterRef {
  expand(): void;  // Called by coordinator to show the sheet
  close(): void;   // Called by coordinator to hide the sheet
}
```

The coordinator calls `expand()` when the store status transitions to `'opening'`, and `close()` when status transitions to `'closing'` or `'hidden'`.

---

### SheetAdapterEvents

Lifecycle events that adapters call back to the store. Returned by `createSheetEventHandlers(sheetId)`.

```tsx
interface SheetAdapterEvents {
  handleDismiss(): void;   // User-initiated dismiss (swipe, backdrop, back button)
  handleOpened(): void;    // Show animation completed — sheet is interactive
  handleClosed(): void;    // Hide animation completed — sheet is fully hidden
}
```

**Event Flow:**
1. Coordinator calls `ref.expand()` → adapter shows UI
2. Animation completes → adapter calls `handleOpened()`
3. User swipes/taps backdrop → adapter calls `handleDismiss()`
4. Hide animation completes → adapter calls `handleClosed()`

---

### SheetRef

Ref type alias used in the refs registry.

```tsx
type SheetRef = RefObject<SheetAdapterRef | null>;
```

---

## Configuration Types

### ScaleConfig

Configuration for scale animation.

```tsx
interface ScaleConfig {
  scale?: number;                  // Scale factor (default: 0.92)
  translateY?: number;             // Y translation in pixels (default: 10)
  borderRadius?: number;           // Border radius when scaled (default: 12)
  animation?: ScaleAnimationConfig; // Animation config (default: timing 300ms)
}
```

---

### ScaleAnimationConfig

Animation configuration for scale effect. Supports both timing and spring animations from Reanimated.

```tsx
type ScaleAnimationConfig =
  | { type: 'timing'; config?: WithTimingConfig }
  | { type: 'spring'; config?: WithSpringConfig };
```

**Examples:**

```tsx
// Timing animation (default)
const timingConfig: ScaleAnimationConfig = {
  type: 'timing',
  config: { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
};

// Spring animation
const springConfig: ScaleAnimationConfig = {
  type: 'spring',
  config: { damping: 15, stiffness: 150 },
};
```

---

## Portal Types

### BottomSheetPortalRegistry

Interface to augment for type-safe portal IDs and params.

```tsx
// In your project (e.g., src/types/bottom-sheet.d.ts)
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;              // no params
    'profile-sheet': { userId: string }; // with params
  }
}
```

| Value | Meaning |
|-------|---------|
| `true` | Sheet has no params |
| `{ ... }` | Sheet has required params |

See [Type-Safe Portal IDs](/type-safe-ids) for details.

---

### BottomSheetPortalId

Type for portal sheet IDs.

```tsx
// If BottomSheetPortalRegistry is augmented:
type BottomSheetPortalId = 'settings-sheet' | 'profile-sheet';

// If not augmented:
type BottomSheetPortalId = string;
```

---

### BottomSheetPortalParams

Type helper to extract params for a given portal sheet ID.

```tsx
// If registry defines: 'profile-sheet': { userId: string }
type Params = BottomSheetPortalParams<'profile-sheet'>;
// Result: { userId: string } | undefined

// If registry defines: 'settings-sheet': true
type Params = BottomSheetPortalParams<'settings-sheet'>;
// Result: undefined
```

---

## Hook Return Types

### UseBottomSheetControlReturn

Return type of `useBottomSheetControl` hook.

```tsx
interface UseBottomSheetControlReturn<T extends BottomSheetPortalId> {
  open: OpenFunction<T>;
  close: () => void;
  closeAll: (options?: CloseAllOptions) => Promise<void>;
  updateParams: (params: BottomSheetPortalParams<T>) => void;
  resetParams: () => void;
}
```

---

### UseBottomSheetContextReturn

Return type of `useBottomSheetContext` hook.

```tsx
interface UseBottomSheetContextReturn<TParams> {
  id: string;
  params: TParams;
  close: () => void;
  forceClose: () => void;
}
```

---

### UseBottomSheetStatusReturn

Return type of `useBottomSheetStatus` hook.

```tsx
interface UseBottomSheetStatusReturn {
  status: BottomSheetStatus | null;
  isOpen: boolean;
}
```

---

## Close Interception Types

### OnBeforeCloseCallback

Callback type for `useOnBeforeClose`. Receives `onConfirm` and `onCancel` callbacks to call when the user makes a decision.

```tsx
type OnBeforeCloseCallback = (context: {
  onConfirm: () => void;
  onCancel: () => void;
}) => void | boolean | Promise<boolean>;
```

**Callback Pattern (Recommended):**
- Call `onConfirm()` to allow the close
- Call `onCancel()` to block the close
- Works seamlessly with `Alert.alert` and `closeAll()` cascade

**Backward Compatible:**
- Return `true` — close proceeds
- Return `false` — close is cancelled
- Return `Promise<boolean>` — async confirmation

If the promise rejects, the close is cancelled for safety.

---

### CloseAllOptions

Options for `closeAll()` (available on both `useBottomSheetManager` and `useBottomSheetControl`).

```tsx
interface CloseAllOptions {
  /** Delay in ms between each cascading close animation. Default: 100 */
  stagger?: number;
}
```
