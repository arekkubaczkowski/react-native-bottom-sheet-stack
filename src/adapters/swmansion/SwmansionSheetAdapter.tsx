import React, { type ReactElement, useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  BottomSheet,
  type BottomSheetProps,
} from '@swmansion/react-native-bottom-sheet';

import type {
  AdapterBackdropProps,
  SheetAdapterRef,
} from '../../adapter.types';
import { useSheetPreventDismiss } from '../../store';
import { useAdapterBackdrop } from '../../useAdapterBackdrop';
import { useAdapterRef } from '../../useAdapterRef';
import { useBottomSheetContext } from '../../useBottomSheetContext';
import {
  applyDetentOptions,
  CLOSED_INDEX,
  getDetents,
  isClosedDetent,
  toDetentConfig,
} from './detents';
import { renderSurface, resolveSurfaceRadius } from './surface';
import { useSwmansionKeyboardHeight } from './SwmansionKeyboardInset';
import { useSwmansionMotion } from './useSwmansionMotion';

export type {
  Detent,
  DetentConfig,
  DetentInsets,
  DetentValue,
  ScrollCoordination,
  ScrollCoordinationMode,
  SurfaceStyle,
} from '@swmansion/react-native-bottom-sheet';

/** Style overrides for the built-in grab handle. */
export interface SwmansionHandleConfig {
  /** Defaults to translucent white. */
  color?: string;
  /** Width in px. Defaults to `40`. */
  width?: number;
  /** Height in px. Defaults to `4`. */
  height?: number;
}

/** Inline SWM sheet props. The adapter controls motion and the stack owns the backdrop. */
export interface SwmansionSheetAdapterProps
  extends AdapterBackdropProps,
    Omit<
      BottomSheetProps,
      | 'index'
      | 'animateIn'
      | 'lazy'
      | 'onPositionChange'
      | 'wrapNativeView'
      | 'onIndexChange'
    > {
  /**
   * Opening detent, defaulting to the last. Detent `0` must be closed
   * (`0` or `'0%'`); the default detents are `[0, 'content']`.
   *
   * Integers above the last index are silently clamped. Values below `1`
   * are clamped to `1`, and non-integers select the last detent, with a dev
   * warning in both cases.
   *
   * Changing or removing this prop moves an open sheet, reporting only
   * `onSettle`. A closed sheet uses the new detent on its next open.
   */
  expandedIndex?: number;
  /**
   * Updated on the UI thread during motion and drags. The value is the native
   * distance from the bottom of the host to the top of the sheet.
   */
  animatedPosition?: SharedValue<number>;
  /**
   * `true` draws the default pill, and a config object styles it. A custom
   * element is rendered above the content so it can take touches and reserves
   * `32` px of top padding. The pill is hidden when dismissal is blocked.
   * Defaults to off.
   */
  handle?: boolean | SwmansionHandleConfig | ReactElement;
  /**
   * Fills the height available below `topInset` and within any detached
   * insets. Ignored when `detents` are supplied. Defaults to off.
   */
  fullHeight?: boolean;
  /**
   * Adds `flex: 1` to the content wrapper. Defaults to `true` when the
   * opening detent has a fixed height and `false` for `'content'`.
   */
  fillContent?: boolean;
  /**
   * Floats the card using native detent insets, so touches in the gaps reach
   * the backdrop. A detent's explicit `insets` (including `{}`) win.
   * Defaults to off.
   */
  detached?: boolean;
  /** Detached bottom gap in px. Defaults to the bottom safe-area inset, at least `16`. */
  bottomInset?: number;
  /** Detached gap on each side in px. Defaults to `16`. */
  horizontalInset?: number;
  /**
   * `'none'` (default) leaves keyboard avoidance to the content. `'inset'`
   * pads the content or lifts a detached card, preserving its bottom gap.
   * Use plain content or a plain scrollable with `'inset'`.
   *
   * `'inset'` requires optional peer `react-native-keyboard-controller` >= 1.15
   * with its `KeyboardProvider` at the app root. An absent or older peer
   * disables avoidance and logs one dev warning.
   */
  keyboardBehavior?: 'none' | 'inset';
  /**
   * Radius in px for the top corners, or all four when detached.
   * Defaults to `20` with the built-in surface and `0` with a custom one.
   * Corner radii supplied via `surfaceStyle` take precedence.
   */
  cornerRadius?: number;
  /**
   * Offset above the sheet. Owns the host's `style.top`. Pass `0` to go
   * under the status bar. A negative value is clamped with a dev warning.
   *
   * @default The top safe-area inset.
   */
  topInset?: number;
  /**
   * Reports changed gesture targets, the first `expand()` of each open
   * `(openIndex, 0)`, and corrections after a refused close or upward fling.
   * Silent on same-detent releases, manager closes and `expandedIndex` moves.
   *
   * @param nextIndex The new target index.
   * @param prevIndex The last known target, which may still have been in motion.
   */
  onIndexChange?: (nextIndex: number, prevIndex: number) => void;
}

const DEFAULT_DETACHED_INSET = 16;
const MODAL_ONLY_PROPS = [
  'modal',
  'windowOverlay',
  'onCloseRequest',
  'scrimColor',
  'scrimAccessibilityLabel',
] as const;
type ModalOnlyProp = (typeof MODAL_ONLY_PROPS)[number];

// Keep the sheet in the manager's layer even for untyped callers.
function withoutModalOnlyProps<T extends object>(
  props: T
): Omit<T, ModalOnlyProp> {
  const inline = { ...props } as T & Partial<Record<ModalOnlyProp, unknown>>;
  for (const key of MODAL_ONLY_PROPS) delete inline[key];
  return inline;
}

/** Bridges SWM's controlled index and settle events to the stack's imperative ref. */
export const SwmansionSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  SwmansionSheetAdapterProps
>(
  (
    {
      children,
      backdrop,
      detents: detentsProp,
      expandedIndex,
      onIndexChange,
      onSettle,
      style,
      surface,
      surfaceStyle,
      handle,
      fullHeight,
      fillContent,
      detached,
      bottomInset,
      horizontalInset,
      keyboardBehavior = 'none',
      cornerRadius,
      topInset,
      animatedPosition,
      settleDuration,
      ...rest
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const preventDismiss = useSheetPreventDismiss(id);
    const insets = useSafeAreaInsets();
    const needsKeyboardInset = keyboardBehavior === 'inset';
    const keyboardHeight = useSwmansionKeyboardHeight(needsKeyboardInset);
    useAdapterBackdrop(id, backdrop);

    const detents = getDetents(detentsProp, fullHeight);
    const motion = useSwmansionMotion(id, ref, detents, {
      expandedIndex,
      onIndexChange,
      onSettle,
      animatedPosition,
      settleDuration,
    });
    const { index, openIndex, lastIndex } = motion;
    const canClose =
      detents.length > 1 && isClosedDetent(detents[CLOSED_INDEX]);
    useEffect(() => {
      if (!__DEV__) return;
      if (!canClose) {
        console.warn(
          '[SwmansionSheetAdapter] `detents` needs a closed first detent ' +
            '(`0`) followed by at least one open one, or the sheet cannot ' +
            'close.'
        );
      }
      if (topInset !== undefined && topInset < 0) {
        console.warn(
          `[SwmansionSheetAdapter] \`topInset\` must not be negative. ` +
            `Received ${topInset}; using 0.`
        );
      }
      if (
        expandedIndex !== undefined &&
        expandedIndex !== openIndex &&
        (!Number.isInteger(expandedIndex) || expandedIndex < 1)
      ) {
        console.warn(
          `[SwmansionSheetAdapter] \`expandedIndex\` must be an integer from ` +
            `1 through ${lastIndex}. Received ${String(expandedIndex)}; ` +
            `using ${openIndex}.`
        );
      }
    }, [canClose, expandedIndex, openIndex, lastIndex, topInset]);

    const sideGap = horizontalInset ?? DEFAULT_DETACHED_INSET;
    const resolvedDetents = applyDetentOptions(
      detents,
      preventDismiss,
      detached
        ? {
            left: sideGap,
            right: sideGap,
            bottom:
              bottomInset ?? Math.max(insets.bottom, DEFAULT_DETACHED_INSET),
          }
        : undefined
    );
    const {
      surface: composedSurface,
      contentHandle,
      handlePadding,
    } = renderSurface(surface, handle, preventDismiss);
    const radius = cornerRadius ?? (surface == null ? 20 : 0);
    const radiusStyle = resolveSurfaceRadius(radius, detached, surfaceStyle);

    const openingDetent = toDetentConfig(detents[openIndex] ?? 0);
    const shouldFill = fillContent ?? openingDetent.value !== 'content';
    const activeDetent = index === CLOSED_INDEX ? openIndex : index;
    const bottomGap =
      toDetentConfig(resolvedDetents[activeDetent] ?? 0).insets?.bottom ?? 0;
    // Animate the host so the detached gap stays outside the card.
    const animateHost = needsKeyboardInset && detached;
    const hostBottom = animateHost
      ? (StyleSheet.flatten(style)?.bottom ?? 0)
      : undefined;
    const keyboardHostStyle = useAnimatedStyle<ViewStyle>(() => {
      const height = keyboardHeight.get();
      return { bottom: animateHost && height > 0 ? height : hostBottom };
    });
    const animateContent = needsKeyboardInset && !detached;
    const keyboardContentStyle = useAnimatedStyle(() => ({
      paddingBottom: animateContent
        ? Math.max(0, keyboardHeight.get() - bottomGap)
        : undefined,
    }));
    const wrapContent =
      needsKeyboardInset || shouldFill || handlePadding !== undefined;

    // Use a host offset because ancestor transforms change the native top inset.
    const hostTop = Math.max(topInset ?? insets.top, 0);
    return (
      <BottomSheet
        {...withoutModalOnlyProps(rest)}
        detents={resolvedDetents}
        surfaceStyle={[radiusStyle, surfaceStyle]}
        style={[
          style,
          { top: hostTop },
          // SWM types this as a plain style but forwards it to the animated host.
          animateHost && (keyboardHostStyle as ViewStyle),
        ]}
        // Persistent sheets keep their content mounted at the closed detent.
        lazy={false}
        topInset={0}
        settleDuration={settleDuration}
        index={index}
        animateIn
        wrapNativeView={Animated.createAnimatedComponent}
        onIndexChange={motion.onIndexChange}
        onSettle={motion.onSettle}
        onPositionChange={motion.onPositionChange}
        surface={composedSurface}
      >
        {wrapContent ? (
          <Animated.View
            style={[
              shouldFill ? styles.fill : null,
              handlePadding === undefined
                ? null
                : { paddingTop: handlePadding },
              animateContent && keyboardContentStyle,
            ]}
          >
            {children}
            {contentHandle}
          </Animated.View>
        ) : (
          children
        )}
      </BottomSheet>
    );
  }
);

SwmansionSheetAdapter.displayName = 'SwmansionSheetAdapter';

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
