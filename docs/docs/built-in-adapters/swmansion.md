# SwmansionSheetAdapter

Wraps [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet) — Software Mansion's **fully native (Fabric)** bottom sheet driven by a `detents`/`index` model.

:::caution New Architecture required
`@swmansion/react-native-bottom-sheet` is a Fabric native component. It requires the **New Architecture** (`react-native >= 0.76`) and a native build (it does **not** run in Expo Go — use a development build / `expo prebuild`).
:::

## Installation

```bash
npm install @swmansion/react-native-bottom-sheet react-native-safe-area-context
```

## Usage

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

## The controlled → imperative bridge

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

## Props

Accepts the full prop surface of [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet)'s `BottomSheet` (`detents`, `style`, `animateIn`, `scrimColor`, `disableScrollableNegotiation`, `onIndexChange`, `onSettle`, `onPositionChange`), **except** the props the manager owns:

- `index` — the adapter is the source of truth. Use `expandedIndex` (a prop added by the adapter, defaults to the last detent) to choose which detent the sheet opens to.
- `modal` — the sheet always renders inline so it participates in the manager's z-index stack and shares the manager's `BottomSheetBackdrop`.

Your `onIndexChange` / `onSettle` / `onPositionChange` handlers are still invoked after the adapter's own logic. The `programmatic()` helper plus the `Detent`, `DetentValue`, `SwmansionSheetAdapterProps` and `SwmansionHandleConfig` (the `handle` object form) types are exported from the subpath for convenience.

## Convenience props

The native sheet is intentionally minimal. The adapter layers a few **opt-in** conveniences on top of it — each defaults to off, so a bare `<SwmansionSheetAdapter>` behaves exactly like the raw native sheet. They are additive: nothing here changes the controlled `detents`/`index` model, and you can still drive everything by hand.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `handle` | `boolean \| { color?, width?, height? } \| ReactElement` | `false` | Renders a grab handle as a chrome layer over the `surface` and insets the content to clear it. Pass `true` for the default pill, an object to restyle it, or a React element for full control. Auto-hidden when dismissal is blocked (see [Close interception](/close-interception)) — a non-draggable sheet showing a grab handle would mislead. |
| `fullHeight` | `boolean` | `false` | Expands the sheet to the full available height (`windowHeight − topInset`). swmansion detents are only `number` / `'content'`, so there's no built-in full-height value — this computes the pixel height for you, safe-area- and rotation-aware, with no `useWindowDimensions` / `useSafeAreaInsets` boilerplate. Ignored when explicit `detents` are passed. |
| `fillContent` | `boolean` | _auto_ | Stretches the content to fill the sheet (`flex: 1`), so a `flex: 1` scrollable expands and a bottom footer pins to the bottom instead of floating up under the content. Auto and rarely set by hand: `true` for fixed-height sheets (numeric detents or `fullHeight`), `false` for content-sized ones (which must size to their content). Pass a boolean to override. |
| `keyboardBehavior` | `'none' \| 'inset'` | `'none'` | Keyboard avoidance — the native sheet has none. `'inset'` insets the content by the keyboard height (works for both content-sized and fixed-height sheets); `'none'` lets the content handle it. See [Keyboard avoidance](#keyboard-avoidance) for when to use which. Reads the keyboard height from `react-native-keyboard-controller`. |
| `cornerRadius` | `number` | _surface default_ | Top corner radius, applied to the default surface **and** used to clip the content to those corners, so opaque content (e.g. a non-transparent header flush to the top) can't square off the rounded corners. Pass `0` for a flat top. With a custom `surface`, content clipping is off unless you set this to match your surface's radius (the adapter can't infer a custom surface's corners). |

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
```

:::info `keyboardBehavior="inset"` needs an optional peer
This is the only convenience with an extra dependency: it reads the keyboard height from [`react-native-keyboard-controller`](https://kirillzyusko.github.io/react-native-keyboard-controller/), declared as an **optional** peer. If the package isn't installed, the sheet renders without keyboard avoidance and logs a one-time dev warning — it never crashes. Install it only if you use `keyboardBehavior="inset"`:

```bash
npm install react-native-keyboard-controller
```
:::

## Keyboard avoidance

The native swmansion sheet does nothing about the keyboard, so a `TextInput` near the bottom sits under it. `keyboardBehavior` picks **one** layer to handle this — the sheet, or the content. Never both.

### `'inset'` — the sheet handles it

The sheet pads its content by the keyboard height. The effect adapts to the sheet's size automatically:

- **Content-sized** sheet (`'content'` detent): it re-measures taller and the added strip hides behind the keyboard, lifting the content clear of it — matching native iOS.
- **Fixed-height** sheet (numeric `detents` / `fullHeight`): the content area shrinks by the keyboard height, so a scrollable child scrolls within the remaining space above the keyboard.

```tsx
// Content-sized sheet with an input that should stay above the keyboard.
<SwmansionSheetAdapter detents={[0, 'content']} keyboardBehavior="inset">
  <View style={{ padding: 20 }}>
    <TextInput placeholder="Type…" />
  </View>
</SwmansionSheetAdapter>

// Full-height list with a search field in the header.
<SwmansionSheetAdapter fullHeight keyboardBehavior="inset">
  <FlatList style={{ flex: 1 }} ListHeaderComponent={<SearchInput />} /* … */ />
</SwmansionSheetAdapter>
```

The content must be a **plain** scrollable/view. For a fixed-height sheet the scrollable should fill (`flex: 1`) so it can shrink. Do **not** also nest a keyboard-aware scrollable inside — that double-insets and over-scrolls the content (the input jumps out of view on focus).

`'inset'` keeps the focused input *visible*, but it does not *auto-scroll* to a specific input deep in the content. That's fine for a search field in a header (already at the top); for a long form, see `'none'`.

### `'none'` — the content handles it

The sheet ignores the keyboard. Put a keyboard-aware scrollable inside that pads by the keyboard height **and** auto-scrolls the focused field into view — e.g. `KeyboardAwareScrollView` from `react-native-keyboard-controller`. Use this for **multi-field forms**, where focusing a field lower down should bring it above the keyboard.

```tsx
<SwmansionSheetAdapter fullHeight keyboardBehavior="none">
  <KeyboardAwareScrollView style={{ flex: 1 }}>
    {/* many fields — focusing one scrolls it into view */}
  </KeyboardAwareScrollView>
</SwmansionSheetAdapter>
```

### Which one?

| Content | `keyboardBehavior` |
| --- | --- |
| List, simple scroll, search-in-header, short form | `'inset'` (plain scrollable/view inside) |
| Multi-field form that must auto-scroll to the focused field | `'none'` (keyboard-aware scrollable inside) |

Pick exactly one. Combining `'inset'` with a keyboard-aware scrollable lifts the content twice.

## Backdrop

By default the sheet uses the **stack manager's shared backdrop** (`BottomSheetBackdrop`) and the native scrim is disabled (`scrimColor` defaults to `'transparent'`). This is almost always what you want — the manager's backdrop is **stack-aware**: it interpolates opacity correctly across stacked sheets, sits at the right z-index, coordinates with the background scale animation, and participates in cascading tap-to-dismiss.

You **can** opt into the native swmansion scrim by passing `scrimColor` / `scrimOpacities`, but it's **not recommended** — a per-sheet native scrim knows nothing about the rest of the stack. Reach for it only when you genuinely need the native one (e.g. a specific native blur/scrim behavior):

```tsx
<SwmansionSheetAdapter scrimColor="rgba(0,0,0,0.5)">
  {/* ... */}
</SwmansionSheetAdapter>
```

When you pass a scrim, the adapter **automatically disables the manager backdrop** for that sheet — so the two never stack into a double-dark overlay and you don't need to do anything else.

## Android back button

This adapter registers a hardware-back handler automatically (via the internal `useBackHandler`): pressing Android back dismisses the top, fully-open sheet — the same contract the other adapters honor. You don't need to wire anything up yourself.

## When to Use

- You want a fully native sheet built on the New Architecture
- You prefer a controlled `detents`/`index` model
- You don't need Reanimated/Gesture Handler as dependencies (the sheet is native)
