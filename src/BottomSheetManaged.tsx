import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React from 'react';

import { getAnimatedIndex } from './animatedRegistry';
import { createSheetEventHandlers } from './bottomSheetCoordinator';
import { useBottomSheetContext } from './useBottomSheetContext';

export interface BottomSheetRef extends BottomSheetMethods {}

interface BottomSheetManagedProps extends BottomSheetProps {}

// Null backdrop - we render our own backdrop separately in BottomSheetHost
const nullBackdrop = () => null;

export const BottomSheetManaged = React.forwardRef<
  BottomSheetRef,
  BottomSheetManagedProps
>(
  (
    {
      children,
      onAnimate,
      onClose,
      enablePanDownToClose = true,
      backdropComponent = nullBackdrop,
      animatedIndex: externalAnimatedIndex,
      ...props
    },
    ref
  ) => {
    const { bottomSheetState } = useBottomSheetContext();

    // Get or create shared animated index for this sheet
    const animatedIndex =
      externalAnimatedIndex ?? getAnimatedIndex(bottomSheetState.id);

    const { handleAnimate, handleClose } = createSheetEventHandlers(
      bottomSheetState.id
    );

    const wrappedOnAnimate: BottomSheetProps['onAnimate'] = (
      fromIndex: number,
      toIndex: number,
      fromPosition: number,
      toPosition: number
    ) => {
      handleAnimate(fromIndex, toIndex);
      onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
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
        animatedIndex={animatedIndex}
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
