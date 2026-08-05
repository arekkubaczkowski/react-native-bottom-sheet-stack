import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

interface DetachedFrameProps {
  topOffset: number;
  bottomInset: number;
  horizontalInset: number;
  cornerRadius: number;
  frameHeight: number;
  /** Live sheet height in points, from the native `onPositionChange`. */
  position: SharedValue<number>;
  /** Tallest height the sheet reached since it last opened. */
  peak: SharedValue<number>;
}

/**
 * Floating frame for a `detached` sheet: insets the native host, rounds the
 * bottom corners, and clips the surface hanging below the sheet.
 *
 * The clip is load-bearing rather than cosmetic — see the "Detached sheets"
 * section of the adapter docs.
 */
export function DetachedFrame({
  topOffset,
  bottomInset,
  horizontalInset,
  cornerRadius,
  frameHeight,
  position,
  peak,
  children,
}: PropsWithChildren<DetachedFrameProps>) {
  // Trails the sheet by the height it has lost, so the gap closes at the
  // sheet's speed. Driving this off the detent index instead moves the clip by
  // the gap's height while the sheet moves by its own, and the sheet outruns it.
  const clipStyle = useAnimatedStyle(() => ({
    bottom: bottomInset - Math.max(0, peak.value - position.value),
  }));

  const frameStyle: ViewStyle = {
    top: topOffset,
    left: horizontalInset,
    right: horizontalInset,
    overflow: 'hidden',
    borderBottomLeftRadius: cornerRadius,
    borderBottomRightRadius: cornerRadius,
  };

  // Fixed height, not the frame's: sizing it from a frame that animates would
  // feed that animation into the natively measured detent cap.
  const hostStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(0, frameHeight - topOffset - bottomInset),
  };

  // `box-none` so taps in the gap reach the manager's backdrop below.
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, frameStyle, clipStyle]}
    >
      <View pointerEvents="box-none" style={hostStyle}>
        {children}
      </View>
    </Animated.View>
  );
}
