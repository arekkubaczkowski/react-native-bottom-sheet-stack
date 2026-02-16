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

## Adapters

Adapters are the components that actually render sheets/modals. Each adapter wraps a different UI library while implementing the same `SheetAdapterRef` interface.

Adapters with 3rd-party dependencies are shipped as separate subpath exports:

| Adapter | Import | Library | Docs |
|---------|--------|---------|------|
| `GorhomSheetAdapter` | `react-native-bottom-sheet-stack/gorhom` | `@gorhom/bottom-sheet` | [Shipped Adapters](/built-in-adapters) |
| `CustomModalAdapter` | `react-native-bottom-sheet-stack` | Custom Animated View | [Shipped Adapters](/built-in-adapters) |
| `ReactNativeModalAdapter` | `react-native-bottom-sheet-stack/react-native-modal` | `react-native-modal` | [Shipped Adapters](/built-in-adapters) |
| `ActionsSheetAdapter` | `react-native-bottom-sheet-stack/actions-sheet` | `react-native-actions-sheet` | [Shipped Adapters](/built-in-adapters) |

:::tip
`BottomSheetManaged` is available as a deprecated re-export from `react-native-bottom-sheet-stack/gorhom` for backward compatibility.
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
