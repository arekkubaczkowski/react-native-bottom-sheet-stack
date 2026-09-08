---
sidebar_position: 1
---

# Components

## BottomSheetManagerProvider

Root provider that manages the bottom sheet stack.

```tsx
<BottomSheetManagerProvider
  id="default"
  scaleConfig={{ scale: 0.92, translateY: 0, borderRadius: 24 }}
>
  {children}
</BottomSheetManagerProvider>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this stack group |
| `scaleConfig` | `ScaleConfig` | No | Scale animation configuration |
| `backdrop` | `BackdropConfig \| false` | No | The group's default backdrop; `false` disables it for the whole group. A sheet overrides it with the `backdrop` prop on its adapter. See [Backdrop](/backdrop) |
| `children` | `ReactNode` | Yes | App content |

---

## BottomSheetHost

Renders the bottom sheet stack. Must be placed inside `BottomSheetManagerProvider`.

```tsx
<BottomSheetManagerProvider id="default">
  <BottomSheetScaleView>
    <YourAppContent />
  </BottomSheetScaleView>
  <BottomSheetHost />
</BottomSheetManagerProvider>
```

:::warning
Place `BottomSheetHost` **outside** of `BottomSheetScaleView` to prevent sheets from scaling.
:::

### Props

| Prop | Type | Description |
|------|------|-------------|
| `SheetWrapper` | `React.ComponentType<SheetWrapperProps>` | Rendered around every **inline** sheet's content, inside that sheet's context. Receives `{ id, sheetRef, children }`. Portal and persistent sheets render where they are declared and are not wrapped. The prop **value** must stay stable for the life of the host — see below. |

The wrapper is used as an element **type**, so a new prop value remounts every inline sheet: the adapter replays its open animation (its fresh shared value rewinds `animatedIndex`, so the backdrop blanks first) and a stateful wrapper loses its state — an error boundary forgets that it already failed. Pass a module-scope component; an inline arrow and a derived value (`flag ? SheetErrorBoundary : undefined`, or swapping one module-scope wrapper for another) both break it, the latter on the frame the flag resolves, typically while a sheet is open. Changing the value warns once per host in dev.

Use it to put an error boundary around each sheet, so one sheet failing never takes the host down. The fallback **must** render an adapter bound to `sheetRef`, so the manager keeps driving the sheet — `useBottomSheetContext().close()` still closes it. A fallback without an adapter leaves a sheet that crashes mid-close stuck at `closing`: `closeAll` skips it, `close()` answers `not-closable`, the Android back button is dead for the group, and its id is unusable until `destroyAll()`.

```tsx
class SheetErrorBoundary extends React.Component<
  SheetWrapperProps,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <CustomModalAdapter ref={this.props.sheetRef}>
        <Text>This sheet could not be shown.</Text>
        <CloseButton />
      </CustomModalAdapter>
    );
  }
}

<BottomSheetHost SheetWrapper={SheetErrorBoundary} />;
```

An adapter that mounts while its sheet is already `open` is expanded on mount, so the fallback appears in place without extra wiring. If it mounts while the sheet is `closing`, the sheet is ended instead — a crash mid-dismissal finishes the close rather than popping the error card back up.

---

## BottomSheetScaleView

Wrapper that applies scale animation to its children when sheets are opened with `scaleBackground: true`.

```tsx
<BottomSheetScaleView>
  <YourAppContent />
</BottomSheetScaleView>
```

---

## Adapters

Adapters are the components that actually render sheets/modals. Each adapter wraps a different UI library while implementing the same `SheetAdapterRef` interface.

Adapters with 3rd-party dependencies are shipped as separate subpath exports:

| Adapter | Import | Library | Docs |
|---------|--------|---------|------|
| `GorhomSheetAdapter` | `react-native-bottom-sheet-stack/gorhom` | `@gorhom/bottom-sheet` | [GorhomSheetAdapter](/built-in-adapters/gorhom) |
| `CustomModalAdapter` | `react-native-bottom-sheet-stack` | Custom Animated View | [CustomModalAdapter](/built-in-adapters/custom-modal) |
| `ReactNativeModalAdapter` | `react-native-bottom-sheet-stack/react-native-modal` | `react-native-modal` | [ReactNativeModalAdapter](/built-in-adapters/react-native-modal) |
| `ActionsSheetAdapter` | `react-native-bottom-sheet-stack/actions-sheet` | `react-native-actions-sheet` | [ActionsSheetAdapter](/built-in-adapters/actions-sheet) |
| `SwmansionSheetAdapter` | `react-native-bottom-sheet-stack/swmansion` | `@swmansion/react-native-bottom-sheet` | [SwmansionSheetAdapter](/built-in-adapters/swmansion) |

:::tip
Each sheet in the stack picks its own adapter — bottom sheets and modals can be
mixed freely in one stack.
:::

See [Library-Agnostic Architecture](/adapters) for how adapters work, or [Building Custom Adapters](/custom-adapters) to create your own.

---

## BottomSheetPortal

Declares a portal-based bottom sheet that preserves React context.

```tsx
<BottomSheetPortal id="my-sheet">
  <MySheet />
</BottomSheetPortal>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `BottomSheetPortalId` | Yes | Unique identifier for this portal sheet |
| `children` | `ReactElement` | Yes | The bottom sheet component to render |

See [Type-Safe Portal IDs](/type-safe-ids) for type-safe ID configuration.

---

## BottomSheetPersistent

Declares a persistent bottom sheet that stays mounted even when closed. Opens instantly and preserves internal state between open/close cycles.

```tsx
<BottomSheetPersistent id="scanner">
  <ScannerSheet />
</BottomSheetPersistent>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `BottomSheetPortalId` | Yes | Unique identifier for this persistent sheet |
| `children` | `ReactElement` | Yes | The bottom sheet component to render |

### Placement

Can be placed anywhere inside `BottomSheetManagerProvider`. Must stay mounted to be accessible.

```tsx
// At app root - always available
<BottomSheetManagerProvider id="main">
  <BottomSheetScaleView>
    <App />
  </BottomSheetScaleView>
  <BottomSheetHost />
  <BottomSheetPersistent id="scanner">
    <ScannerSheet />
  </BottomSheetPersistent>
</BottomSheetManagerProvider>

// Or on a specific screen
function HomeScreen() {
  return (
    <View>
      <BottomSheetPersistent id="quick-actions">
        <QuickActionsSheet />
      </BottomSheetPersistent>
    </View>
  );
}
```

See [Persistent Sheets](/persistent-sheets) for detailed usage.
