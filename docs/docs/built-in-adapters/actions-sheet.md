# ActionsSheetAdapter

Wraps [`react-native-actions-sheet`](https://github.com/ammarahm-ed/react-native-actions-sheet) — a zero-dependency action sheet with snap points, gestures, and a SheetManager API.

## Installation

```bash
npm install react-native-actions-sheet
```

## Usage

```tsx
import { ActionsSheetAdapter } from 'react-native-bottom-sheet-stack/actions-sheet';

function MyActionsSheet() {
  const { close } = useBottomSheetContext();

  return (
    <ActionsSheetAdapter snapPoints={[50, 100]} gestureEnabled>
      <View style={{ padding: 20 }}>
        <Text>Actions sheet with snap points</Text>
        <Button title="Close" onPress={close} />
      </View>
    </ActionsSheetAdapter>
  );
}
```

## Props

`ActionsSheetAdapterProps` is `Omit<ActionSheetProps, …>` — most of
[`react-native-actions-sheet`'s props](https://github.com/ammarahm-ed/react-native-actions-sheet#actionsheet-props)
pass straight through, but five are removed from the type because the manager
owns them.

**Managed by the adapter (not accepted):**

| Prop | Why |
|------|-----|
| `isModal` | Forced `false` — wrapping in a native Modal would take the sheet out of the stack's z-index layering. The manager handles the overlay lifecycle |
| `defaultOverlayOpacity` | Forced `0` — the library paints its own overlay regardless of `isModal`, which would stack on the manager's `BottomSheetBackdrop` as a double-dark layer |
| `onOpen` | Consumed → starts the backdrop fade-in, then `handleOpened()` |
| `onClose` | Consumed → starts the backdrop fade-out, then `handleClosed()` |
| `onBeforeClose` | Consumed → `handleDismiss()` |

**Adapter defaults (yours wins):**

| Prop | Default | Note |
|------|---------|------|
| `gestureEnabled` | `true` | Set to `false` while a [`useOnBeforeClose`](/close-interception) interceptor is blocking dismissal |
| `keyboardHandlerEnabled` | `true` | |

:::info Backdrop timing
`openAnimationConfig` and `closeAnimationConfig` do double duty: the adapter
springs the manager's backdrop with the same config, so the fade rides the
sheet's own curve. `onOpen` / `onClose` fire when the sheet *starts* moving,
which is what lets the two run together.
:::

:::note Blocked dismissal keeps its escape hatches
Only the swipe gesture is disabled while an interceptor is blocking. Back button
and backdrop tap stay enabled, because they route through `onBeforeClose` into
the manager's interceptor — which is what produces the confirmation prompt.
Disabling them natively would make the sheet silently undismissable.
:::
