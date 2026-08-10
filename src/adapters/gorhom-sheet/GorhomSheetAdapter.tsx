import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useEffect, useImperativeHandle, useRef } from 'react';
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

export interface GorhomSheetAdapterProps extends BottomSheetProps {
  /**
   * This sheet's manager-rendered backdrop: a {@link BackdropConfig} overrides
   * the group's `backdropConfig`, `false` disables it. Distinct from gorhom's
   * own `backdropComponent`, which renders inside the sheet — passing that
   * alone suppresses the manager's backdrop so the two don't stack.
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
      backdropComponent = nullBackdrop,
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

    const gorhomRef = useRef<BottomSheetMethods | null>(null);

    // Passing a custom gorhom backdrop means this sheet owns its backdrop, so
    // suppress the manager's shared one to avoid stacking two into a
    // double-dark overlay — unless an explicit `backdrop` prop says otherwise;
    // being deliberate, it outranks the inference.
    const usesCustomBackdrop = backdropComponent !== nullBackdrop;
    useAdapterBackdrop(
      id,
      backdrop !== undefined ? backdrop : usesCustomBackdrop ? false : undefined
    );
    const hasExplicitBackdrop = backdrop !== undefined;
    useEffect(() => {
      if (__DEV__ && usesCustomBackdrop && hasExplicitBackdrop) {
        console.warn(
          '[GorhomSheetAdapter] Both `backdrop` and a custom `backdropComponent` were passed. ' +
            'The explicit `backdrop` prop wins, so the manager keeps rendering its shared ' +
            'backdrop and the two will stack; drop one of them.'
        );
      }
    }, [usesCustomBackdrop, hasExplicitBackdrop]);

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
        backdropComponent={backdropComponent}
        enablePanDownToClose={preventDismiss ? false : enablePanDownToClose}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);

GorhomSheetAdapter.displayName = 'GorhomSheetAdapter';
