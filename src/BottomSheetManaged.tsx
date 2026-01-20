import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useCallback, useMemo } from 'react';

import { getAnimatedIndex } from './animatedRegistry';
import { createSheetEventHandlers } from './bottomSheetCoordinator';
import { useBottomSheetState } from './useBottomSheetState';

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
    const { bottomSheetState } = useBottomSheetState();

    // Get or create shared animated index for this sheet
    const animatedIndex = useMemo(
      () => externalAnimatedIndex ?? getAnimatedIndex(bottomSheetState.id),
      [bottomSheetState.id, externalAnimatedIndex]
    );

    const { handleAnimate, handleClose } = useMemo(
      () => createSheetEventHandlers(bottomSheetState.id),
      [bottomSheetState.id]
    );

    const wrappedOnAnimate: BottomSheetProps['onAnimate'] = useCallback(
      (
        fromIndex: number,
        toIndex: number,
        fromPosition: number,
        toPosition: number
      ) => {
        handleAnimate(fromIndex, toIndex);
        onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
      },
      [handleAnimate, onAnimate]
    );

    const wrappedOnClose = useCallback(() => {
      onClose?.();
      handleClose();
    }, [handleClose, onClose]);

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
