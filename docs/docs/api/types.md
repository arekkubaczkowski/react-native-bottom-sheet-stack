---
sidebar_position: 3
---

# Types

## ScaleConfig

Configuration for scale animation.

```tsx
interface ScaleConfig {
  scale: number;       // Scale factor (default: 0.92)
  translateY: number;  // Y translation in pixels
  borderRadius: number; // Border radius when scaled
}
```

---

## BottomSheetPortalRegistry

Interface to augment for type-safe portal IDs and params.

```tsx
// In your project (e.g., src/types/bottom-sheet.d.ts)
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;                    // no params
    'profile-sheet': { userId: string };       // with params
    'confirm-dialog': {
      title: string;
      onConfirm: () => void;
    };
  }
}
```

| Value | Meaning |
|-------|---------|
| `true` | Sheet has no params |
| `{ ... }` | Sheet has required params |

See [Type-Safe Portal IDs & Params](/type-safe-ids) for details.

---

## BottomSheetPortalId

Type for portal sheet IDs.

```tsx
// If BottomSheetPortalRegistry is augmented:
type BottomSheetPortalId = 'settings-sheet' | 'profile-sheet' | 'confirm-dialog';

// If not augmented:
type BottomSheetPortalId = string;
```

---

## BottomSheetPortalParams

Type helper to extract params for a given portal sheet ID. Always includes `undefined` since params can be reset with `resetParams()`.

```tsx
// If registry defines: 'profile-sheet': { userId: string }
type Params = BottomSheetPortalParams<'profile-sheet'>;
// Result: { userId: string } | undefined

// If registry defines: 'settings-sheet': true
type Params = BottomSheetPortalParams<'settings-sheet'>;
// Result: undefined

// If registry is not augmented:
type Params = BottomSheetPortalParams<string>;
// Result: Record<string, unknown> | undefined
```

---

## BottomSheetStatus

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
