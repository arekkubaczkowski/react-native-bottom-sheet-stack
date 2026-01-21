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
}
```

---

### BottomSheetRef

Ref type for `BottomSheetManaged` component.

```tsx
import type { BottomSheetRef } from 'react-native-bottom-sheet-stack';

const sheetRef = useRef<BottomSheetRef>(null);
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
