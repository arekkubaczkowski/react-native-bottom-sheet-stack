import { useRef } from 'react';
import {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { useBottomSheetStore } from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';

export type ScaleAnimationConfig =
  | { type: 'timing'; config?: WithTimingConfig }
  | { type: 'spring'; config?: WithSpringConfig };

export interface ScaleConfig {
  /** Scale factor when sheet is open (default: 0.92) */
  scale?: number;
  /** Vertical translation when sheet is open (default: 10) */
  translateY?: number;
  /** Border radius when sheet is open (default: 12) */
  borderRadius?: number;
  /** Animation config - timing or spring (default: timing with 300ms duration) */
  animation?: ScaleAnimationConfig;
}

const DEFAULT_ANIMATION: ScaleAnimationConfig = {
  type: 'timing',
  config: { duration: 300 },
};

const DEFAULT_CONFIG = {
  scale: 0.92,
  translateY: 10,
  borderRadius: 12,
  animation: DEFAULT_ANIMATION,
} satisfies Required<ScaleConfig>;

function useBackgroundScaleDepth(groupId: string): number {
  const depth = useBottomSheetStore((state) => {
    const { stackOrder, sheetsById } = state;

    for (let i = 0; i < stackOrder.length; i++) {
      const id = stackOrder[i]!;
      const sheet = sheetsById[id];
      if (
        sheet &&
        sheet.groupId === groupId &&
        sheet.status !== 'closing' &&
        sheet.status !== 'hidden'
      ) {
        return sheet.scaleBackground ? 1 : 0;
      }
    }
    return 0;
  });
  return depth;
}

function useSheetScaleDepth(
  groupId: string,
  sheetId: string | undefined
): number {
  const prevDepthRef = useRef(0);

  const result = useBottomSheetStore((state) => {
    if (!sheetId) {
      return 0;
    }

    const { stackOrder, sheetsById } = state;
    const sheetIndex = stackOrder.indexOf(sheetId);

    if (sheetIndex === -1) {
      return prevDepthRef.current;
    }

    let depth = 0;
    for (let i = sheetIndex + 1; i < stackOrder.length; i++) {
      const id = stackOrder[i]!;
      const sheet = sheetsById[id];
      if (
        sheet &&
        sheet.groupId === groupId &&
        sheet.scaleBackground &&
        sheet.status !== 'closing' &&
        sheet.status !== 'hidden'
      ) {
        depth++;
      }
    }

    prevDepthRef.current = depth;
    return depth;
  });
  return result;
}

function useScaleAnimatedStyleInternal(scaleDepth: number) {
  const { scaleConfig } = useBottomSheetManagerContext();

  const {
    scale = DEFAULT_CONFIG.scale,
    translateY = DEFAULT_CONFIG.translateY,
    borderRadius = DEFAULT_CONFIG.borderRadius,
    animation = DEFAULT_CONFIG.animation,
  } = scaleConfig ?? {};

  const progress = useDerivedValue(() => {
    if (animation.type === 'spring') {
      return withSpring(scaleDepth, animation.config);
    }
    return withTiming(scaleDepth, animation.config);
  });

  return useAnimatedStyle(() => {
    const p = progress.value;

    if (p === 0) {
      return {
        transform: [{ scale: 1 }, { translateY: 0 }],
        borderRadius: 0,
        overflow: 'visible',
      };
    }

    const currentScale = Math.pow(scale, p);
    const currentTranslateY = translateY * p;
    const currentBorderRadius = Math.min(borderRadius * p, borderRadius);

    return {
      transform: [{ scale: currentScale }, { translateY: currentTranslateY }],
      borderRadius: currentBorderRadius,
      overflow: 'hidden',
    };
  });
}

export function useBackgroundScaleAnimatedStyle() {
  const { groupId } = useBottomSheetManagerContext();
  const scaleDepth = useBackgroundScaleDepth(groupId);
  return useScaleAnimatedStyleInternal(scaleDepth);
}

export function useSheetScaleAnimatedStyle(sheetId: string) {
  const { groupId } = useBottomSheetManagerContext();
  const scaleDepth = useSheetScaleDepth(groupId, sheetId);
  return useScaleAnimatedStyleInternal(scaleDepth);
}
