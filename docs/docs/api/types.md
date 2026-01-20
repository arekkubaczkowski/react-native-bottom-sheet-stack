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

Interface to augment for type-safe portal IDs.

```tsx
// In your project (e.g., src/types/bottom-sheet.d.ts)
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;
    'profile-sheet': true;
  }
}
```

See [Type-Safe Portal IDs](/type-safe-ids) for details.

---

## BottomSheetPortalId

Type for portal sheet IDs.

```tsx
// If BottomSheetPortalRegistry is augmented:
type BottomSheetPortalId = 'settings-sheet' | 'profile-sheet';

// If not augmented:
type BottomSheetPortalId = string;
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
