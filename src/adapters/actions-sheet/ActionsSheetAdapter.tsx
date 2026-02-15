import React, { useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Props for the ActionsSheet adapter. We define our own interface to keep
 * `react-native-actions-sheet` as an optional peer dependency.
 */
export interface ActionsSheetAdapterProps {
  children: React.ReactNode;
  /** Enable gesture controls (default: true) */
  gestureEnabled?: boolean;
  /** Snap points as percentages 0-100 (e.g., [30, 60, 100]) */
  snapPoints?: number[];
  /** Initial snap point index when sheet opens */
  initialSnapIndex?: number;
  /** Close when tapping backdrop (default: true) */
  closeOnTouchBackdrop?: boolean;
  /** Close on Android back button (default: true) */
  closeOnPressBack?: boolean;
  /** Backdrop overlay color */
  overlayColor?: string;
  /** Backdrop opacity (default: 0.3) */
  defaultOverlayOpacity?: number;
  /** Style for the drag indicator */
  indicatorStyle?: Record<string, unknown>;
  /** Style for the sheet container */
  containerStyle?: Record<string, unknown>;
  /** Android status bar translucent */
  statusBarTranslucent?: boolean;
  /** Draw under status bar */
  drawUnderStatusBar?: boolean;
  /** Enable keyboard handling (default: true) */
  keyboardHandlerEnabled?: boolean;
  /** Custom header component */
  CustomHeaderComponent?: React.ReactNode;
  /** Any additional props to pass through to ActionSheet */
  sheetProps?: Record<string, unknown>;
}

/**
 * Adapter for `react-native-actions-sheet` — a zero-dependency action sheet
 * with snap points, gesture controls, and a global SheetManager API.
 *
 * Requires `react-native-actions-sheet` as a peer dependency:
 * ```
 * npm install react-native-actions-sheet
 * ```
 *
 * Note: This adapter wraps ActionSheet directly (not using SheetManager).
 * The stack manager replaces SheetManager's role for coordinating open/close.
 *
 * @example
 * ```tsx
 * <BottomSheetPortal id="my-sheet">
 *   <ActionsSheetAdapter snapPoints={[50, 100]} gestureEnabled>
 *     <View><Text>Sheet content</Text></View>
 *   </ActionsSheetAdapter>
 * </BottomSheetPortal>
 * ```
 */
export const ActionsSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  ActionsSheetAdapterProps
>(
  (
    {
      children,
      gestureEnabled = true,
      snapPoints,
      initialSnapIndex,
      closeOnTouchBackdrop = true,
      closeOnPressBack = true,
      overlayColor,
      defaultOverlayOpacity,
      indicatorStyle,
      containerStyle,
      statusBarTranslucent,
      drawUnderStatusBar,
      keyboardHandlerEnabled = true,
      CustomHeaderComponent,
      sheetProps,
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionSheetRef = useRef<any>(null);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    const ref = contextRef ?? forwardedRef;

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          actionSheetRef.current?.show();
        },
        close: () => {
          actionSheetRef.current?.hide();
        },
      }),
      []
    );

    const onOpen = () => {
      setAnimatedIndexValue(id, 0);
      handleOpened();
    };

    const onClose = () => {
      setAnimatedIndexValue(id, -1);
      handleClosed();
    };

    const onBeforeClose = () => {
      handleDismiss();
    };

    // Lazy import: react-native-actions-sheet is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ActionSheet = require('react-native-actions-sheet').default;

    return (
      <ActionSheet
        ref={actionSheetRef}
        gestureEnabled={gestureEnabled}
        snapPoints={snapPoints}
        initialSnapIndex={initialSnapIndex}
        closeOnTouchBackdrop={closeOnTouchBackdrop}
        closeOnPressBack={closeOnPressBack}
        overlayColor={overlayColor}
        defaultOverlayOpacity={defaultOverlayOpacity}
        indicatorStyle={indicatorStyle}
        containerStyle={containerStyle}
        statusBarTranslucent={statusBarTranslucent}
        drawUnderStatusBar={drawUnderStatusBar}
        keyboardHandlerEnabled={keyboardHandlerEnabled}
        CustomHeaderComponent={CustomHeaderComponent}
        isModal={false}
        onOpen={onOpen}
        onClose={onClose}
        onBeforeClose={onBeforeClose}
        {...sheetProps}
      >
        {children}
      </ActionSheet>
    );
  }
);
