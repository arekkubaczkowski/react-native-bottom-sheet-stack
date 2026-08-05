# ReactNativeModalAdapter

Wraps [`react-native-modal`](https://github.com/react-native-modal/react-native-modal) — a feature-rich modal with 60+ animation options, swipe-to-dismiss, and customizable backdrops.

## Installation

```bash
npm install react-native-modal
```

## Usage

```tsx
import { ReactNativeModalAdapter } from 'react-native-bottom-sheet-stack/react-native-modal';

function FancyModal() {
  const { close } = useBottomSheetContext();

  return (
    <ReactNativeModalAdapter
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeDirection="down"
      animationInTiming={400}
      animationOutTiming={250}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Fancy animated modal</Text>
        <Button title="Close" onPress={close} />
      </View>
    </ReactNativeModalAdapter>
  );
}
```

## Props

`ReactNativeModalAdapterProps` is `Partial<Omit<ModalProps, …>>` — most of
[`react-native-modal`'s props](https://github.com/react-native-modal/react-native-modal#available-props)
pass straight through, but seven are removed from the type because the manager
owns them.

**Managed by the adapter (not accepted):**

| Prop | Why |
|------|-----|
| `isVisible` | The manager drives visibility through the adapter ref |
| `coverScreen` | Forced `false`, so the modal renders as a plain `View` and `QueueItem`'s z-index controls stacking in `push` mode |
| `hasBackdrop` | Forced `false` — the manager's stack-aware `BottomSheetBackdrop` provides the overlay |
| `onModalShow` | Consumed → `handleOpened()` |
| `onModalHide` | Consumed → `handleClosed()` |
| `onBackButtonPress` | Consumed → `handleDismiss()` (this adapter uses the library's own back handling rather than the manager's `useBackHandler`) |
| `onSwipeComplete` | Consumed → `handleDismiss()`, and disabled while dismissal is blocked |

**Adapter defaults (yours wins):**

| Prop | Default | Note |
|------|---------|------|
| `animationInTiming` | `300` | Also times the manager's backdrop fade-in — see below |
| `animationOutTiming` | `300` | Also times the manager's backdrop fade-out |
| `swipeDirection` | `'down'` | Set to `undefined` while a [`useOnBeforeClose`](/close-interception) interceptor is blocking dismissal |
| `useNativeDriver` | `true` | |
| `hideModalContentWhileAnimating` | `true` | |

:::info Backdrop timing
Because `hasBackdrop` is forced off, `backdropOpacity`, `backdropColor` and the
other backdrop props have no effect — there is no react-native-modal backdrop to
style. The manager's backdrop is faded with `withTiming` over
`animationInTiming` / `animationOutTiming`, so overriding those keeps the
backdrop in step with the modal instead of letting it run ahead.
:::
