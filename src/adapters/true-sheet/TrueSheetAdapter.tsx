import React, { useImperativeHandle, useRef } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Adapter for `@lodev09/react-native-true-sheet` — a fully native (C++/Fabric)
 * bottom sheet.
 *
 * All TrueSheet props are accepted via spread and forwarded to the
 * underlying component. Requires React Native New Architecture (Fabric).
 *
 * Requires `@lodev09/react-native-true-sheet` as a peer dependency:
 * ```
 * npm install @lodev09/react-native-true-sheet
 * ```
 *
 * @see https://github.com/lodev09/react-native-true-sheet
 */
export interface TrueSheetAdapterProps {
  children: React.ReactNode;
  [key: string]: unknown;
}

export const TrueSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  TrueSheetAdapterProps
>(({ children, ...sheetProps }, forwardedRef) => {
  const { id } = useBottomSheetContext();
  const contextRef = useBottomSheetRefContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trueSheetRef = useRef<any>(null);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  const ref = contextRef ?? forwardedRef;

  useImperativeHandle(
    ref,
    () => ({
      expand: () => trueSheetRef.current?.present(),
      close: () => trueSheetRef.current?.dismiss(),
    }),
    []
  );

  const onDidPresent = () => {
    setAnimatedIndexValue(id, 0);
    handleOpened();
  };

  const onDidDismiss = () => {
    setAnimatedIndexValue(id, -1);
    handleClosed();
  };

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TrueSheet } = require('@lodev09/react-native-true-sheet');

  return (
    <TrueSheet
      // Adapter defaults (overridable via spread)
      detents={['auto']}
      grabber
      dismissible
      draggable
      dimmed
      {...sheetProps}
      // Managed by adapter (not overridable)
      ref={trueSheetRef}
      onDidPresent={onDidPresent}
      onWillDismiss={handleDismiss}
      onDidDismiss={onDidDismiss}
    >
      {children}
    </TrueSheet>
  );
});
