---
sidebar_position: 6
---

# Portal-based API

The Portal API offers a **declarative way** to define bottom sheets. You declare the sheet in your component tree and control it imperatively via `useBottomSheetControl`.

## Key Features

- **Context Preservation** - Sheet content stays in your React tree, so it has access to all context (theme, auth, i18n, navigation)
- **Define Once, Open from Anywhere** - Declare a sheet in one place, open it from any other component within the same provider
- **Declarative Definition** - Sheet structure is defined in JSX, making it easy to see what sheets exist

## Basic Usage

```tsx
import {
  BottomSheetPortal,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { open, close, isOpen } = useBottomSheetControl('my-sheet');

  return (
    <View>
      {/* Declare the portal - content stays in your React tree */}
      <BottomSheetPortal id="my-sheet">
        <MySheet />
      </BottomSheetPortal>

      {/* Control it imperatively */}
      <Button title="Open" onPress={() => open({ scaleBackground: true })} />
    </View>
  );
}
```

## How It Works

The portal API uses [react-native-teleport](https://github.com/nicklockwood/react-native-teleport) to render content in your component tree while displaying it in `BottomSheetHost`. This preserves all React context from the definition site.

## Open from Anywhere

Define the sheet once, open it from a completely different part of your app:

```tsx
// In screens/Settings.tsx - define the sheet
function SettingsScreen() {
  return (
    <View>
      <BottomSheetPortal id="language-picker">
        <LanguagePickerSheet />
      </BottomSheetPortal>

      {/* ... settings UI */}
    </View>
  );
}

// In components/Header.tsx - open from anywhere
function Header() {
  const { open } = useBottomSheetControl('language-picker');

  return (
    <TouchableOpacity onPress={() => open()}>
      <LanguageIcon />
    </TouchableOpacity>
  );
}
```

Both components must be rendered within the same `BottomSheetManagerProvider`.

## Context Preservation

Your sheet content retains access to React context:

```tsx
import { useTheme } from './ThemeContext';

const ThemedSheet = forwardRef((props, ref) => {
  const { colors } = useTheme(); // Context is preserved!

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Themed Content</Text>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

function App() {
  const { open } = useBottomSheetControl('themed-sheet');

  return (
    <ThemeProvider>
      <BottomSheetPortal id="themed-sheet">
        <ThemedSheet />
      </BottomSheetPortal>

      <Button title="Open Themed Sheet" onPress={() => open()} />
    </ThemeProvider>
  );
}
```

## Updating Params

You can update or reset params on an already open sheet using `updateParams` and `resetParams`:

```tsx
import {
  BottomSheetPortal,
  useBottomSheetControl,
  useBottomSheetParams,
} from 'react-native-bottom-sheet-stack';

const UserSheet = forwardRef((props, ref) => {
  const { userId } = useBottomSheetParams<'user-sheet'>();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchUser(userId).then(setUser);
    }
  }, [userId]);

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView>
        {user && <Text>{user.name}</Text>}
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

function UserList() {
  const { open, updateParams, resetParams, isOpen } = useBottomSheetControl('user-sheet');

  const showUser = (userId: string) => {
    if (isOpen) {
      // Sheet already open - just update the params
      updateParams({ userId });
    } else {
      // Open with initial params
      open({ params: { userId } });
    }
  };

  const clearSelection = () => {
    // Reset params to undefined
    resetParams();
  };

  return (
    <View>
      <BottomSheetPortal id="user-sheet">
        <UserSheet />
      </BottomSheetPortal>

      <Button title="Show User 1" onPress={() => showUser('user-1')} />
      <Button title="Show User 2" onPress={() => showUser('user-2')} />
      <Button title="Clear" onPress={clearSelection} />
    </View>
  );
}
```
