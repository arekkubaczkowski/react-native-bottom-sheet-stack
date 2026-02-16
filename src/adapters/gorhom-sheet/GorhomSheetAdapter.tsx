import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import React, { useImperativeHandle, useRef } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';

import type { SheetAdapterRef } from '../../adapter.types';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetDefaultIndex } from '../../BottomSheetDefaultIndex.context';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBackHandler } from '../../useBackHandler';
import { useBottomSheetContext } from '../../useBottomSheetContext';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

export interface GorhomSheetAdapterProps extends BottomSheetProps {}

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
      animatedIndex: externalAnimatedIndex,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const contextAnimatedIndex = useAnimatedIndex();
    const defaultIndex = useBottomSheetDefaultIndex();

    const gorhomRef = useRef<BottomSheetMethods | null>(null);

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
      (value) => {
        externalAnimatedIndex?.set(value);
      }
    );

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

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
      // index >= 0 means sheet reached a valid snap point (opened)
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
        enablePanDownToClose={enablePanDownToClose}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);

GorhomSheetAdapter.displayName = 'GorhomSheetAdapter';
