import BottomSheetOriginal, {
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { type BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React from 'react';

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

    const handleOnAnimate: BottomSheetProps['onAnimate'] = (
      from: number,
      to: number
    ) => {
      if (to === -1) {
        if (
          bottomSheetState.status === 'open' ||
          bottomSheetState.status === 'opening'
        ) {
          startClosing(bottomSheetState.id);
        }
      }
      if (from === -1 && to >= 0) {
        const currentState = useBottomSheetStore.getState();
        useBottomSheetStore.setState({
          stack: currentState.stack.map((s) =>
            s.id === bottomSheetState.id
              ? { ...s, status: 'open' as BottomSheetStatus }
              : s
          ),
        });
      }
      onAnimate?.(from, to);
    };

    const config = useBottomSheetSpringConfigs({
      stiffness: 400,
      damping: 80,
      mass: 0.7,
    });

    const handleClose = () => {
      onClose?.();

      if (bottomSheetState.status !== 'hidden') {
        finishClosing(bottomSheetState.id);
      }
    };

    return (
      <BottomSheetOriginal
        animationConfigs={config}
        ref={ref}
        {...props}
        onClose={handleClose}
        onAnimate={handleOnAnimate}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
      >
        {children}
      </BottomSheetOriginal>
    );
  }
);
