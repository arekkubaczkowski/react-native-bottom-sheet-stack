import { useContext, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { shallow } from 'zustand/shallow';
import { BottomSheetManagerContext } from './BottomSheetManager.context';
import { useBottomSheetStore } from './bottomSheet.store';

export interface ScaleBackgroundConfig {
  /** Scale factor when sheet is open (default: 0.92) */
  scale?: number;
  /** Vertical translation when sheet is open (default: 10) */
  translateY?: number;
  /** Border radius when sheet is open (default: 12) */
  borderRadius?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
}

interface ScaleBackgroundWrapperProps extends PropsWithChildren {
  config?: ScaleBackgroundConfig;
}

/**
 * Wraps content with iOS-style scale animation when a bottom sheet with
 * scaleBackground: true is open. Place your main content inside this wrapper,
 * but keep BottomSheetHost outside of it.
 *
 * @example
 * ```tsx
 * <BottomSheetManagerProvider id="default">
 *   <ScaleBackgroundWrapper config={{ scale: 0.92 }}>
 *     <MainContent />
 *   </ScaleBackgroundWrapper>
 *   <BottomSheetHost />
 * </BottomSheetManagerProvider>
 * ```
 */
export function ScaleBackgroundWrapper({
  children,
  config,
}: ScaleBackgroundWrapperProps) {
  const context = useContext(BottomSheetManagerContext);
  const groupId = context?.groupId ?? 'default';

  const {
    scale = 0.92,
    translateY = 10,
    borderRadius = 12,
    duration = 300,
  } = config ?? {};

  const hasActiveScaleSheet = useBottomSheetStore(
    (store) =>
      store.stack.some(
        (sheet) =>
          sheet.groupId === groupId &&
          sheet.scaleBackground &&
          sheet.status !== 'closing'
      ),
    shallow
  );

  const animationProgress = useDerivedValue(() =>
    withTiming(hasActiveScaleSheet ? 1 : 0, {
      duration,
    })
  );

  const animatedStyle = useAnimatedStyle(() => {
    const progress = animationProgress.value;

    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [1, scale]) },
        { translateY: interpolate(progress, [0, 1], [0, translateY]) },
      ],
      borderRadius: interpolate(progress, [0, 1], [0, borderRadius]),
      overflow: progress > 0 ? ('hidden' as const) : ('visible' as const),
    };
  });

  return (
    <Animated.View style={[styles.scaleWrapper, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scaleWrapper: {
    flex: 1,
  },
});
