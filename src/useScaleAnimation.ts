import { useEffect, useRef, useState } from 'react';
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

/**
 * Whether the app background should be scaled: 0 or 1, decided by the
 * bottom-most live sheet in the group. Binary because the background scales
 * once no matter how deep the stack goes.
 */
function useBackgroundScaleDepth(groupId: string): number {
  return useBottomSheetStore((state) => {
    const groupStack = state.stackOrderByGroup[groupId] ?? [];

    for (const id of groupStack) {
      const sheet = state.sheetsById[id];
      if (sheet && sheet.status !== 'closing' && sheet.status !== 'hidden') {
        return sheet.scaleBackground ? 1 : 0;
      }
    }
    return 0;
  });
}

/**
 * How many scaling sheets sit above `sheetId` in its own group.
 *
 * Returns `null` from the selector once the sheet leaves the stack, and the
 * caller holds the last known depth — a sheet mid-exit must keep its scale
 * instead of snapping back to 0 while it animates out.
 *
 * The hold lives in an effect rather than in the selector: a Zustand selector
 * runs on every store change (twice per render under StrictMode), so writing to
 * a ref inside it would make the result depend on how often it ran.
 */
function useSheetScaleDepth(
  groupId: string,
  sheetId: string | undefined
): number {
  const liveDepth = useBottomSheetStore((state) => {
    if (!sheetId) return 0;

    const groupStack = state.stackOrderByGroup[groupId] ?? [];
    const sheetIndex = groupStack.indexOf(sheetId);

    if (sheetIndex === -1) return null;

    let depth = 0;
    for (let i = sheetIndex + 1; i < groupStack.length; i++) {
      const sheet = state.sheetsById[groupStack[i]!];
      if (
        sheet &&
        sheet.scaleBackground &&
        sheet.status !== 'closing' &&
        sheet.status !== 'hidden'
      ) {
        depth++;
      }
    }

    return depth;
  });

  const [heldDepth, setHeldDepth] = useState(0);
  const heldDepthRef = useRef(0);

  useEffect(() => {
    if (liveDepth !== null && liveDepth !== heldDepthRef.current) {
      heldDepthRef.current = liveDepth;
      setHeldDepth(liveDepth);
    }
  }, [liveDepth]);

  return liveDepth ?? heldDepth;
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

    // Identity transform on first frame collapses layout in
    // React Native 0.85's new animation backend. Returning an empty
    // style keeps the view at its natural position+size when idle.
    if (!p) {
      return {};
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
