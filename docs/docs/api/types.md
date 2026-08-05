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

The stable, public part of a sheet's state.

```tsx
interface BottomSheetState {
  id: string;
  groupId: string;
  status: BottomSheetStatus;
  params?: Record<string, unknown>;
  scaleBackground?: boolean;
  keepMounted?: boolean;
}
```

:::note Narrowed in 2.0
`content`, `usePortal`, `portalSession` and `preventDismiss` were removed from this type. They are store plumbing — read `preventDismiss` from `useBottomSheetContext()` instead.
:::

| Property | Type | Description |
|----------|------|-------------|
| `keepMounted` | `boolean` | When `true`, sheet stays in store after close (persistent mode) |

---

## Result Types

Both `open()` and `close()` report why they did nothing, rather than failing
silently. See [Close results](/api/hooks#close-results) for how to consume them.

### OpenResult

Outcome of an `open()` call on the store.

```tsx
type OpenResult =
  | { opened: true; id: string }
  | { opened: false; id: string; reason: OpenRejectionReason };
```

The public hooks project this down to the currency that is useful at each call
site: `useBottomSheetManager().open()` returns `string | null` (the ID, or
`null`), and `useBottomSheetControl().open()` returns `boolean`.

---

### OpenRejectionReason

Why an `open()` call did not put the sheet on the stack. Each also logs a
`__DEV__` warning explaining which.

```tsx
type OpenRejectionReason = 'already-active' | 'group-busy' | 'group-mismatch';
```

| Reason | Meaning |
|--------|---------|
| `already-active` | The sheet is already on the stack. Re-opening an active sheet is a no-op — close it first, or use `updateParams()` |
| `group-busy` | Another sheet in the same group is still animating open. Wait for it to settle (`useBottomSheetStatus`) |
| `group-mismatch` | The sheet is registered to a different manager group than the one opening it. A sheet belongs to the group that mounted it |

---

### CloseResult

Outcome of a close. Returned by `close()` on `useBottomSheetManager`,
`useBottomSheetControl` and `useBottomSheetContext`.

```tsx
type CloseResult =
  | { closed: true }
  | { closed: false; reason: CloseRejectionReason };
```

---

### CloseRejectionReason

```tsx
type CloseRejectionReason = 'blocked' | 'interceptor-error' | 'not-closable';
```

| Reason | Meaning |
|--------|---------|
| `blocked` | A [`useOnBeforeClose`](/close-interception) interceptor declined |
| `interceptor-error` | The interceptor threw; the close is cancelled for safety |
| `not-closable` | There was nothing to close — already closing, hidden, or unknown sheet. Distinct from `blocked`: no interceptor had an opinion |

---

### CloseAllResult

Outcome of a cascading `closeAll()`.

```tsx
interface CloseAllResult {
  /** Whether the whole requested range closed. */
  completed: boolean;
  /** IDs that closed, topmost first. */
  closed: string[];
  /** The sheet whose interceptor stopped the cascade, if one did. */
  stoppedAt?: string;
}
```

A sheet with nothing to close does not stop the cascade — only a refusal does.

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

:::note `undefined` is always in the union
Even for a sheet with required params, the resolved type is `T | undefined` —
`resetParams()` can clear params on an open sheet, so a sheet reading its own
params can always find them missing. Under `strict`, read them optionally:
`params?.userId`.
:::

---

## Hook Return Types

### UseBottomSheetControlReturn

Return type of `useBottomSheetControl` hook.

```tsx
interface UseBottomSheetControlReturn<T extends BottomSheetPortalId> {
  /** `false` when the store declined — see OpenRejectionReason. */
  open: OpenFunction<T>;
  close: () => Promise<CloseResult>;
  closeAll: (options?: CascadeOptions) => Promise<CloseAllResult>;
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
  preventDismiss: boolean;
  close: () => Promise<CloseResult>;
  /** Closes every sheet above this one. `inclusive` closes this one too. */
  closeAbove: (
    options?: Omit<CascadeOptions, 'until'>
  ) => Promise<CloseAllResult>;
  forceClose: () => void;
}
```

---

### UseBottomSheetStatusReturn

Return type of `useBottomSheetStatus` hook.

```tsx
interface UseBottomSheetStatusReturn {
  status: BottomSheetStatus | null;
  /** Fully open and interactive — not during the opening animation. */
  isOpen: boolean;
  isOpening: boolean;
  isClosing: boolean;
  /** On screen in any form: opening, open, or closing. */
  isVisible: boolean;
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

### CascadeOptions

Options for `closeAll()` (available on both `useBottomSheetManager` and `useBottomSheetControl`),
and for the bounded variants `closeTo()`, `closeDepth()` and `closeAbove()`.

```tsx
interface CascadeOptions {
  /** Delay in ms between each close animation. Default: 100 */
  stagger?: number;
  /** Stop at this sheet rather than emptying the group. */
  until?: string;
  /** Whether the `until` sheet closes as well. Default: false */
  inclusive?: boolean;
  /** Close at most this many sheets, counting from the top. */
  depth?: number;
}
```

`until` and `depth` both narrow the range, so with both set the one that closes
fewer sheets wins — neither can widen past the other. An `until` that is not on
the group's stack closes nothing rather than falling back to closing everything.
