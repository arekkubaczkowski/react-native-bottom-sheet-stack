import BottomSheetOriginal, {
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useCallback } from 'react';

import {
  useBottomSheetStore,
  type BottomSheetStatus,
} from './bottomSheet.store';
import { useBottomSheetState } from './useBottomSheetState';

export interface BottomSheetRef extends BottomSheetMethods {}

interface BottomSheetManagedProps extends BottomSheetProps {}

export const BottomSheetManaged = React.forwardRef<
  BottomSheetRef,
  BottomSheetManagedProps
>(
  (
    { children, onAnimate, onClose, enablePanDownToClose = true, ...props },
    ref
  ) => {
    const { startClosing, finishClosing } = useBottomSheetStore.getState();
    const { bottomSheetState } = useBottomSheetState();

    const handleOnAnimate: BottomSheetProps['onAnimate'] = useCallback(
      (
        fromIndex: number,
        toIndex: number,
        fromPosition: number,
        toPosition: number
      ) => {
        if (toIndex === -1) {
          if (
            bottomSheetState.status === 'open' ||
            bottomSheetState.status === 'opening'
          ) {
            startClosing(bottomSheetState.id);
          }
        }
        if (fromIndex === -1 && toIndex >= 0) {
          const currentState = useBottomSheetStore.getState();
          useBottomSheetStore.setState({
            stack: currentState.stack.map((s) =>
              s.id === bottomSheetState.id
                ? { ...s, status: 'open' as BottomSheetStatus }
                : s
            ),
          });
        }
        onAnimate?.(fromIndex, toIndex, fromPosition, toPosition);
      },
      [bottomSheetState.id, bottomSheetState.status, onAnimate, startClosing]
    );

    const config = useBottomSheetSpringConfigs({
      stiffness: 400,
      damping: 80,
      mass: 0.7,
    });

    const handleClose = useCallback(() => {
      onClose?.();

      if (bottomSheetState.status !== 'hidden') {
        finishClosing(bottomSheetState.id);
      }
    }, [bottomSheetState.id, bottomSheetState.status, finishClosing, onClose]);

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
        onClose={handleClose}
        onAnimate={handleOnAnimate}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdropComponent}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);
