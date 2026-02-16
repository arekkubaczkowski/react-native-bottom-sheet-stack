import React, { useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

const ActionSheet = require('react-native-actions-sheet').default;

/**
 * Adapter for `react-native-actions-sheet` — a zero-dependency action sheet
 * with snap points and gesture controls.
 *
 * All ActionSheet props are accepted via spread and forwarded to the
 * underlying component. Uses `isModal={false}` internally — the stack
 * manager handles the overlay lifecycle.
 *
 * Requires `react-native-actions-sheet` as a peer dependency:
 * ```
 * npm install react-native-actions-sheet
 * ```
 *
 * @see https://github.com/ammarahm-ed/react-native-actions-sheet
 */
export interface ActionsSheetAdapterProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

export const ActionsSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  ActionsSheetAdapterProps
>(({ children, ...sheetProps }, forwardedRef) => {
  const { id } = useBottomSheetContext();
  const contextRef = useBottomSheetRefContext();

  const actionSheetRef = useRef<any>(null);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  const ref = contextRef ?? forwardedRef;

  useImperativeHandle(
    ref,
    () => ({
      expand: () => actionSheetRef.current?.show(),
      close: () => actionSheetRef.current?.hide(),
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

  return (
    <ActionSheet
      // Adapter defaults (overridable via spread)
      gestureEnabled
      closeOnTouchBackdrop
      closeOnPressBack
      keyboardHandlerEnabled
      {...sheetProps}
      // Managed by adapter (not overridable)
      ref={actionSheetRef}
      isModal={false}
      onOpen={onOpen}
      onClose={onClose}
      onBeforeClose={handleDismiss}
    >
      {children}
    </ActionSheet>
  );
});

ActionsSheetAdapter.displayName = 'ActionsSheetAdapter';
