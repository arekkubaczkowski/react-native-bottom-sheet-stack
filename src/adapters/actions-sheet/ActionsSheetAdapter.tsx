import React, { useImperativeHandle, useRef } from 'react';
import { withSpring } from 'react-native-reanimated';

import type {
  ActionSheetProps,
  ActionSheetRef,
} from 'react-native-actions-sheet';

import type { SheetAdapterRef } from '../../adapter.types';
import { useSheetPreventDismiss } from '../../store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

// Lazy require so the main bundle never loads the library unless this adapter
// is imported (it's an optional peer dependency).
const ActionSheet = require('react-native-actions-sheet')
  .default as React.ComponentType<
  ActionSheetProps & React.RefAttributes<ActionSheetRef>
>;

/**
 * Props for {@link ActionsSheetAdapter}.
 *
 * Forwards the full prop surface of `react-native-actions-sheet`, except the
 * props the stack manager owns:
 *
 * - `isModal` — forced off; the manager handles the overlay lifecycle.
 * - `onOpen` / `onClose` / `onBeforeClose` — consumed by the adapter to report
 *   lifecycle back to the manager.
 */
export interface ActionsSheetAdapterProps
  extends Omit<
    ActionSheetProps,
    'isModal' | 'onOpen' | 'onClose' | 'onBeforeClose' | 'children'
  > {
  children: React.ReactNode;
}

/**
 * Adapter for `react-native-actions-sheet` — a zero-dependency action sheet
 * with snap points and gesture controls.
 *
 * Requires `react-native-actions-sheet` as a peer dependency:
 * ```
 * npm install react-native-actions-sheet
 * ```
 *
 * @see https://github.com/ammarahm-ed/react-native-actions-sheet
 */
export const ActionsSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  ActionsSheetAdapterProps
>(
  (
    { children, openAnimationConfig, closeAnimationConfig, ...sheetProps },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);

    const actionSheetRef = useRef<ActionSheetRef>(null);

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

    // Sprung with the sheet's own config rather than set discretely: a discrete
    // set puts the manager's backdrop at full opacity on the first frame, ahead
    // of the sheet it is meant to be backing. The sheet animates with a spring,
    // so the backdrop uses one too — same config, same curve.
    //
    // onOpen/onClose fire when the sheet *starts* moving, which is what makes
    // this work: the fade runs alongside the sheet's own animation.
    const onOpen = () => {
      animatedIndex.set(withSpring(0, openAnimationConfig));
      handleOpened();
    };

    const onClose = () => {
      animatedIndex.set(withSpring(-1, closeAnimationConfig));
      handleClosed();
    };

    return (
      <ActionSheet
        // Adapter defaults (overridable via spread)
        gestureEnabled={!preventDismiss}
        closeOnTouchBackdrop={!preventDismiss}
        closeOnPressBack={!preventDismiss}
        keyboardHandlerEnabled
        openAnimationConfig={openAnimationConfig}
        closeAnimationConfig={closeAnimationConfig}
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
  }
);

ActionsSheetAdapter.displayName = 'ActionsSheetAdapter';
