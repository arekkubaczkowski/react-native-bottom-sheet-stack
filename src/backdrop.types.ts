import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Props handed to a `kind: 'custom'` backdrop component.
 *
 * The component owns its own fade: it receives the sheet's live
 * `animatedIndex` rather than a pre-computed opacity, so blur intensity, a
 * gradient, or anything else can be driven from the sheet's real position on
 * the UI thread — exactly the way the built-in backdrop drives its opacity.
 * Interpolate from `HIDDEN_ANIMATED_INDEX` (-1, hidden) to `0` (fully
 * visible).
 */
export interface BackdropComponentProps {
  sheetId: string;
  /** The sheet's shared value: -1 hidden → 0 fully visible. */
  animatedIndex: SharedValue<number>;
  /**
   * Closes the sheet via `requestClose`, so `onBeforeClose` interceptors
   * still run. The manager's own tap-to-dismiss (`pressToDismiss`) already
   * calls this; the prop exists for components that add their own gestures.
   */
  close: () => void;
}

/**
 * What the shared backdrop renders, as a discriminated union — `kind` is what
 * callers reason about, mirroring `OpenPayload`. A config only changes the
 * *look*: mount timing, z-index/stack handling and tap routing through
 * `requestClose` stay with the manager either way.
 *
 * Levels, most specific winning atomically per visual choice:
 * 1. `backdropConfig` on `BottomSheetManagerProvider` — the group default.
 * 2. The `backdrop` prop on an adapter — per sheet; `false` disables.
 *
 * When both levels are `styled`, their styles compose (group under sheet);
 * `pressToDismiss` always resolves per field.
 */
export type BackdropConfig =
  | {
      kind: 'styled';
      /** Merged over the group's style and the default `rgba(0,0,0,0.5)`. */
      style?: StyleProp<ViewStyle>;
      /** Whether tapping the backdrop closes the sheet. Default: `true`. */
      pressToDismiss?: boolean;
    }
  | {
      kind: 'custom';
      /** Replaces the built-in backdrop view entirely. */
      component: ComponentType<BackdropComponentProps>;
      /** Whether tapping the backdrop closes the sheet. Default: `true`. */
      pressToDismiss?: boolean;
    };
