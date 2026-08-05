# SwmansionSheetAdapter

Wraps [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet) — Software Mansion's **fully native (Fabric)** bottom sheet driven by a `detents`/`index` model.

:::caution New Architecture required
`@swmansion/react-native-bottom-sheet` is a Fabric native component. It requires the **New Architecture** (`react-native >= 0.76`) and a native build (it does **not** run in Expo Go — use a development build / `expo prebuild`).
:::

## Installation

```bash
npm install @swmansion/react-native-bottom-sheet react-native-safe-area-context
```

:::caution Requires `@swmansion/react-native-bottom-sheet >= 0.16`
0.16 moved all sheet geometry to native measurement (the JS-provided height cap
is gone) and rewrote the position-follower path — the 120 Hz display link and
spring prediction on iOS, per-frame spring emission on Android. The adapter's
backdrop fade rides on that path, so on older versions it updates at half rate
and lags the sheet.
:::

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
| `close()` | Sets `index` back to the collapsed detent |
| `onSettle(i)` | Settled on a zero-height detent → reports **closed**; anything else → reports **opened** |
| `onIndexChange(i)` | User swiped down to a zero-height detent → reports **dismiss** (re-snaps up when the sheet is non-dismissable) |
| `onPositionChange` | Drives the shared `animatedIndex` for a smooth backdrop fade |

:::info Collapsed detent
The detent at index `0` must resolve to `0` (collapsed) so the manager can close the sheet — this matches the library's default `detents` of `[0, 'content']`. A dev-mode warning fires if it doesn't.
:::

## Props

Accepts the full prop surface of [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet)'s `BottomSheet` (`detents`, `style`, `surface`, `extendUnderStatusBar`, `animateContentHeight`, `disableScrollableNegotiation`, `onIndexChange`, `onSettle`), **except** the props the manager owns:

- `index` — the adapter is the source of truth. Use `expandedIndex` (a prop added by the adapter, defaults to the last detent) to choose which detent the sheet opens to.
- `animateIn` — the manager controls the open animation, so it is forced on.
- `onPositionChange` / `wrapNativeView` — consumed by the adapter to drive the backdrop fade on the UI thread.

Your `onIndexChange` / `onSettle` handlers are still invoked after the adapter's own logic. The `programmatic()` helper plus the `Detent`, `DetentValue`, `SwmansionSheetAdapterProps` and `SwmansionHandleConfig` (the `handle` object form) types are exported from the subpath for convenience.

:::info `onIndexChange` is wider than the native prop
The adapter's `onIndexChange` differs from the native one in two ways:

- **It fires on the programmatic open too.** The native callback skips programmatic `index` changes (and `onSettle` only reports the *end* of the animation), so there's no native signal for the start of a manager-driven open. The adapter emits `onIndexChange` at open-animation start, giving you an immediate open hook (e.g. haptics).
- **It receives the previous index.** The signature is `(nextIndex, prevIndex)` — the first argument keeps the native meaning (the index the sheet is moving to), and the second is the index the sheet was at before the change, so you can tell the direction without tracking it yourself.

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

The native sheet is intentionally minimal. The adapter layers a few **opt-in** conveniences on top of it — each defaults to off, so a bare `<SwmansionSheetAdapter>` behaves exactly like the raw native sheet. They are additive: nothing here changes the controlled `detents`/`index` model, and you can still drive everything by hand.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `expandedIndex` | `number` | _last detent_ | Index into `detents` the sheet expands to when opened. Replaces the native `index`, which the adapter owns. The detent at index `0` must still resolve to `0`, since that is what the manager snaps back to when closing. |
| `handle` | `boolean \| { color?, width?, height? } \| ReactElement` | `false` | Renders a grab handle as a chrome layer over the `surface` and insets the content to clear it. Pass `true` for the default pill, an object to restyle it, or a React element for full control. Auto-hidden when dismissal is blocked (see [Close interception](/close-interception)) — a non-draggable sheet showing a grab handle would mislead. |
| `fullHeight` | `boolean` | `false` | Expands the sheet to the full height available to it. swmansion detents are only `number` / `'content'`, and neither expresses "as tall as you can go" — this passes a detent taller than any screen, which native clamps to the height it actually measured. Stays below the status bar unless you also pass `extendUnderStatusBar`; combined with `detached`, it means the detached frame's height. Ignored when explicit `detents` are passed. |
| `detached` | `boolean` | `false` | Floats the sheet free of the screen edges — the *detached* presentation from `@gorhom/bottom-sheet`. All four corners are rounded and the sheet rises from the inset frame. See [Detached sheets](#detached-sheets). |
| `bottomInset` | `number` | _safe-area bottom, at least `16`_ | Gap below the sheet. Only meaningful with `detached`. |
| `horizontalInset` | `number` | `16` | Gap on each side. Only meaningful with `detached`. |
| `fillContent` | `boolean` | _auto_ | Stretches the content to fill the sheet (`flex: 1`), so a `flex: 1` scrollable expands and a bottom footer pins to the bottom instead of floating up under the content. Auto and rarely set by hand: `true` for fixed-height sheets (numeric detents or `fullHeight`), `false` for content-sized ones (which must size to their content). Pass a boolean to override. |
| `keyboardBehavior` | `'none' \| 'inset'` | `'none'` | Keyboard avoidance — the native sheet has none. `'inset'` insets the content by the keyboard height (works for both content-sized and fixed-height sheets); `'none'` lets the content handle it. See [Keyboard avoidance](#keyboard-avoidance) for when to use which. Reads the keyboard height from `react-native-keyboard-controller`. |
| `cornerRadius` | `number` | _surface default_ | Corner radius, applied to the default surface **and** used to clip the content to those corners (top two, or all four when `detached`), so opaque content (e.g. a non-transparent header flush to the top) can't square off the rounded corners. Pass `0` for a flat top. With a custom `surface`, content clipping is off unless you set this to match your surface's radius (the adapter can't infer a custom surface's corners). |

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

Detaching works by giving the sheet a **smaller canvas**: the adapter wraps it in a frame inset by those values, and the native host fills that frame. The detent cap is measured from it, so `'content'` and `fullHeight` resolve against the detached height — no arithmetic on your side. All four corners are rounded (an anchored sheet keeps its bottom two square), and the content is clipped to match.

The frame also clips, and that part is load-bearing rather than cosmetic: the native sheet container is a full-canvas view translated down to the current position, and it is explicitly *not* clipped to its host, so its surface hangs below by whatever the sheet has not expanded yet. Unclipped, that surface would paint straight over the bottom gap and the sheet would not read as detached at all. The same overhang is why the frame — not the surface — carries the bottom corner radii: the surface's own bottom edge sits outside the frame entirely.

:::note Shadows on a custom `surface`
Because the frame clips, a shadow cast by a custom `surface` is clipped with it. The native sheet itself draws no shadow, so the default surface is unaffected.
:::

Defaults are chosen so a bare `detached` looks right: `16` horizontally, and the bottom safe-area inset (at least `16`) vertically, so the sheet clears the home indicator.

## Backdrop

The sheet uses the **stack manager's shared backdrop** (`BottomSheetBackdrop`), faded from the sheet's live native position via `onPositionChange`. The manager's backdrop is **stack-aware**: it interpolates opacity correctly across stacked sheets, sits at the right z-index, coordinates with the background scale animation, and participates in cascading tap-to-dismiss.

:::info There is no native-scrim option here
swmansion's `scrimColor` / `scrimOpacities` only apply to **modal** sheets. The manager always renders inline inside its `QueueItem` layer so the sheet's z-index participates in the stack, and the native scrim is gated on `modal` on both platforms — so it would never paint. The adapter therefore does not accept those props. To render no backdrop at all, pass `backdrop: false` when opening the sheet.
:::

## Android back button

This adapter registers a hardware-back handler automatically (via `useBackHandler`): pressing Android back dismisses the top, fully-open sheet — the same contract the other adapters honor. You don't need to wire anything up yourself.

## When to Use

- You want a fully native sheet built on the New Architecture
- You prefer a controlled `detents`/`index` model
- You don't need Reanimated/Gesture Handler as dependencies (the sheet is native)
