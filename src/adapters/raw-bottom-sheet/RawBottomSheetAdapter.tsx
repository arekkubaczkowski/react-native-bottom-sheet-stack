import React, { useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Adapter for `react-native-raw-bottom-sheet` (RBSheet) — a lightweight,
 * zero-dependency bottom sheet.
 *
 * All RBSheet props are accepted via spread and forwarded to the
 * underlying component.
 *
 * Requires `react-native-raw-bottom-sheet` as a peer dependency:
 * ```
 * npm install react-native-raw-bottom-sheet
 * ```
 *
 * @see https://github.com/nicoleho0707/react-native-raw-bottom-sheet
 */
export interface RawBottomSheetAdapterProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

export const RawBottomSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  RawBottomSheetAdapterProps
>(({ children, ...sheetProps }, forwardedRef) => {
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
      expand: () => rbSheetRef.current?.open(),
      close: () => rbSheetRef.current?.close(),
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
    // Call both since RBSheet doesn't distinguish between the two phases.
    handleDismiss();
    handleClosed();
  };

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RBSheet = require('react-native-raw-bottom-sheet').default;

  return (
    <RBSheet
      // Adapter defaults (overridable via spread)
      height={260}
      draggable
      closeOnPressMask
      useNativeDriver
      {...sheetProps}
      // Managed by adapter (not overridable)
      ref={rbSheetRef}
      onOpen={onOpen}
      onClose={onClose}
    >
      {children}
    </RBSheet>
  );
});
