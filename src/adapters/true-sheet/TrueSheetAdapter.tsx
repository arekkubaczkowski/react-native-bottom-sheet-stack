import React, { useEffect, useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { getAnimatedIndex } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Props for the TrueSheet adapter. We define our own interface to keep
 * `@lodev09/react-native-true-sheet` as an optional peer dependency.
 */
export interface TrueSheetAdapterProps {
  children: React.ReactNode;
  /**
   * Array of detent positions. Up to 3 values.
   * - `'auto'` for content-based sizing
   * - `0.0` to `1.0` fractional values (e.g., 0.5 = 50% of screen)
   * @default ['auto']
   */
  detents?: Array<'auto' | number>;
  /** Index of the detent to present at initially (default: 0) */
  initialDetentIndex?: number;
  /** Enable/disable dismissal via drag or background tap (default: true) */
  dismissible?: boolean;
  /** Enable/disable dragging (default: true) */
  draggable?: boolean;
  /** Show dimmed background overlay (default: true) */
  dimmed?: boolean;
  /** Detent index at which dimming starts */
  dimmedDetentIndex?: number;
  /** Sheet background color */
  backgroundColor?: string;
  /** Show native grabber handle (default: true) */
  grabber?: boolean;
  /** Corner radius */
  cornerRadius?: number;
  /** Header component (stays fixed while content scrolls) */
  header?: React.ReactNode;
  /** Footer component (stays fixed while content scrolls) */
  footer?: React.ReactNode;
  /** Any additional props to pass through to TrueSheet */
  sheetProps?: Record<string, unknown>;
}

/**
 * Adapter for `@lodev09/react-native-true-sheet` — a fully native (C++/Fabric)
 * bottom sheet with the best performance characteristics.
 *
 * Requires `@lodev09/react-native-true-sheet` as a peer dependency:
 * ```
 * npm install @lodev09/react-native-true-sheet
 * ```
 *
 * Note: Requires React Native New Architecture (Fabric).
 *
 * @example
 * ```tsx
 * <BottomSheetPortal id="my-sheet">
 *   <TrueSheetAdapter detents={['auto', 0.6]} grabber>
 *     <View><Text>Native sheet content</Text></View>
 *   </TrueSheetAdapter>
 * </BottomSheetPortal>
 * ```
 */
export const TrueSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  TrueSheetAdapterProps
>(
  (
    {
      children,
      detents = ['auto'],
      initialDetentIndex = 0,
      dismissible = true,
      draggable = true,
      dimmed = true,
      dimmedDetentIndex,
      backgroundColor,
      grabber = true,
      cornerRadius,
      header,
      footer,
      sheetProps,
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trueSheetRef = useRef<any>(null);

    const animatedIndex = getAnimatedIndex(id);
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    const ref = contextRef ?? forwardedRef;

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          trueSheetRef.current?.present();
        },
        close: () => {
          trueSheetRef.current?.dismiss();
        },
      }),
      []
    );

    const onDidPresent = () => {
      if (animatedIndex) {
        animatedIndex.value = 0;
      }
      handleOpened();
    };

    const onWillDismiss = () => {
      handleDismiss();
    };

    const onDidDismiss = () => {
      if (animatedIndex) {
        animatedIndex.value = -1;
      }
      handleClosed();
    };

    // Lazy import: @lodev09/react-native-true-sheet is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TrueSheet } = require('@lodev09/react-native-true-sheet');

    return (
      <TrueSheet
        ref={trueSheetRef}
        detents={detents}
        initialDetentIndex={initialDetentIndex}
        dismissible={dismissible}
        draggable={draggable}
        dimmed={dimmed}
        dimmedDetentIndex={dimmedDetentIndex}
        backgroundColor={backgroundColor}
        grabber={grabber}
        cornerRadius={cornerRadius}
        header={header}
        footer={footer}
        onDidPresent={onDidPresent}
        onWillDismiss={onWillDismiss}
        onDidDismiss={onDidDismiss}
        {...sheetProps}
      >
        {children}
      </TrueSheet>
    );
  }
);
