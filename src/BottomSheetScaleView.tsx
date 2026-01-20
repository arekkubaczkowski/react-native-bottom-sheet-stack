import { useContext, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheetManagerContext } from './BottomSheetManager.context';
import { useScaleAnimatedStyle } from './useScaleAnimation';

/**
 * Wraps your app content with iOS-style scale animation when a bottom sheet
 * with scaleBackground: true is open. Place your main content inside this
 * component, but keep BottomSheetHost outside of it.
 *
 * @example
 * ```tsx
 * <BottomSheetManagerProvider id="default" scaleConfig={{ scale: 0.92 }}>
 *   <BottomSheetScaleView>
 *     <MainContent />
 *   </BottomSheetScaleView>
 *   <BottomSheetHost />
 * </BottomSheetManagerProvider>
 * ```
 */
export function BottomSheetScaleView({ children }: PropsWithChildren) {
  const context = useContext(BottomSheetManagerContext);
  const groupId = context?.groupId ?? 'default';
  const scaleConfig = context?.scaleConfig;

  const animatedStyle = useScaleAnimatedStyle({ groupId }, scaleConfig);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
