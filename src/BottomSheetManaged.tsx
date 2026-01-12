import BottomSheetOriginal, {
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useCallback, useMemo } from 'react';

import { createSheetEventHandlers } from './bottomSheetCoordinator';
import { useBottomSheetState } from './useBottomSheetState';

export interface BottomSheetRef extends BottomSheetMethods {}

interface BottomSheetManagedProps extends BottomSheetProps {}

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
      backdropComponent,
      ...props
    },
    ref
  ) => {
    const { bottomSheetState } = useBottomSheetState();

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

    const renderBackdropComponent = useCallback(
      (backdropProps: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    return (
      <BottomSheetOriginal
        animationConfigs={config}
        ref={ref}
        {...props}
        onClose={wrappedOnClose}
        onAnimate={wrappedOnAnimate}
        backdropComponent={backdropComponent || renderBackdropComponent}
        enablePanDownToClose={enablePanDownToClose}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);
