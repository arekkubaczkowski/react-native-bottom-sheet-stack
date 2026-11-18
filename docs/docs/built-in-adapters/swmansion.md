# SwmansionSheetAdapter

Wraps [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion/react-native-bottom-sheet) — Software Mansion's **fully native (Fabric)** bottom sheet driven by a `detents`/`index` model.

:::caution New Architecture required
`@swmansion/react-native-bottom-sheet` is a Fabric native component. It requires the **New Architecture**, **React Native >= 0.82** and **React >= 19.1.1**, and a native build (it does **not** run in Expo Go — use a development build / `expo prebuild`).
:::

## Installation

```bash
npm install @swmansion/react-native-bottom-sheet react-native-safe-area-context
```

:::caution Requires `@swmansion/react-native-bottom-sheet` 1.x
The adapter is built on API that 1.0 has and earlier versions do not: the
`topInset` prop, the native `surfaceStyle` that rounds and clips the sheet,
per-detent `insets` for the detached presentation, and `scrollCoordination`.
Upgrading from 2.x of this library? See [Migrating from 2.x](#migrating-from-2x).
:::

## Usage

```tsx
import { Button, Text, View } from 'react-native';
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
| `expand()` | Sets `index` to `expandedIndex` (defaults to the last detent). If the sheet already rests there, the native sheet stays silent, so the adapter reports **opened** itself |
| `close()` | Sets `index` back to the closed detent. If the sheet already rests there, the adapter reports **closed** itself |
| `onSettle(i)` on an open detent | Reports **opened**. If the manager is already closing the sheet — the user caught it mid-close and flung it back up — the sheet goes back down instead |
| `onSettle(i)` on the closed detent | Reports **closed** only while the manager is closing the sheet. If the manager never agreed to close it — an `onBeforeClose` interceptor declined or is still deciding — the sheet goes back up to its open detent |
| `onIndexChange(i)` to the closed detent | The user dragged the sheet closed → asks the manager to **dismiss** it, which runs any `onBeforeClose` interceptor |
| `onIndexChange(i)` to another open detent | The user snapped between open detents → `index` follows, and the sheet stays open |
| `expandedIndex` changes | An open sheet moves to the new detent (to the last one when `expandedIndex` is unset). A closed sheet stays closed and opens there next time |
| `onPositionChange` | Drives the shared `animatedIndex` on the UI thread for a smooth backdrop fade |
| No settle after a drive | When the main thread is busy, React Native can hand a drive and its reversal to native as one update, and native then settles nothing. If no settle arrives within `settleDuration` plus a second, and the sheet is visibly resting on its target, the adapter reports the target itself. A sheet resting on another detent is rechecked for four more seconds and then reported at the target anyway. A sheet between detents — a finger holding it — is never finished by this; the adapter waits for the release |

:::info Closed detent
The detent at index `0` must be closed (`0` or `'0%'`) so the manager can close the sheet, and at least one open detent must follow it — this matches the library's default `detents` of `[0, 'content']`. A dev-mode warning fires once if it doesn't.
:::

## Props

Accepts the prop surface of [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion/react-native-bottom-sheet)'s inline `BottomSheet` and forwards `detents`, `style`, `surface`, `surfaceStyle`, `topInset`, `animateContentHeight`, `scrollCoordination`, `settleDuration` (in milliseconds), `onIndexChange` and `onSettle`.

Not accepted, because the manager owns them:

- `index` — the adapter is the source of truth. Use `expandedIndex` (a prop added by the adapter, defaults to the last detent) to choose which detent the sheet opens to.
- `animateIn` — the manager controls the open animation, so it is forced on.
- `lazy` — forced off. It unmounts the content at the closed detent, which is where a persistent sheet rests between opens.
- `onPositionChange` / `wrapNativeView` — consumed by the adapter to drive the backdrop fade on the UI thread. Pass `animatedPosition` to observe the position.
- Every modal-only prop (`scrimColor`, a detent's `scrimOpacity`, `scrimAccessibilityLabel`, `windowOverlay`, `onCloseRequest`). The manager always renders the sheet inline; see [Backdrop](#backdrop).

`topInset` is applied by offsetting the sheet's host rather than natively: the native default follows where the host sits in the window, and the manager's background scale moves that. It defaults to the top safe-area inset; pass `0` to let the sheet go under the status bar. Because it owns the host's `top`, a `top` in `style` is ignored.

Your `onIndexChange` / `onSettle` handlers are still invoked after the adapter's own logic. The subpath also exports the `SwmansionSheetAdapterProps` and `SwmansionHandleConfig` (the `handle` object form) types, and re-exports upstream's `Detent`, `DetentValue`, `DetentConfig`, `DetentInsets`, `SurfaceStyle`, `ScrollCoordination` and `ScrollCoordinationMode` types.

:::info `onIndexChange` is wider than the native prop
The adapter's `onIndexChange` differs from the native one in two ways:

- **It fires on the programmatic open too.** The native callback skips programmatic `index` changes (and `onSettle` only reports the *end* of the animation), so there's no native signal for the start of a manager-driven open. The adapter emits `onIndexChange(openIndex, 0)` once per open, at open-animation start, giving you an immediate open hook (e.g. haptics).
- **It receives the previous index.** The signature is `(nextIndex, prevIndex)` — the first argument keeps the native meaning (the index the sheet is moving to), and the second is the index the sheet was at before the change, so you can tell the direction without tracking it yourself.

It fires only when the index actually changes: releasing a drag back onto the detent it started from is silent. When the adapter overrules a user gesture, it reports the way back too — `(openIndex, 0)` when an interceptor declines a dragged close and the sheet returns up, `(0, i)` when a closing sheet the user flung up goes back down.

It does **not** fire for a manager-driven close, nor for a move you make by changing `expandedIndex` — you already know about those. To follow a close, read `useBottomSheetStatus(id)`, which reports `isClosing`; `onSettle` reports the end of every movement.

```tsx
<SwmansionSheetAdapter
  detents={[0, 'content']}
  onIndexChange={(nextIndex, prevIndex) => {
    if (nextIndex > prevIndex) haptics.impact(); // opening / expanding
  }}
>
  {/* ... */}
</SwmansionSheetAdapter>
```

Handlers that read only the first argument are unaffected.
:::

## Convenience props

The adapter layers a few **opt-in** conveniences over the native sheet. They are additive: nothing here changes the controlled `detents`/`index` model.

A bare `<SwmansionSheetAdapter>` is not quite the raw native sheet, though. It paints a `#151521` surface with a 20-point top corner radius, offsets the sheet's host by the top safe-area inset, forces `animateIn` and owns `index`. Pass your own `surface`, `cornerRadius` and `topInset` to change the first three.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `expandedIndex` | `number` | _last detent_ | Index into `detents` the sheet expands to when opened. Replaces the native `index`, which the adapter owns. An integer above `detents.length - 1` is clamped to the last detent silently, since `detents` may shrink under it; one below `1` is clamped to `1` and a non-integer falls back to the last detent, both with a dev warning. Changing it moves an open sheet to the new detent. |
| `handle` | `boolean \| { color?, width?, height? } \| ReactElement` | `false` | Renders a grab handle and insets the content to clear it. Pass `true` for the default pill (translucent white, made for a dark surface), an object to restyle it, or a React element for full control. An element renders above the content, so a button inside it takes touches. The pill is hidden while dismissal is blocked (see [Close interception](/close-interception)) — a non-draggable sheet showing a grab handle would mislead. An element always renders, so a close button in it stays reachable. |
| `fullHeight` | `boolean` | `false` | Expands the sheet to the full height available to it. Upstream has percentage detents now, but this stays a shorthand for "as tall as the sheet can be": it passes a detent taller than any screen, which native caps to the space it has. Stays below the status bar unless `topInset={0}`; with `detached`, the space the insets leave. Ignored when explicit `detents` are passed. |
| `detached` | `boolean` | `false` | Floats the sheet free of the screen edges — the *detached* presentation from `@gorhom/bottom-sheet`. The gaps are native detent `insets`, so a tap in them reaches the backdrop, and all four corners are rounded. A detent that states its own `insets` keeps them. See [Detached sheets](#detached-sheets). |
| `bottomInset` | `number` | _safe-area bottom, at least `16`_ | Gap below the sheet. Only meaningful with `detached`. |
| `horizontalInset` | `number` | `16` | Gap on each side. Only meaningful with `detached`. |
| `fillContent` | `boolean` | _auto_ | Stretches the content to fill the sheet (`flex: 1`), so a `flex: 1` scrollable expands and a bottom footer pins to the bottom instead of floating up under the content. Auto and rarely set by hand: `true` for fixed-height sheets (numeric or percentage detents, or `fullHeight`), `false` for content-sized ones (which must size to their content). Pass a boolean to override. |
| `keyboardBehavior` | `'none' \| 'inset'` | `'none'` | Keyboard avoidance — the native sheet has none. `'inset'` insets the content by the keyboard height (works for both content-sized and fixed-height sheets); `'none'` lets the content handle it. See [Keyboard avoidance](#keyboard-avoidance) for when to use which. |
| `cornerRadius` | `number` | `20`, or `0` with a custom `surface` | Corner radius of the sheet, applied through the native `surfaceStyle`, which clips the surface and the content alike — so opaque content flush to the top can't square off the corners. Rounds the top two corners, or all four when `detached`. Pass `0` for a flat top. A radius set in `surfaceStyle` wins: the adapter then adds none of its own. |
| `topInset` | `number` | _safe-area top_ | Space kept above the sheet. Applied as an offset of the sheet's host, not natively, so the background scale cannot shift the sheet. Pass `0` to go under the status bar; a negative value is clamped to `0` with a dev warning. |
| `animatedPosition` | `SharedValue<number>` | — | A shared value the adapter writes the native position to on the UI thread: the distance from the bottom of the sheet's host to the top of the sheet. Use it to drive animations that follow the sheet, including while it is dragged. |

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

// Follow the sheet's position.
const position = useSharedValue(0);
<SwmansionSheetAdapter detents={[0, 200, 400]} animatedPosition={position}>
  {/* ... */}
</SwmansionSheetAdapter>
```

:::info `keyboardBehavior="inset"` needs an optional peer
This is the only convenience with an extra dependency: it follows the keyboard through [`react-native-keyboard-controller`](https://kirillzyusko.github.io/react-native-keyboard-controller/) **>= 1.15**, declared as an **optional** peer, with its `KeyboardProvider` at the root of your app. If the package is missing or older, the sheet renders without keyboard avoidance and logs a one-time dev warning. Install it only if you use `keyboardBehavior="inset"`:

```bash
npm install react-native-keyboard-controller
```
:::

## Keyboard avoidance

The native swmansion sheet does nothing about the keyboard, so a `TextInput` near the bottom sits under it. `keyboardBehavior` picks **one** layer to handle this — the sheet, or the content. Never both.

### `'inset'` — the sheet handles it

The sheet pads its content by the keyboard height, from the moment the keyboard starts to show until it starts to hide. The effect adapts to the sheet's size automatically:

- **Content-sized** sheet (`'content'` detent): it re-measures taller and the added strip hides behind the keyboard, lifting the content clear of it.
- **Fixed-height** sheet (numeric or percentage `detents` / `fullHeight`): the content area shrinks by the keyboard height, so a scrollable child scrolls within the remaining space above the keyboard.

With `detached`, the gap below the card already covers that much of the keyboard, so the content is padded only by the rest.

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

## Detached sheets

`detached` lifts the sheet off the screen edges instead of anchoring it to the bottom, matching the *detached* presentation from `@gorhom/bottom-sheet`:

```tsx
<SwmansionSheetAdapter detached handle detents={[0, 'content']}>
  <View style={{ padding: 20 }}>{/* ... */}</View>
</SwmansionSheetAdapter>

// Override the insets.
<SwmansionSheetAdapter detached bottomInset={48} horizontalInset={24}>
  {/* ... */}
</SwmansionSheetAdapter>
```

The adapter gives every open detent the gaps as native detent `insets`, unless the detent states its own. Space in an inset is not part of the sheet: a tap in a gap reaches the backdrop, which dismisses the sheet like any other backdrop tap. Percentage detents and `fullHeight` resolve against the space the insets leave. The card keeps its shape and slides through the bottom gap on its way in and out.

All four corners are rounded through the native `surfaceStyle`, which clips the surface and the content. An anchored sheet keeps its bottom two corners square.

To open as a floating card and expand to full height, give the upper detent an empty `insets` object. The lower detent inherits the detached gaps and the sheet interpolates the side and bottom gaps to zero as it moves up.

```tsx
<SwmansionSheetAdapter
  detached
  handle
  expandedIndex={1}
  detents={[0, 'content', { value: '100%', insets: {} }]}
>
  <View style={{ padding: 20 }}>{/* ... */}</View>
</SwmansionSheetAdapter>
```

The full-height detent still respects `topInset`, which defaults to the top safe-area inset. The same corner radii apply at both heights.

:::note Shadows
Put a shadow in `surfaceStyle` (`boxShadow`, or `elevation` / the `shadow*` props); the native sheet casts it outside the card. A shadow drawn by the `surface` element itself is clipped with the surface.

```tsx
<SwmansionSheetAdapter
  detached
  surfaceStyle={{ boxShadow: '0 8 24 rgba(0, 0, 0, 0.35)' }}
>
  {/* ... */}
</SwmansionSheetAdapter>
```
:::

Defaults are chosen so a bare `detached` looks right: `16` horizontally, and the bottom safe-area inset (at least `16`) vertically, so the sheet clears the home indicator.

## Backdrop

The sheet uses the **stack manager's shared backdrop** (`BottomSheetBackdrop`), faded from the sheet's live native position via `onPositionChange`. The manager's backdrop is **stack-aware**: it interpolates opacity correctly across stacked sheets, sits at the right z-index, coordinates with the background scale animation, and participates in cascading tap-to-dismiss.

:::info There is no native-scrim option here
swmansion's `scrimColor` and a detent's `scrimOpacity` only apply to **modal** sheets (`ModalBottomSheet`). The manager always renders inline inside its `QueueItem` layer so the sheet's z-index participates in the stack, so the native scrim would never paint. The adapter therefore does not accept those props. To render no backdrop at all, pass `backdrop={false}` to the adapter; to restyle or replace it, pass a `BackdropConfig` — see [Backdrop](/backdrop).
:::

## Android back button

This adapter registers a hardware-back handler automatically (via `useBackHandler`): pressing Android back dismisses the top, fully open sheet of its group. When the sheet has an `onBeforeClose` interceptor, Back asks it first. You don't need to wire anything up yourself.

## When to Use

- You want a fully native sheet built on the New Architecture
- You prefer a controlled `detents`/`index` model
- You don't want Gesture Handler as a dependency for the sheet (the stack manager itself still needs Reanimated)

## Migrating from 2.x

3.0 moves the adapter to `@swmansion/react-native-bottom-sheet` 1.x.

- **Peers.** `@swmansion/react-native-bottom-sheet` `^1.0.0`, which needs React Native >= 0.82 and React >= 19.1.1. For `keyboardBehavior="inset"`, `react-native-keyboard-controller` >= 1.15.
- **Removed.** Upstream dropped these, and 3.0 drops them too:

  | 2.x | 3.x |
  | --- | --- |
  | `programmatic(value)` | `{ value, programmatic: true }` |
  | `extendUnderStatusBar` | `topInset={0}` |
  | `disableScrollableNegotiation` | `scrollCoordination="none"` |

- **`scrimColor` is now a type error.** 2.x inherited it from upstream's inline sheet, where it never painted. Upstream 1.0 made it modal-only, so the adapter no longer accepts it. Delete it, and use the [`backdrop`](#backdrop) prop to style the backdrop.

- **`settleDuration` is in milliseconds** in upstream 1.0.
- **Corners and shadows go through `surfaceStyle`.** `cornerRadius` is applied natively and clips the content; a radius in `surfaceStyle` wins over it. A shadow drawn by a custom `surface` element is now clipped — move it to `surfaceStyle`.
- **Detached gaps pass touches.** A tap beside or below a detached card reaches the backdrop and dismisses the sheet.
- **`expandedIndex` is live.** Changing it moves an open sheet. Out-of-range values are clamped and a non-integer falls back to the last detent; all but a value above the last detent warn in development. Unsetting it moves an open sheet to the last detent.
- **A custom `handle` element takes touches**, and stays visible while an interceptor blocks dismissal. Only the default pill hides.
- **`topInset` wins over `style.top`.**
- **`onIndexChange` follows user snaps between open detents**, and the programmatic-open call fires once per open as `(openIndex, 0)`.
- **Upstream behaviour changes** that are not this adapter's, but that you will notice: Android settles in about 0.45 s instead of about 0.2 s; a gentle swipe can reach the next detent before the midpoint; and an upward drag hands off from the sheet to a nested scrollable without lifting the finger (the default since upstream 0.17; `scrollCoordination` changes it).
