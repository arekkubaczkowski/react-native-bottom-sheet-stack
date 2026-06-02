---
sidebar_position: 10
---

# Shipped Adapters

All adapters listed below ship with the library. `CustomModalAdapter` requires no additional dependencies. The others wrap optional peer dependencies — install only what you use.

## GorhomSheetAdapter

The default adapter. Wraps `@gorhom/bottom-sheet` to provide feature-rich bottom sheets with snap points, spring animations, and swipe gestures.

:::tip
`BottomSheetManaged` is available as a deprecated re-export from the same subpath for backward compatibility.
:::

### Installation

```bash
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

### Usage

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';
import { BottomSheetView } from '@gorhom/bottom-sheet';

const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <GorhomSheetAdapter ref={ref} snapPoints={['50%', '90%']}>
      <BottomSheetView>
        <Text>Sheet content</Text>
        <Button title="Close" onPress={close} />
      </BottomSheetView>
    </GorhomSheetAdapter>
  );
});
```

### Props

Accepts all props from [`@gorhom/bottom-sheet`](https://gorhom.dev/react-native-bottom-sheet/props). The adapter overrides `enablePanDownToClose` to `true` by default.

### Backdrop

By default this adapter renders gorhom's `backdropComponent` as `null` so the **stack manager's shared backdrop** (`BottomSheetBackdrop`) is used instead. This is recommended — the manager's backdrop is **stack-aware** (correct opacity across stacked sheets, z-index, scale coordination, cascading tap-to-dismiss), which a per-sheet gorhom backdrop is not.

You **can** override it by passing your own `backdropComponent`, but it's **not recommended** unless you specifically need gorhom's backdrop behavior. When you do, disable the manager backdrop for that sheet so the two don't stack:

```tsx
import { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

const sheet = (
  <GorhomSheetAdapter snapPoints={['50%']} backdropComponent={GorhomBackdrop}>
    {/* ... */}
  </GorhomSheetAdapter>
);

open(sheet, { backdrop: false }); // turn off the manager backdrop for this sheet
```

### When to Use

- You need snap points, scrollable content, keyboard handling
- You want the most feature-rich bottom sheet experience
- Your app already uses `@gorhom/bottom-sheet`

---

## CustomModalAdapter

Custom React Native dialog UI. No additional dependencies needed.

### Usage

```tsx
import { CustomModalAdapter, useBottomSheetContext } from 'react-native-bottom-sheet-stack';

function MyModal() {
  const { close } = useBottomSheetContext();

  return (
    <CustomModalAdapter>
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Modal content</Text>
        <Button title="Close" onPress={close} />
      </View>
    </CustomModalAdapter>
  );
}
```

### Props

Accepts `contentContainerStyle` for the inner wrapper view.

### Mixed Stacking

Modals and bottom sheets can coexist in the same stack:

```tsx
const { open } = useBottomSheetManager();
const modalControl = useBottomSheetControl('my-modal');

// Push a bottom sheet
open(<MyBottomSheet />, { mode: 'push' });

// Then push a modal on top
modalControl.open({ mode: 'push' });
// Both are in the stack — closing the modal returns to the bottom sheet
```

---

## ReactNativeModalAdapter

Wraps [`react-native-modal`](https://github.com/react-native-modal/react-native-modal) — a feature-rich modal with 60+ animation options, swipe-to-dismiss, and customizable backdrops.

### Installation

```bash
npm install react-native-modal
```

### Usage

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

### Props

All [`react-native-modal` props](https://github.com/react-native-modal/react-native-modal#available-props) are accepted via spread.

Adapter defaults (overridable): `swipeDirection="down"`, `backdropOpacity={0.5}`, `useNativeDriver`, `hideModalContentWhileAnimating`.

---

## ActionsSheetAdapter

Wraps [`react-native-actions-sheet`](https://github.com/ammarahm-ed/react-native-actions-sheet) — a zero-dependency action sheet with snap points, gestures, and a SheetManager API.

### Installation

```bash
npm install react-native-actions-sheet
```

### Usage

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

### Props

All [`react-native-actions-sheet` props](https://github.com/ammarahm-ed/react-native-actions-sheet#actionsheet-props) are accepted via spread.

Adapter defaults (overridable): `gestureEnabled`, `closeOnTouchBackdrop`, `closeOnPressBack`, `keyboardHandlerEnabled`.

:::tip
This adapter uses `isModal={false}` internally to avoid wrapping in a redundant Modal — the stack manager handles the overlay lifecycle.
:::

---

## SwmansionSheetAdapter

Wraps [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet) — Software Mansion's **fully native (Fabric)** bottom sheet driven by a `detents`/`index` model.

:::caution New Architecture required
`@swmansion/react-native-bottom-sheet` is a Fabric native component. It requires the **New Architecture** (`react-native >= 0.76`) and a native build (it does **not** run in Expo Go — use a development build / `expo prebuild`).
:::

### Installation

```bash
npm install @swmansion/react-native-bottom-sheet react-native-safe-area-context
```

### Usage

```tsx
import { SwmansionSheetAdapter } from 'react-native-bottom-sheet-stack/swmansion';
import { useBottomSheetContext } from 'react-native-bottom-sheet-stack';

function MySheet() {
  const { close } = useBottomSheetContext();

  return (
    <SwmansionSheetAdapter detents={[0, 'content']}>
      <View style={{ padding: 20 }}>
        <Text>Native bottom sheet</Text>
        <Button title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
}
```

### The controlled → imperative bridge

Software Mansion's sheet is **fully controlled**: it exposes no imperative ref, and its position is driven entirely by the `index` prop (a zero-based index into `detents`). The stack manager, on the other hand, drives sheets imperatively (`expand()` / `close()`). The adapter bridges the two:

| Manager action / event | What the adapter does |
| --- | --- |
| `expand()` | Sets `index` to `expandedIndex` (defaults to the last detent) |
| `close()` | Sets `index` back to `0` (collapsed) |
| `onSettle(i)` | `i > 0` → reports **opened**; `i === 0` → reports **closed** |
| `onIndexChange(0)` | User swiped down to dismiss → reports **dismiss** (re-snaps up when the sheet is non-dismissable) |
| `onPositionChange` | Drives the shared `animatedIndex` for a smooth backdrop fade |

:::info Collapsed detent
The detent at index `0` must resolve to `0` (collapsed) so the manager can close the sheet — this matches the library's default `detents` of `[0, 'content']`. A dev-mode warning fires if it doesn't.
:::

### Props

Accepts the full prop surface of [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet)'s `BottomSheet` (`detents`, `style`, `animateIn`, `scrimColor`, `disableScrollableNegotiation`, `onIndexChange`, `onSettle`, `onPositionChange`), **except** the props the manager owns:

- `index` — the adapter is the source of truth. Use `expandedIndex` (a prop added by the adapter, defaults to the last detent) to choose which detent the sheet opens to.
- `modal` — the sheet always renders inline so it participates in the manager's z-index stack and shares the manager's `BottomSheetBackdrop`.

Your `onIndexChange` / `onSettle` / `onPositionChange` handlers are still invoked after the adapter's own logic. The `programmatic()` helper plus the `Detent` / `DetentValue` types are re-exported from the subpath for convenience.

### Convenience props

The native sheet is intentionally minimal. The adapter layers a few **opt-in** conveniences on top of it — each defaults to off, so a bare `<SwmansionSheetAdapter>` behaves exactly like the raw native sheet. They are additive: nothing here changes the controlled `detents`/`index` model, and you can still drive everything by hand.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `handle` | `boolean \| { color?, width?, height? } \| ReactElement` | `false` | Renders a grab handle as a chrome layer over the `surface` and insets the content to clear it. Pass `true` for the default pill, an object to restyle it, or a React element for full control. Auto-hidden when dismissal is blocked (see [Close interception](/close-interception)) — a non-draggable sheet showing a grab handle would mislead. |
| `fullHeight` | `boolean` | `false` | Expands the sheet to the full available height (`windowHeight − topInset`). Ignored when explicit `detents` are passed. |
| `fillContent` | `boolean` | _auto_ | Whether the content wrapper flexes to fill the sheet (`flex: 1`). Defaults to `true` for fixed-height sheets (numeric detents or `fullHeight`) so scrollables bind and footers pin to the bottom, and `false` for content-sized sheets. Pass a boolean to override. |
| `keyboardBehavior` | `'none' \| 'inset'` | `'none'` | Keyboard avoidance. `'inset'` grows a content-sized sheet by the keyboard height so it lifts clear of the keyboard (native-iOS behavior). No-op for fixed-height sheets — those should rely on their own scrollable. |

```tsx
// Grab handle + full height + a flex:1 scrollable that binds to the sheet.
<SwmansionSheetAdapter handle fullHeight>
  <ScrollView>{/* ... */}</ScrollView>
</SwmansionSheetAdapter>

// Restyle the default pill.
<SwmansionSheetAdapter handle={{ color: '#999', width: 56, height: 5 }}>
  {/* ... */}
</SwmansionSheetAdapter>

// Or render your own handle for full control.
<SwmansionSheetAdapter handle={<MyCustomGrabber />}>
  {/* ... */}
</SwmansionSheetAdapter>

// Content-sized sheet with a text input that should stay above the keyboard.
<SwmansionSheetAdapter detents={[0, 'content']} keyboardBehavior="inset">
  <View style={{ padding: 20 }}>
    <TextInput placeholder="Type…" />
  </View>
</SwmansionSheetAdapter>
```

:::info `keyboardBehavior="inset"` needs an optional peer
This is the only convenience with an extra dependency: it reads the keyboard height from [`react-native-keyboard-controller`](https://kirillzyusko.github.io/react-native-keyboard-controller/), declared as an **optional** peer. If the package isn't installed, the sheet renders without keyboard avoidance and logs a one-time dev warning — it never crashes. Install it only if you use `keyboardBehavior="inset"`:

```bash
npm install react-native-keyboard-controller
```
:::

### Backdrop

By default the sheet uses the **stack manager's shared backdrop** (`BottomSheetBackdrop`) and the native scrim is disabled (`scrimColor` defaults to `'transparent'`). This is almost always what you want — the manager's backdrop is **stack-aware**: it interpolates opacity correctly across stacked sheets, sits at the right z-index, coordinates with the background scale animation, and participates in cascading tap-to-dismiss.

You **can** opt into the native swmansion scrim by passing `scrimColor` / `scrimOpacities`, but it's **not recommended** — a per-sheet native scrim knows nothing about the rest of the stack. Reach for it only when you genuinely need the native one (e.g. a specific native blur/scrim behavior). When you do, disable the manager backdrop for that sheet so the two don't stack into a double-dark overlay:

```tsx
// Opt into the native scrim…
const sheet = (
  <SwmansionSheetAdapter scrimColor="rgba(0,0,0,0.5)">
    {/* ... */}
  </SwmansionSheetAdapter>
);

// …and turn off the manager backdrop for that sheet:
open(sheet, { backdrop: false });
// (portal/persistent sheets: useBottomSheetControl(...).open({ backdrop: false }))
```

:::warning Don't stack two backdrops
If a native scrim is set while the manager backdrop is still enabled (the default), you get a double-dark overlay. The adapter logs a dev-mode warning when it detects this — pass `{ backdrop: false }` to `open()` to fix it. Prefer the manager backdrop unless you specifically need the native one.
:::

### Android back button

This adapter registers a hardware-back handler automatically (via the internal `useBackHandler`): pressing Android back dismisses the top, fully-open sheet — the same contract the other adapters honor. You don't need to wire anything up yourself.

### When to Use

- You want a fully native sheet built on the New Architecture
- You prefer a controlled `detents`/`index` model
- You don't need Reanimated/Gesture Handler as dependencies (the sheet is native)
