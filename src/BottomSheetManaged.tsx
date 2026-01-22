import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React from 'react';

import { getAnimatedIndex } from './animatedRegistry';
import { useSheetStatus } from './bottomSheet.store';
import { createSheetEventHandlers } from './bottomSheetCoordinator';
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
      index: externalIndex,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    const ref = contextRef ?? forwardedRef;

    const status = useSheetStatus(id);
    const shouldBeClosed = status === 'hidden' || status === 'closing';
    const index = externalIndex ?? (shouldBeClosed ? -1 : 0);

    const animatedIndex = externalAnimatedIndex ?? getAnimatedIndex(id);
    const { handleAnimate, handleChange, handleClose } =
      createSheetEventHandlers(id);

    const wrappedOnAnimate: BottomSheetProps['onAnimate'] = (
      fromIndex: number,
      toIndex: number,
      fromPosition: number,
      toPosition: number
    ) => {
      handleAnimate(fromIndex, toIndex);
      onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
    };

    const wrappedOnChange: BottomSheetProps['onChange'] = (
      index: number,
      position: number,
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
        index={index}
        animatedIndex={animatedIndex}
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
