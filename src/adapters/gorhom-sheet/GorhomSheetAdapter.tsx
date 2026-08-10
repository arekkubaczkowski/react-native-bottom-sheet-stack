import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useImperativeHandle, useRef } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { SheetAdapterRef } from '../../adapter.types';
import type { BackdropConfig } from '../../backdrop.types';
import { useSheetPreventDismiss } from '../../store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetDefaultIndex } from '../../BottomSheetDefaultIndex.context';
import { useAdapterBackdrop } from '../../useAdapterBackdrop';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBackHandler } from '../../useBackHandler';
import { useBottomSheetContext } from '../../useBottomSheetContext';

/**
 * Props for {@link GorhomSheetAdapter}.
 *
 * Forwards the full prop surface of `@gorhom/bottom-sheet`, except the props
 * the stack manager owns — among them `backdropComponent`, which is forced to
 * render nothing: the manager draws the one shared, stack-aware backdrop for
 * every sheet, and a per-sheet gorhom backdrop would stack a second overlay on
 * top of it. Configure it through {@link backdrop} instead.
 */
export interface GorhomSheetAdapterProps
  extends Omit<BottomSheetProps, 'backdropComponent'> {
  /**
   * The manager-rendered backdrop for this sheet: a {@link BackdropConfig}
   * overrides the group's `backdropConfig`, `false` disables it. Use
   * `kind: 'custom'` for a blur or any other bespoke rendering — it keeps the
   * stack-aware behaviour a gorhom `backdropComponent` would lose.
   */
  backdrop?: BackdropConfig | false;
}

const nullBackdrop = () => null;

export const GorhomSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  GorhomSheetAdapterProps
>(
  (
    {
      children,
      onAnimate,
      onChange,
      onClose,
      enablePanDownToClose = true,
      backdrop,
      animatedIndex: externalAnimatedIndex,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const contextAnimatedIndex = useAnimatedIndex();
    const defaultIndex = useBottomSheetDefaultIndex();
    const preventDismiss = useSheetPreventDismiss(id);
    useAdapterBackdrop(id, backdrop);

    const gorhomRef = useRef<BottomSheetMethods | null>(null);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    useImperativeHandle(
      ref,
      () => ({
        expand: () => gorhomRef.current?.expand(),
        close: () => gorhomRef.current?.close(),
      }),
      []
    );

    useAnimatedReaction(
      () => contextAnimatedIndex.value,
      (value, prev) => {
        externalAnimatedIndex?.set(value);
        // gorhom can drop its onChange under rapid open/close interruptions
        // (e.g. switch then immediate dismiss), leaving the sheet stuck mid-open.
        // The animated index is the reliable signal: report opened when it
        // crosses into an open snap point (idempotent via the status guard).
        if (typeof prev === 'number' && prev < 0 && value >= 0) {
          scheduleOnRN(handleOpened);
        }
      }
    );

    useBackHandler(id, handleDismiss);

    const wrappedOnAnimate: BottomSheetProps['onAnimate'] = (
      fromIndex,
      toIndex,
      fromPosition,
      toPosition
    ) => {
      // toIndex === -1 means gorhom is animating toward closed state
      if (toIndex === -1) {
        handleDismiss();
      }
      onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
    };

    const wrappedOnChange: BottomSheetProps['onChange'] = (
      index,
      position,
      type
    ) => {
      if (index >= 0) {
        handleOpened();
      }
      onChange?.(index, position, type);
    };

    const wrappedOnClose = () => {
      onClose?.();
      handleClosed();
    };

    const config = useBottomSheetSpringConfigs({
      stiffness: 400,
      damping: 80,
      mass: 0.7,
    });

    return (
      <BottomSheetOriginal
        animationConfigs={config}
        ref={gorhomRef}
        {...props}
        index={defaultIndex}
        animatedIndex={contextAnimatedIndex}
        onChange={wrappedOnChange}
        onClose={wrappedOnClose}
        onAnimate={wrappedOnAnimate}
        // The manager owns the backdrop; gorhom's own must render nothing so
        // the two never stack into a double-dark overlay.
        backdropComponent={nullBackdrop}
        enablePanDownToClose={preventDismiss ? false : enablePanDownToClose}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);

GorhomSheetAdapter.displayName = 'GorhomSheetAdapter';
