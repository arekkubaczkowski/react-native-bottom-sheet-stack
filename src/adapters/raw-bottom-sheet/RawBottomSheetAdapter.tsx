import React, { useImperativeHandle, useRef } from 'react';
import type { ViewStyle } from 'react-native';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Props for the RawBottomSheet adapter. We define our own interface to keep
 * `react-native-raw-bottom-sheet` as an optional peer dependency.
 */
export interface RawBottomSheetAdapterProps {
  children: React.ReactNode;
  /** Height of the bottom sheet in pixels (default: 260) */
  height?: number;
  /** Duration of opening animation in ms (default: 300) */
  openDuration?: number;
  /** Duration of closing animation in ms (default: 200) */
  closeDuration?: number;
  /** Close when tapping the backdrop mask (default: true) */
  closeOnPressMask?: boolean;
  /** Close on Android back button press (default: false) */
  closeOnPressBack?: boolean;
  /** Enable drag-down gesture to close (default: true) */
  draggable?: boolean;
  /** Allow dragging on content area (default: false, incompatible with ScrollView) */
  dragOnContent?: boolean;
  /** Use native animation driver (default: true) */
  useNativeDriver?: boolean;
  /** Custom styles for wrapper, container, and draggable icon */
  customStyles?: {
    wrapper?: ViewStyle;
    container?: ViewStyle;
    draggableIcon?: ViewStyle;
  };
  /** Additional props for the underlying RN Modal */
  customModalProps?: Record<string, unknown>;
  /** Additional props for KeyboardAvoidingView */
  customAvoidingViewProps?: Record<string, unknown>;
}

/**
 * Adapter for `react-native-raw-bottom-sheet` (RBSheet) — a lightweight,
 * zero-dependency bottom sheet.
 *
 * Requires `react-native-raw-bottom-sheet` as a peer dependency:
 * ```
 * npm install react-native-raw-bottom-sheet
 * ```
 *
 * This is the simplest adapter — RBSheet's ref API (`open()`/`close()`) maps
 * directly to `SheetAdapterRef` (`expand()`/`close()`).
 *
 * @example
 * ```tsx
 * <BottomSheetPortal id="my-sheet">
 *   <RawBottomSheetAdapter height={350} draggable>
 *     <View><Text>Sheet content</Text></View>
 *   </RawBottomSheetAdapter>
 * </BottomSheetPortal>
 * ```
 */
export const RawBottomSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  RawBottomSheetAdapterProps
>(
  (
    {
      children,
      height = 260,
      openDuration = 300,
      closeDuration = 200,
      closeOnPressMask = true,
      closeOnPressBack = false,
      draggable = true,
      dragOnContent = false,
      useNativeDriver = true,
      customStyles,
      customModalProps,
      customAvoidingViewProps,
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rbSheetRef = useRef<any>(null);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    const ref = contextRef ?? forwardedRef;

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          rbSheetRef.current?.open();
        },
        close: () => {
          rbSheetRef.current?.close();
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
      // RBSheet fires onClose for both programmatic and user-initiated closes.
      // We call handleDismiss + handleClosed together since RBSheet
      // doesn't distinguish between the two phases.
      handleDismiss();
      handleClosed();
    };

    // Lazy import: react-native-raw-bottom-sheet is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RBSheet = require('react-native-raw-bottom-sheet').default;

    return (
      <RBSheet
        ref={rbSheetRef}
        height={height}
        openDuration={openDuration}
        closeDuration={closeDuration}
        closeOnPressMask={closeOnPressMask}
        closeOnPressBack={closeOnPressBack}
        draggable={draggable}
        dragOnContent={dragOnContent}
        useNativeDriver={useNativeDriver}
        customStyles={customStyles}
        customModalProps={customModalProps}
        customAvoidingViewProps={customAvoidingViewProps}
        onOpen={onOpen}
        onClose={onClose}
      >
        {children}
      </RBSheet>
    );
  }
);
