import React, { useEffect, useImperativeHandle, useState } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { getAnimatedIndex } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Props accepted by react-native-modal that we expose on the adapter.
 * We don't import the actual ModalProps to keep the dependency optional.
 */
export interface ReactNativeModalAdapterProps {
  children: React.ReactNode;
  /** Animation when showing (default: 'slideInUp'). Any react-native-animatable animation string. */
  animationIn?: string;
  /** Animation when hiding (default: 'slideOutDown') */
  animationOut?: string;
  /** Animation in duration in ms (default: 300) */
  animationInTiming?: number;
  /** Animation out duration in ms (default: 300) */
  animationOutTiming?: number;
  /** Swipe direction(s) to dismiss (default: 'down') */
  swipeDirection?: 'up' | 'down' | 'left' | 'right' | Array<'up' | 'down' | 'left' | 'right'>;
  /** Swipe threshold distance (default: 100) */
  swipeThreshold?: number;
  /** Show backdrop (default: true) */
  hasBackdrop?: boolean;
  /** Backdrop color (default: 'black') */
  backdropColor?: string;
  /** Backdrop opacity (default: 0.5) */
  backdropOpacity?: number;
  /** Cover entire screen (default: true) */
  coverScreen?: boolean;
  /** Avoid keyboard (default: false) */
  avoidKeyboard?: boolean;
  /** Use native animation driver (default: true) */
  useNativeDriver?: boolean;
  /** Hide content while animating (fixes useNativeDriver flicker) */
  hideModalContentWhileAnimating?: boolean;
  /** Propagate swipe events to children */
  propagateSwipe?: boolean;
  /** iOS presentation style */
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  /** Android status bar translucent */
  statusBarTranslucent?: boolean;
  /** Any additional props to pass through to react-native-modal */
  modalProps?: Record<string, unknown>;
}

/**
 * Adapter for `react-native-modal` (https://github.com/react-native-modal/react-native-modal).
 *
 * Requires `react-native-modal` as a peer dependency. Install it separately:
 * ```
 * npm install react-native-modal
 * ```
 *
 * This adapter bridges the prop-controlled `isVisible` API of react-native-modal
 * with the stack manager's `SheetAdapterRef` (expand/close) interface.
 *
 * @example
 * ```tsx
 * <BottomSheetPortal id="my-modal">
 *   <ReactNativeModalAdapter animationIn="fadeIn" animationOut="fadeOut">
 *     <View><Text>Modal content</Text></View>
 *   </ReactNativeModalAdapter>
 * </BottomSheetPortal>
 * ```
 */
export const ReactNativeModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ReactNativeModalAdapterProps
>(
  (
    {
      children,
      animationIn = 'slideInUp',
      animationOut = 'slideOutDown',
      animationInTiming = 300,
      animationOutTiming = 300,
      swipeDirection = 'down',
      swipeThreshold = 100,
      hasBackdrop = true,
      backdropColor = 'black',
      backdropOpacity = 0.5,
      coverScreen = true,
      avoidKeyboard = false,
      useNativeDriver = true,
      hideModalContentWhileAnimating = true,
      propagateSwipe,
      presentationStyle,
      statusBarTranslucent,
      modalProps,
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    const [isVisible, setIsVisible] = useState(false);

    const animatedIndex = getAnimatedIndex(id);
    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    const ref = contextRef ?? forwardedRef;

    useImperativeHandle(
      ref,
      () => ({
        expand: () => setIsVisible(true),
        close: () => setIsVisible(false),
      }),
      []
    );

    useEffect(() => {
      if (animatedIndex) {
        animatedIndex.value = isVisible ? 0 : -1;
      }
    }, [isVisible, animatedIndex]);

    // Lazy import: react-native-modal is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNModal = require('react-native-modal').default;

    return (
      <RNModal
        isVisible={isVisible}
        animationIn={animationIn}
        animationOut={animationOut}
        animationInTiming={animationInTiming}
        animationOutTiming={animationOutTiming}
        swipeDirection={swipeDirection}
        swipeThreshold={swipeThreshold}
        hasBackdrop={hasBackdrop}
        backdropColor={backdropColor}
        backdropOpacity={backdropOpacity}
        coverScreen={coverScreen}
        avoidKeyboard={avoidKeyboard}
        useNativeDriver={useNativeDriver}
        hideModalContentWhileAnimating={hideModalContentWhileAnimating}
        propagateSwipe={propagateSwipe}
        presentationStyle={presentationStyle}
        statusBarTranslucent={statusBarTranslucent}
        onModalShow={handleOpened}
        onModalHide={handleClosed}
        onBackdropPress={handleDismiss}
        onBackButtonPress={handleDismiss}
        onSwipeComplete={handleDismiss}
        {...modalProps}
      >
        {children}
      </RNModal>
    );
  }
);
