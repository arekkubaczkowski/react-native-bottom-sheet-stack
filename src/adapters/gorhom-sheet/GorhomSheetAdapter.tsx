import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useImperativeHandle, useRef } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type {
  AdapterBackdropProps,
  SheetAdapterRef,
} from '../../adapter.types';
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
 * Forwards the full prop surface of `@gorhom/bottom-sheet`, plus the manager's
 * own `backdrop`.
 *
 * **`backdropComponent` is deprecated.** It renders inside the sheet, so it is
 * not stack-aware and it suppresses the manager's shared backdrop to avoid
 * stacking two overlays. `backdrop={{ kind: 'custom', component }}` gives the
 * same rendering in the manager's own layer; the gorhom prop is removed in the
 * next major.
 */
export interface GorhomSheetAdapterProps
  extends BottomSheetProps,
    AdapterBackdropProps {}

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
      backdropComponent = nullBackdrop,
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

    // A gorhom backdrop draws inside the sheet, so the sheet owns its backdrop:
    // suppress the manager's rather than stack two into a double-dark overlay.
    // An explicit `backdrop` prop is deliberate and outranks that inference.
    const usesDeprecatedBackdrop = backdropComponent !== nullBackdrop;
    useAdapterBackdrop(
      id,
      backdrop !== undefined
        ? backdrop
        : usesDeprecatedBackdrop
          ? false
          : undefined
    );

    if (__DEV__ && usesDeprecatedBackdrop) {
      console.warn(
        '[GorhomSheetAdapter] `backdropComponent` is deprecated and will be removed in the ' +
          'next major. It renders inside the sheet, so it is not stack-aware — use ' +
          "`backdrop={{ kind: 'custom', component }}` instead." +
          (backdrop
            ? ' Both were passed: `backdrop` wins, so the manager still renders its own and ' +
              'the two will stack.'
            : '')
      );
    }

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
        backdropComponent={backdropComponent}
        enablePanDownToClose={preventDismiss ? false : enablePanDownToClose}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);

GorhomSheetAdapter.displayName = 'GorhomSheetAdapter';
