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

---

## BottomSheetScaleView

Wrapper that applies scale animation to its children when sheets are opened with `scaleBackground: true`.

```tsx
<BottomSheetScaleView>
  <YourAppContent />
</BottomSheetScaleView>
```

---

## BottomSheetManaged

Backward-compatible alias for `GorhomSheetAdapter`. Drop-in replacement for `BottomSheet` from `@gorhom/bottom-sheet`.

```tsx
const MySheet = forwardRef((props, ref) => {
  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%', '90%']}>
      <BottomSheetView>
        {/* content */}
      </BottomSheetView>
    </BottomSheetManaged>
  );
});
```

### Props

Inherits all props from [@gorhom/bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/props).

:::tip
`BottomSheetManaged` is a re-export of `GorhomSheetAdapter`. See [Built-in Adapters](/built-in-adapters) for details.
:::

---

## Adapters

Adapters are the components that actually render sheets/modals. Each adapter wraps a different UI library while implementing the same `SheetAdapterRef` interface.

| Adapter | Library | Docs |
|---------|---------|------|
| `GorhomSheetAdapter` | `@gorhom/bottom-sheet` | [Built-in Adapters](/built-in-adapters) |
| `ModalAdapter` | React Native `Modal` | [Built-in Adapters](/built-in-adapters) |
| `ReactNativeModalAdapter` | `react-native-modal` | [Third-Party Adapters](/third-party-adapters) |
| `ActionsSheetAdapter` | `react-native-actions-sheet` | [Third-Party Adapters](/third-party-adapters) |

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
