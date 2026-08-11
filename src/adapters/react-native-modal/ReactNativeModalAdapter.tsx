import React, { useImperativeHandle, useState } from 'react';
import { withTiming } from 'react-native-reanimated';

import type { ModalProps } from 'react-native-modal';

import type {
  AdapterBackdropProps,
  SheetAdapterRef,
} from '../../adapter.types';
import { useSheetPreventDismiss } from '../../store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterBackdrop } from '../../useAdapterBackdrop';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

// Lazy require so the main bundle never loads the library unless this adapter
// is imported (it's an optional peer dependency).
const RNModal = require('react-native-modal').default as React.ComponentType<
  Partial<ModalProps> & { children?: React.ReactNode }
>;

/** react-native-modal's own defaults, mirrored so the backdrop can match them. */
const DEFAULT_ANIMATION_IN_TIMING = 300;
const DEFAULT_ANIMATION_OUT_TIMING = 300;

/**
 * Props for {@link ReactNativeModalAdapter}.
 *
 * Forwards the full prop surface of `react-native-modal`, except the props the
 * stack manager owns:
 *
 * - `isVisible` — the manager drives visibility through the adapter ref.
 * - `coverScreen` — forced off so the modal renders as a plain `View` and
 *   `QueueItem`'s z-index controls stacking.
 * - `hasBackdrop` — forced off; the manager's shared `BottomSheetBackdrop`
 *   provides the overlay.
 * - `onModalShow` / `onModalHide` / `onBackButtonPress` / `onSwipeComplete` —
 *   consumed by the adapter to report lifecycle back to the manager.
 */
export interface ReactNativeModalAdapterProps
  // Partial because react-native-modal declares most of `ModalProps` as
  // required and fills them from `defaultProps` — as a consumer-facing type
  // every one of them is optional.
  extends Partial<
      Omit<
        ModalProps,
        | 'isVisible'
        | 'coverScreen'
        | 'hasBackdrop'
        | 'onModalShow'
        | 'onModalHide'
        | 'onBackButtonPress'
        | 'onSwipeComplete'
        | 'children'
      >
    >,
    AdapterBackdropProps {
  children: React.ReactNode;
}

/**
 * Adapter for `react-native-modal`.
 *
 * The adapter sets opinionated defaults (swipe-to-dismiss, native driver) that
 * can be overridden.
 *
 * Requires `react-native-modal` as a peer dependency:
 * ```
 * npm install react-native-modal
 * ```
 *
 * @see https://github.com/react-native-modal/react-native-modal
 */
export const ReactNativeModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ReactNativeModalAdapterProps
>(
  (
    {
      children,
      animationInTiming = DEFAULT_ANIMATION_IN_TIMING,
      animationOutTiming = DEFAULT_ANIMATION_OUT_TIMING,
      backdrop,
      ...modalProps
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);
    useAdapterBackdrop(id, backdrop);
    const [isVisible, setIsVisible] = useState(false);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          setIsVisible(true);
          // Faded over the modal's own timing rather than set discretely: a
          // discrete set puts the manager's backdrop at full opacity on the
          // first frame, a whole animation ahead of the modal itself.
          animatedIndex.set(
            withTiming(0, {
              duration: animationInTiming,
            })
          );
        },
        close: () => {
          setIsVisible(false);
          animatedIndex.set(
            withTiming(-1, {
              duration: animationOutTiming,
            })
          );
        },
      }),
      [animatedIndex, animationInTiming, animationOutTiming]
    );

    return (
      <RNModal
        // Adapter defaults (overridable via spread)
        animationInTiming={animationInTiming}
        animationOutTiming={animationOutTiming}
        swipeDirection={preventDismiss ? undefined : 'down'}
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
        onSwipeComplete={preventDismiss ? undefined : handleDismiss}
      >
        {children}
      </RNModal>
    );
  }
);

ReactNativeModalAdapter.displayName = 'ReactNativeModalAdapter';
