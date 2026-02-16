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
  useAdapterRef,
  useAnimatedIndex,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

interface MyAdapterProps {
  children: React.ReactNode;
  // ... your library's props
}

export const MyAdapter = React.forwardRef<SheetAdapterRef, MyAdapterProps>(
  ({ children, ...props }, forwardedRef) => {
    // 1. Get sheet context and adapter ref
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);

    // 2. Get event handlers for this sheet
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // 3. Get animated index (for backdrop/scale integration)
    const animatedIndex = useAnimatedIndex();

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
      animatedIndex.set(0);
      handleOpened();
    };

    const onUserDismiss = () => {
      handleDismiss();
    };

    const onHidden = () => {
      animatedIndex.set(-1);
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

The `useAnimatedIndex()` hook returns the `animatedIndex` shared value for the current sheet. It drives backdrop opacity and scale animations — `BottomSheetBackdrop` interpolates it in the range `[-1, 0]` to opacity `[0, 1]`.

```tsx
import { useAnimatedIndex } from 'react-native-bottom-sheet-stack';

const animatedIndex = useAnimatedIndex();
```

No need to pass the sheet `id` — the hook reads it from context automatically.

#### Binary strategy (CustomModalAdapter, ReactNativeModalAdapter, ActionsSheetAdapter)

Set to `0` when the sheet becomes visible, `-1` when hidden. The backdrop snaps between transparent and opaque. Simple and works for any library.

```tsx
const animatedIndex = useAnimatedIndex();

useImperativeHandle(ref, () => ({
  expand: () => {
    animatedIndex.set(0);   // backdrop fully opaque
    // ... show your overlay
  },
  close: () => {
    animatedIndex.set(-1);  // backdrop fully transparent
    // ... hide your overlay
  },
}), [animatedIndex]);
```

#### Continuous/dynamic strategy (GorhomSheetAdapter)

Pass the shared value directly to the underlying library as a prop. The library updates it continuously during swipe gestures (intermediate values between `-1` and `0`), so the backdrop smoothly interpolates during user interaction.

```tsx
const animatedIndex = useAnimatedIndex();

// The library writes to the shared value during gestures:
<BottomSheet animatedIndex={animatedIndex} />
```

### Adapter Ref

Use `useAdapterRef(forwardedRef)` to get the ref for `useImperativeHandle`. The hook resolves the correct ref automatically — your adapter works in all three modes (inline, portal, persistent) without any extra logic:

```tsx
const ref = useAdapterRef(forwardedRef);
useImperativeHandle(ref, () => ({ expand: ..., close: ... }));
```

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
    const ref = useAdapterRef(forwardedRef);
    const [visible, setVisible] = useState(false);

    const animatedIndex = useAnimatedIndex();
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    useImperativeHandle(ref, () => ({
      expand: () => setVisible(true),
      close: () => setVisible(false),
    }), []);

    useEffect(() => {
      animatedIndex.set(visible ? 0 : -1);
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
