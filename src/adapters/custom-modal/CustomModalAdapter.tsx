import React, { useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type {
  AdapterBackdropProps,
  SheetAdapterRef,
} from '../../adapter.types';
import {
  createSheetEventHandlers,
  getSheetStatus,
} from '../../bottomSheetCoordinator';
import { useAdapterBackdrop } from '../../useAdapterBackdrop';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBackHandler } from '../../useBackHandler';
import { useBottomSheetContext } from '../../useBottomSheetContext';

const ANIMATION_DURATION = 300;

const ZOOM_INITIAL_SCALE = 0.85;

export interface ModalAdapterProps extends AdapterBackdropProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const CustomModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ModalAdapterProps
>(({ children, contentContainerStyle, backdrop }, forwardedRef) => {
  const { id } = useBottomSheetContext();
  const ref = useAdapterRef(forwardedRef);
  const animatedIndex = useAnimatedIndex();
  useAdapterBackdrop(id, backdrop);
  const [rendered, setRendered] = useState(false);
  const transition = useRef(0);

  const progress = useSharedValue(0);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  const finishTransition = (visible: boolean, request: number) => {
    if (request !== transition.current) return;
    if (visible) {
      handleOpened();
    } else {
      const status = getSheetStatus(id);
      if (status !== 'closing' && status !== 'hidden') return;
      setRendered(false);
      handleClosed();
    }
  };

  const animate = (visible: boolean) => {
    const request = ++transition.current;
    if (visible) setRendered(true);
    progress.set(
      withTiming(
        visible ? 1 : 0,
        { duration: ANIMATION_DURATION },
        (finished) => {
          'worklet';
          if (finished) scheduleOnRN(finishTransition, visible, request);
        }
      )
    );
  };

  useImperativeHandle(ref, () => ({
    expand: () => animate(true),
    close: () => animate(false),
  }));

  // Drive animatedIndex off the same `progress` that animates the modal, so
  // the manager's backdrop fades in step with it. Setting it discretely in
  // expand/close (as this once did) snapped the backdrop to full opacity on
  // the first frame while the modal itself took ANIMATION_DURATION to arrive.
  useDerivedValue(() => {
    animatedIndex.set(progress.value - 1);
  });

  useBackHandler(id, handleDismiss);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        {
          scale: ZOOM_INITIAL_SCALE + progress.value * (1 - ZOOM_INITIAL_SCALE),
        },
      ],
    };
  });

  if (!rendered) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, contentContainerStyle, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
});

CustomModalAdapter.displayName = 'CustomModalAdapter';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
