---
sidebar_position: 5
---

# Scale Animation

Enable iOS-style background scaling when bottom sheets are opened.

## Setup

Wrap your app content in `BottomSheetScaleView`:

```tsx
<BottomSheetManagerProvider id="default">
  <BottomSheetScaleView>
    <YourAppContent />
  </BottomSheetScaleView>
  <BottomSheetHost />
</BottomSheetManagerProvider>
```

:::warning Important
`BottomSheetHost` must be **outside** of `BottomSheetScaleView`. If you wrap `BottomSheetHost` inside `BottomSheetScaleView`, the bottom sheets themselves will also scale, which is not the desired behavior.
:::

## Enable Scale Effect

Open sheets with `scaleBackground: true`:

```tsx
openBottomSheet(<MySheet />, { scaleBackground: true });
```

Or with the portal API:

```tsx
const { open } = useBottomSheetControl('my-sheet');
open({ scaleBackground: true });
```

## Custom Configuration

Configure the scale animation via `BottomSheetManagerProvider`:

```tsx
<BottomSheetManagerProvider
  id="default"
  scaleConfig={{
    scale: 0.92,      // Scale factor (default: 0.92)
    translateY: 0,    // Y translation
    borderRadius: 24, // Border radius when scaled
    animation: {      // Animation type and config
      type: 'timing',
      config: { duration: 300 },
    },
  }}
>
  {/* ... */}
</BottomSheetManagerProvider>
```

### Using Spring Animation

For a more natural feel, use spring animation:

```tsx
<BottomSheetManagerProvider
  id="default"
  scaleConfig={{
    scale: 0.92,
    borderRadius: 24,
    animation: {
      type: 'spring',
      config: { damping: 15, stiffness: 150 },
    },
  }}
>
  {/* ... */}
</BottomSheetManagerProvider>
```

## ScaleConfig Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scale` | `number` | `0.92` | Scale factor applied to background |
| `translateY` | `number` | `10` | Vertical translation in pixels |
| `borderRadius` | `number` | `12` | Border radius when scaled |
| `animation` | `ScaleAnimationConfig` | `{ type: 'timing', config: { duration: 300 } }` | Animation configuration |

## ScaleAnimationConfig

The `animation` property accepts either timing or spring configuration:

```tsx
// Timing animation
{ type: 'timing', config?: WithTimingConfig }

// Spring animation
{ type: 'spring', config?: WithSpringConfig }
```

`WithTimingConfig` and `WithSpringConfig` are types from `react-native-reanimated`.
