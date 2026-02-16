---
sidebar_position: 12
---

# Building Custom Adapters

You can create an adapter for any overlay library. An adapter is a React component that bridges a library's open/close API with the stack manager's lifecycle.

## Adapter Contract

Your adapter must:

1. **Implement `SheetAdapterRef`** via `useImperativeHandle` — the coordinator calls `expand()` and `close()` on your ref
2. **Call `SheetAdapterEvents`** — notify the store when animations complete or the user dismisses

```typescript
import type { SheetAdapterRef, SheetAdapterEvents } from 'react-native-bottom-sheet-stack';

// The coordinator calls these on your ref:
interface SheetAdapterRef {
  expand(): void;  // Show the overlay
  close(): void;   // Hide the overlay
}

// You call these back to the store:
interface SheetAdapterEvents {
  handleOpened(): void;   // Show animation done
  handleDismiss(): void;  // User wants to close (swipe, backdrop, back button)
  handleClosed(): void;   // Hide animation done
}
```

## Step-by-Step Guide

### 1. Create the Adapter Component

```tsx
import React, { useImperativeHandle } from 'react';
import type { SheetAdapterRef } from 'react-native-bottom-sheet-stack';
import {
  createSheetEventHandlers,
  useBottomSheetContext,
  useBottomSheetRefContext,
} from 'react-native-bottom-sheet-stack';
import { getAnimatedIndex } from 'react-native-bottom-sheet-stack'; // for backdrop/scale

interface MyAdapterProps {
  children: React.ReactNode;
  // ... your library's props
}

export const MyAdapter = React.forwardRef<SheetAdapterRef, MyAdapterProps>(
  ({ children, ...props }, forwardedRef) => {
    // 1. Get sheet context
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    const ref = contextRef ?? forwardedRef;

    // 2. Get event handlers for this sheet
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // 3. Get animated index (for backdrop/scale integration)
    const animatedIndex = getAnimatedIndex(id);

    // 4. Expose expand/close to the coordinator
    useImperativeHandle(ref, () => ({
      expand: () => {
        // Call your library's "show" method
        myLibraryRef.current?.show();
      },
      close: () => {
        // Call your library's "hide" method
        myLibraryRef.current?.hide();
      },
    }), []);

    // 5. Wire up callbacks
    const onShown = () => {
      if (animatedIndex) animatedIndex.value = 0;
      handleOpened();
    };

    const onUserDismiss = () => {
      handleDismiss();
    };

    const onHidden = () => {
      if (animatedIndex) animatedIndex.value = -1;
      handleClosed();
    };

    // 6. Render your library's component
    return (
      <MyLibrarySheet
        ref={myLibraryRef}
        onShow={onShown}
        onDismiss={onUserDismiss}
        onHide={onHidden}
        {...props}
      >
        {children}
      </MyLibrarySheet>
    );
  }
);
```

### 2. Use Your Adapter

```tsx
// As inline content
const { open } = useBottomSheetManager();
open(
  <MyAdapter someProp="value">
    <View><Text>Custom adapter content</Text></View>
  </MyAdapter>,
  { mode: 'push' }
);

// As portal
<BottomSheetPortal id="my-overlay">
  <MyAdapter someProp="value">
    <MyOverlayContent />
  </MyAdapter>
</BottomSheetPortal>
```

## Lifecycle Flow

Understanding the correct order of events is critical:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Store: status → 'opening'                            │
│ 2. Coordinator: calls ref.expand()                      │
│ 3. Your adapter: starts show animation                  │
│ 4. Your adapter: animation completes → handleOpened()   │
│ 5. Store: status → 'open'                               │
│                                                         │
│ --- User interacts with sheet ---                       │
│                                                         │
│ 6a. User swipe/tap → handleDismiss()                    │
│     OR                                                  │
│ 6b. API close() → coordinator calls ref.close()         │
│                                                         │
│ 7. Store: status → 'closing'                            │
│ 8. Your adapter: starts hide animation                  │
│ 9. Your adapter: animation completes → handleClosed()   │
│ 10. Store: removes sheet (or sets 'hidden' if persistent)│
└─────────────────────────────────────────────────────────┘
```

## Important Details

### Animated Index

The `animatedIndex` shared value drives backdrop opacity and scale animations:
- Set to `0` (or higher) when the sheet is visible
- Set to `-1` when the sheet is hidden

```tsx
const animatedIndex = getAnimatedIndex(id);

// When sheet becomes visible:
if (animatedIndex) animatedIndex.value = 0;

// When sheet becomes hidden:
if (animatedIndex) animatedIndex.value = -1;
```

For adapters that support intermediate positions (like snap points), you can set fractional values to get progressive backdrop/scale effects.

### Ref Priority

Always use `contextRef ?? forwardedRef`:

```tsx
const contextRef = useBottomSheetRefContext();
const ref = contextRef ?? forwardedRef;
```

The `contextRef` is set by `BottomSheetPortal` and `BottomSheetPersistent` for portal-mode sheets. The `forwardedRef` is used for inline-mode sheets (via `useBottomSheetManager`).

### Prop-Controlled vs Ref-Controlled Libraries

**Ref-controlled** (e.g., TrueSheet with `present()`/`dismiss()`):
```tsx
useImperativeHandle(ref, () => ({
  expand: () => libraryRef.current?.present(),
  close: () => libraryRef.current?.dismiss(),
}), []);
```

**Prop-controlled** (e.g., react-native-modal with `isVisible`):
```tsx
const [visible, setVisible] = useState(false);

useImperativeHandle(ref, () => ({
  expand: () => setVisible(true),
  close: () => setVisible(false),
}), []);
```

### Libraries Without Separate Dismiss/Close Phases

Some libraries fire a single `onClose` for both user dismissal and animation completion. In that case, call both:

```tsx
const onClose = () => {
  handleDismiss();
  handleClosed();
};
```

### Optional Dependencies

If publishing your adapter as a separate package, use lazy `require()` to keep the wrapped library optional:

```tsx
// Lazy import — won't crash if the library isn't installed
const ThirdPartySheet = require('third-party-sheet').default;
```

## Example: Adapter for a Tooltip Library

Here's a real-world example adapting a hypothetical tooltip/popover library:

```tsx
export const TooltipAdapter = React.forwardRef<SheetAdapterRef, TooltipAdapterProps>(
  ({ children, anchorRef, placement = 'bottom', ...props }, forwardedRef) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    const ref = contextRef ?? forwardedRef;
    const [visible, setVisible] = useState(false);

    const animatedIndex = getAnimatedIndex(id);
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    useImperativeHandle(ref, () => ({
      expand: () => setVisible(true),
      close: () => setVisible(false),
    }), []);

    useEffect(() => {
      if (animatedIndex) {
        animatedIndex.value = visible ? 0 : -1;
      }
    }, [visible, animatedIndex]);

    return (
      <Tooltip
        visible={visible}
        anchor={anchorRef}
        placement={placement}
        onShow={handleOpened}
        onDismiss={() => { handleDismiss(); handleClosed(); }}
        {...props}
      >
        {children}
      </Tooltip>
    );
  }
);
```

Now this tooltip participates in the same stack as your bottom sheets and modals — push, switch, and replace all work across adapter types.
