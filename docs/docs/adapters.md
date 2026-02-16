---
sidebar_position: 9
---

# Library-Agnostic Architecture

This library is **adapter-based** — the core stack manager (navigation modes, scale animations, portals, persistence) is completely decoupled from any specific bottom sheet or modal implementation. You choose which UI library renders each sheet.

## How It Works

The stack manager controls **when** sheets open and close. Adapters control **how** they appear and disappear.

```
┌───────────────────────────────────────────────┐
│           Stack Manager (core)                │
│  ┌─────────────────────────────────────────┐  │
│  │  Zustand Store                          │  │
│  │  - stackOrder, sheetsById               │  │
│  │  - push / switch / replace              │  │
│  │  - scale animations, portals            │  │
│  └─────────────┬───────────────────────────┘  │
│                │                              │
│      ┌─────────┴─────────┐                    │
│      │  Coordinator      │                    │
│      │  ref.expand()     │                    │
│      │  ref.close()      │                    │
│      └─────────┬─────────┘                    │
└────────────────┼──────────────────────────────┘
                 │
    ┌────────────┼────────────┬──────────────┐
    ▼            ▼            ▼              ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐
│ Gorhom  │ │  Modal  │ │  True   │ │  Your Own  │
│ Adapter │ │ Adapter │ │  Sheet  │ │  Adapter   │
└─────────┘ └─────────┘ └─────────┘ └────────────┘
```

## The Adapter Interface

Every adapter implements two methods:

```typescript
interface SheetAdapterRef {
  expand(): void;  // Called by coordinator to show the sheet
  close(): void;   // Called by coordinator to hide the sheet
}
```

And calls three lifecycle events back to the store:

```typescript
interface SheetAdapterEvents {
  handleDismiss(): void;   // User-initiated dismiss (swipe, backdrop tap, back button)
  handleOpened(): void;    // Show animation completed
  handleClosed(): void;    // Hide animation completed
}
```

## Per-Sheet Adapter Choice

Each sheet can use a different adapter. You can mix bottom sheets, modals, and custom overlays in the same stack:

```tsx
// Sheet 1: gorhom bottom sheet
<BottomSheetPortal id="settings">
  <GorhomSheetAdapter snapPoints={['50%']}>
    <SettingsContent />
  </GorhomSheetAdapter>
</BottomSheetPortal>

// Sheet 2: custom modal adapter
<BottomSheetPortal id="alert">
  <CustomModalAdapter contentContainerStyle={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
    <AlertContent />
  </CustomModalAdapter>
</BottomSheetPortal>

// Open them in sequence — both participate in the same stack
const settings = useBottomSheetControl('settings');
const alert = useBottomSheetControl('alert');

settings.open({ scaleBackground: true });
// Later...
alert.open({ mode: 'push' }); // Modal pushes on top of bottom sheet
```

## Available Adapters

### Built-in (no extra dependencies)

| Adapter | Wraps |
|---------|-------|
| `CustomModalAdapter` | Custom React Native UI

### Third-party (optional peer dependencies)

| Adapter | Wraps | Best For |
|---------|-------|----------|
| `GorhomSheetAdapter` | `@gorhom/bottom-sheet` | Feature-rich bottom sheets with snap points |
| `ReactNativeModalAdapter` | `react-native-modal` | Rich animations, swipe dismiss |
| `ActionsSheetAdapter` | `react-native-actions-sheet` | Zero-dep sheets, snap points |

### Custom

You can [build your own adapter](/custom-adapters) for any overlay library.

## Backward Compatibility

`BottomSheetManaged` is a re-export of `GorhomSheetAdapter`. Existing code continues to work without changes:

```tsx
// These are equivalent:
import { BottomSheetManaged } from 'react-native-bottom-sheet-stack';
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack';
```
