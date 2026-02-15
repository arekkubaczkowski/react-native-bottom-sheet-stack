import React, { useEffect, useImperativeHandle, useState } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

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
  const { id } = useBottomSheetContext();
  const contextRef = useBottomSheetRefContext();
  const [isVisible, setIsVisible] = useState(false);

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
    setAnimatedIndexValue(id, isVisible ? 0 : -1);
  }, [isVisible, id]);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNModal = require('react-native-modal').default;

  return (
    <RNModal
      // Adapter defaults (overridable via spread)
      swipeDirection="down"
      backdropOpacity={0.5}
      useNativeDriver
      hideModalContentWhileAnimating
      {...modalProps}
      // Managed by adapter (not overridable)
      isVisible={isVisible}
      onModalShow={handleOpened}
      onModalHide={handleClosed}
      onBackdropPress={handleDismiss}
      onBackButtonPress={handleDismiss}
      onSwipeComplete={handleDismiss}
    >
      {children}
    </RNModal>
  );
});
