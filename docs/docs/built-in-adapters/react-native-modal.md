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
      backdropOpacity={0.6}
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

All [`react-native-modal` props](https://github.com/react-native-modal/react-native-modal#available-props) are accepted via spread.

Adapter defaults (overridable): `swipeDirection="down"`, `backdropOpacity={0.5}`, `useNativeDriver`, `hideModalContentWhileAnimating`.
