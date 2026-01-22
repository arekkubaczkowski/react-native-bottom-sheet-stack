import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React from 'react';

import { useAnimatedReaction } from 'react-native-reanimated';
import { useBottomSheetAnimatedIndexContext } from './BottomSheetAnimatedIndex.context';
import { createSheetEventHandlers } from './bottomSheetCoordinator';
import { useBottomSheetDefaultIndex } from './BottomSheetDefaultIndex.context';
import { useBottomSheetRefContext } from './BottomSheetRef.context';
import { useBottomSheetContext } from './useBottomSheetContext';

export interface BottomSheetRef extends BottomSheetMethods {}

interface BottomSheetManagedProps extends BottomSheetProps {}

const nullBackdrop = () => null;

export const BottomSheetManaged = React.forwardRef<
  BottomSheetRef,
  BottomSheetManagedProps
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
    const contextRef = useBottomSheetRefContext();
    const ref = contextRef ?? forwardedRef;

    const defaultIndex = useBottomSheetDefaultIndex();
    const contextAnimatedIndex = useBottomSheetAnimatedIndexContext();

    useAnimatedReaction(
      () => contextAnimatedIndex.value,
      (value) => {
        externalAnimatedIndex?.set(value);
      }
    );

    const { handleAnimate, handleChange, handleClose } =
      createSheetEventHandlers(id);

    const wrappedOnAnimate: BottomSheetProps['onAnimate'] = (
      fromIndex,
      toIndex,
      fromPosition,
      toPosition
    ) => {
      handleAnimate(fromIndex, toIndex);
      onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
    };

    const wrappedOnChange: BottomSheetProps['onChange'] = (
      index,
      position,
      type
    ) => {
      handleChange(index);
      onChange?.(index, position, type);
    };

    const wrappedOnClose = () => {
      onClose?.();
      handleClose();
    };

    const config = useBottomSheetSpringConfigs({
      stiffness: 400,
      damping: 80,
      mass: 0.7,
    });

    return (
      <BottomSheetOriginal
        animationConfigs={config}
        ref={ref}
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
