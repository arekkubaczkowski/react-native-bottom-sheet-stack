import React, { useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

let ActionSheet: any;
try {
  ActionSheet = require('react-native-actions-sheet').default;
} catch {
  // Optional dependency — resolved lazily when the adapter renders.
}

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
  if (!ActionSheet) {
    throw new Error(
      'ActionsSheetAdapter requires "react-native-actions-sheet". Install it with: yarn add react-native-actions-sheet'
    );
  }

  const { id } = useBottomSheetContext();
  const ref = useAdapterRef(forwardedRef);
  const animatedIndex = useAnimatedIndex();

  const actionSheetRef = useRef<any>(null);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  useImperativeHandle(
    ref,
    () => ({
      expand: () => actionSheetRef.current?.show(),
      close: () => actionSheetRef.current?.hide(),
    }),
    []
  );

  const onOpen = () => {
    animatedIndex.set(0);
    handleOpened();
  };

  const onClose = () => {
    animatedIndex.set(-1);
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
