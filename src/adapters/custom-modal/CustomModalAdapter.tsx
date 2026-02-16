import React, { useEffect, useImperativeHandle, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { SheetAdapterRef } from '../../adapter.types';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

const ANIMATION_DURATION = 300;

const ZOOM_INITIAL_SCALE = 0.85;

export interface ModalAdapterProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const CustomModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ModalAdapterProps
>(({ children, contentContainerStyle }, forwardedRef) => {
  const { id } = useBottomSheetContext();
  const ref = useAdapterRef(forwardedRef);
  const animatedIndex = useAnimatedIndex();
  const [rendered, setRendered] = useState(false);
  const [open, setOpen] = useState(false);

  const progress = useSharedValue(0);

  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  useImperativeHandle(
    ref,
    () => ({
      expand: () => {
        setRendered(true);
        setOpen(true);
        animatedIndex.value = 0;
      },
      close: () => {
        setOpen(false);
        animatedIndex.value = -1;
      },
    }),
    [animatedIndex]
  );

  const onAnimationEnd = (value: boolean) => {
    'worklet';
    if (value) {
      scheduleOnRN(handleOpened);
    } else {
      scheduleOnRN(setRendered, false);
      scheduleOnRN(handleClosed);
    }
  };

  useAnimatedReaction(
    () => open,
    (value, prevValue) => {
      if (prevValue === null || value === prevValue) return;
      progress.value = withTiming(
        value ? 1 : 0,
        { duration: ANIMATION_DURATION },
        (finished) => {
          if (!finished) return;
          onAnimationEnd(value);
        }
      );
    }
  );

  useEffect(() => {
    if (!rendered) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleDismiss();
        return true;
      }
    );
    return () => subscription.remove();
  }, [rendered, handleDismiss]);

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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
