---
sidebar_position: 13
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

It should also:

3. **Drive `animatedIndex` alongside your own animation**, so the manager's
   backdrop fades in step with the sheet rather than snapping — see
   [Animated Index](#animated-index)
4. **Respect `preventDismiss`** — read it with `useSheetPreventDismiss(id)` and
   disable your library's native dismiss gestures while it is `true`, so a
   [`useOnBeforeClose`](/close-interception) interceptor always gets to run
   before the sheet goes away. Every shipped adapter except `CustomModalAdapter`
   (which has no dismiss gesture of its own) does this.
5. **Handle the Android back button** with `useBackHandler(id, handleDismiss)`
   unless your library already has its own back handling to route into
   `handleDismiss()`. The hook is scoped to the topmost open sheet **of its own
   group**, which a hand-rolled `BackHandler` listener is not.

```tsx
import { useBackHandler, useSheetPreventDismiss } from 'react-native-bottom-sheet-stack';

const preventDismiss = useSheetPreventDismiss(id);
useBackHandler(id, handleDismiss);

<MyLibrarySheet swipeToDismissEnabled={!preventDismiss} />
```

## Step-by-Step Guide

### 1. Create the Adapter Component

```tsx
import React, { useImperativeHandle } from 'react';
import { withTiming } from 'react-native-reanimated';
import type { SheetAdapterRef } from 'react-native-bottom-sheet-stack';
import {
  createSheetEventHandlers,
  useAdapterRef,
  useAnimatedIndex,
  useBackHandler,
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

    // 5. Wire up callbacks. Animate animatedIndex with the same timing as your
    //    own show/hide animation so the manager's backdrop fades in step.
    const onShowStart = () => {
      animatedIndex.set(withTiming(0, { duration: 300 }));
    };

    const onShown = () => {
      handleOpened();
    };

    const onUserDismiss = () => {
      handleDismiss();
    };

    const onHideStart = () => {
      animatedIndex.set(withTiming(-1, { duration: 300 }));
    };

    const onHidden = () => {
      handleClosed();
    };

    // 6. Android back button, scoped to the topmost open sheet in this group
    useBackHandler(id, handleDismiss);

    // 7. Render your library's component
    return (
      <MyLibrarySheet
        ref={myLibraryRef}
        onShowStart={onShowStart}
        onShow={onShown}
        onDismiss={onUserDismiss}
        onHideStart={onHideStart}
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

:::danger Never set it discretely
`animatedIndex.set(0)` on expand and `animatedIndex.set(-1)` on close is the
obvious thing to write, and it is wrong. The backdrop reads the value on the
sheet's very first frame, so a discrete set puts it at **full opacity
immediately** — a whole animation ahead of the sheet it is meant to be backing.
The three adapters that once did this (`CustomModalAdapter`,
`ReactNativeModalAdapter`, `ActionsSheetAdapter`) were all changed away from it
for exactly that reason.

Reserve the discrete set for libraries that expose no timing information at all
— no duration, no progress value, no position callback. There, a snap is the
only option.
:::

#### Continuous — the library reports position (GorhomSheetAdapter, SwmansionSheetAdapter)

Best case. If the library writes an animated value itself, hand it the shared
value directly and it stays correct through swipe gestures too:

```tsx
const animatedIndex = useAnimatedIndex();

// gorhom writes to the shared value during gestures:
<BottomSheet animatedIndex={animatedIndex} />
```

If it reports position through a callback instead, map that into `[-1, 0]`.
`SwmansionSheetAdapter` does this from the native sheet's `onPositionChange`:

```tsx
// useEvent here is Reanimated's native-event hook, not the useEvent RFC
import { useEvent } from 'react-native-reanimated';

const onPositionChange = useEvent((event) => {
  'worklet';
  animatedIndex.set(event.index - 1);
}, ['onPositionChange']);
```

#### Alongside your own animation

If you drive the animation yourself, derive `animatedIndex` from the same
progress value — one animation, so they cannot drift.
`CustomModalAdapter` does this:

```tsx
const progress = useSharedValue(0); // 0 = hidden, 1 = shown

useDerivedValue(() => {
  animatedIndex.set(progress.value - 1);
});
```

#### Alongside the library's animation

If the library animates but only tells you *when* it starts and *how long* it
takes, run the same animation on `animatedIndex`. Both remaining adapters do
this, each using the library's own configuration so the curves match:

```tsx
// ReactNativeModalAdapter — the modal's own timings
expand: () => {
  setIsVisible(true);
  animatedIndex.set(withTiming(0, { duration: animationInTiming }));
},
close: () => {
  setIsVisible(false);
  animatedIndex.set(withTiming(-1, { duration: animationOutTiming }));
},
```

```tsx
// ActionsSheetAdapter — the sheet's own spring configs.
// onOpen/onClose fire when the sheet *starts* moving, which is what makes
// this work: the fade runs alongside the sheet's animation, not after it.
const onOpen = () => {
  animatedIndex.set(withSpring(0, openAnimationConfig));
  handleOpened();
};
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

**Fully-controlled / position-controlled** (e.g., `@swmansion/react-native-bottom-sheet` with `index`/`detents`):

Some libraries have no boolean visibility and no imperative ref at all — the position is a controlled value (an index into snap points). Map "open" to an expanded index and "close" to the collapsed index (`0`), then translate the library's *user-driven* change callback into `handleDismiss()`:

```tsx
const [index, setIndex] = useState(0); // 0 = collapsed
const openIndex = detents.length - 1;

useImperativeHandle(ref, () => ({
  expand: () => setIndex(openIndex),
  close: () => setIndex(0),
}), [openIndex]);

// Settle = animation finished → opened/closed
const onSettle = (i: number) => (i > 0 ? handleOpened() : handleClosed());

// Index change = user-driven snap → reaching collapsed means dismiss
const onIndexChange = (i: number) => {
  if (i <= 0) handleDismiss();
};

// Position change = continuous native position → drives the backdrop fade
const onPositionChange = (event) => {
  'worklet';
  animatedIndex.set(event.index - 1);
};
```

This is the shape [`SwmansionSheetAdapter`](/built-in-adapters/swmansion) uses to
bridge Software Mansion's native sheet. Note that `animatedIndex` is driven
**only** from the continuous `onPositionChange` — never from `onSettle`, which
reports the end of an animation and would therefore snap the backdrop to its
final value one animation late.

### Suppressing the manager backdrop

If your adapter renders a backdrop of its own, suppress the manager's shared one so the two don't stack into a double-dark overlay:

```tsx
import { useSetBackdrop, useSheetPreventDismiss } from 'react-native-bottom-sheet-stack';

const setBackdrop = useSetBackdrop();
useEffect(() => {
  if (!hasOwnBackdrop) return;
  setBackdrop(id, false);
  return () => setBackdrop(id, true);
}, [id, hasOwnBackdrop, setBackdrop]);
```

`useSheetPreventDismiss(id)` reports whether a `useOnBeforeClose` interceptor is currently blocking dismissal, so you can disable your library's native swipe/tap gestures while it is.

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

## Full Example: Simple Slide-Up Modal

A complete, minimal adapter — a slide-up modal using `react-native-reanimated`:

```tsx
import React, { useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { SheetAdapterRef } from 'react-native-bottom-sheet-stack';
import {
  createSheetEventHandlers,
  useAdapterRef,
  useAnimatedIndex,
  useBackHandler,
  useBottomSheetContext,
  useSheetPreventDismiss,
} from 'react-native-bottom-sheet-stack';

interface SlideUpModalProps {
  children: React.ReactNode;
}

export const SlideUpModal = React.forwardRef<SheetAdapterRef, SlideUpModalProps>(
  ({ children }, forwardedRef) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);

    const [visible, setVisible] = useState(false);
    const progress = useSharedValue(0);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // One animation drives both the sheet and the manager's backdrop, so the
    // fade cannot run ahead of the sheet.
    useDerivedValue(() => {
      animatedIndex.set(progress.value - 1);
    });

    useImperativeHandle(ref, () => ({
      expand: () => {
        setVisible(true);
        progress.value = withSpring(1, { damping: 20, stiffness: 300 }, (finished) => {
          if (finished) runOnJS(handleOpened)();
        });
      },
      close: () => {
        progress.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(setVisible)(false);
            runOnJS(handleClosed)();
          }
        });
      },
    }), [progress]);

    // Android back button — only fires while this sheet is the topmost open
    // one in its own group. A raw BackHandler listener would also fire for
    // sheets buried under others.
    useBackHandler(id, handleDismiss);

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: (1 - progress.value) * 600 }],
    }));

    if (!visible) return null;

    // Tapping the surface dismisses — unless an onBeforeClose interceptor is
    // blocking, in which case the gesture must be inert.
    return (
      <Pressable
        style={styles.backdrop}
        onPress={preventDismiss ? undefined : handleDismiss}
      >
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <Pressable>{children}</Pressable>
        </Animated.View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 200,
  },
});
```

This adapter works with all three sheet modes (inline, portal, persistent) and participates in push/switch/replace navigation — no extra wiring needed.
