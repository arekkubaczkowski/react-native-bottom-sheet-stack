import React, { useImperativeHandle, useState } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

let RNModal: any;
try {
  RNModal = require('react-native-modal').default;
} catch {
  // Optional dependency — resolved lazily when the adapter renders.
}

/**
 * Adapter for `react-native-modal`.
 *
 * All react-native-modal props are accepted via spread and forwarded
 * to the underlying component. The adapter sets opinionated defaults
 * (swipe-to-dismiss, native driver) that can be overridden.
 *
 * Requires `react-native-modal` as a peer dependency:
 * ```
 * npm install react-native-modal
 * ```
 *
 * @see https://github.com/react-native-modal/react-native-modal
 */
export interface ReactNativeModalAdapterProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

export const ReactNativeModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ReactNativeModalAdapterProps
>(({ children, ...modalProps }, forwardedRef) => {
  if (!RNModal) {
    throw new Error(
      'ReactNativeModalAdapter requires "react-native-modal". Install it with: yarn add react-native-modal'
    );
  }

  const { id } = useBottomSheetContext();
  const ref = useAdapterRef(forwardedRef);
  const animatedIndex = useAnimatedIndex();
  const [isVisible, setIsVisible] = useState(false);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  useImperativeHandle(
    ref,
    () => ({
      expand: () => {
        setIsVisible(true);
        animatedIndex.set(0);
      },
      close: () => {
        setIsVisible(false);
        animatedIndex.set(-1);
      },
    }),
    [animatedIndex]
  );

  return (
    <RNModal
      // Adapter defaults (overridable via spread)
      swipeDirection="down"
      useNativeDriver
      hideModalContentWhileAnimating
      {...modalProps}
      // Managed by adapter (not overridable)
      // coverScreen={false}: renders as View instead of native Modal,
      // so QueueItem z-index controls stacking order for push mode.
      // hasBackdrop={false}: manager's BottomSheetBackdrop handles the overlay.
      isVisible={isVisible}
      coverScreen={false}
      hasBackdrop={false}
      onModalShow={handleOpened}
      onModalHide={handleClosed}
      onBackButtonPress={handleDismiss}
      onSwipeComplete={handleDismiss}
    >
      {children}
    </RNModal>
  );
});

ReactNativeModalAdapter.displayName = 'ReactNativeModalAdapter';
