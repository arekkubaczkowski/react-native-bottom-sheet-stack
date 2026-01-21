import { useRef } from 'react';
import {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  useBottomSheetStore,
  type BottomSheetStore,
} from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';

export interface ScaleConfig {
  /** Scale factor when sheet is open (default: 0.92) */
  scale?: number;
  /** Vertical translation when sheet is open (default: 10) */
  translateY?: number;
  /** Border radius when sheet is open (default: 12) */
  borderRadius?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
}

const DEFAULT_CONFIG: Required<ScaleConfig> = {
  scale: 0.92,
  translateY: 10,
  borderRadius: 12,
  duration: 300,
};

/**
 * Returns the number of sheets with scaleBackground above a given element.
 * For background wrapper, pass undefined as sheetId - returns 0 or 1 (binary).
 * For sheets, returns the count of scaleBackground sheets above it.
 * Uses shallow comparison internally for optimal re-renders.
 */
export function useScaleDepth(groupId: string, sheetId?: string): number {
  const prevDepthRef = useRef(0);

  const scaleDepthSelector = (state: BottomSheetStore) => {
    const { stackOrder, sheetsById } = state;

    const startIndex = sheetId ? stackOrder.indexOf(sheetId) + 1 : 0;

    if (sheetId && startIndex === 0) {
      return prevDepthRef.current;
    }

    let depth = 0;
    for (let i = startIndex; i < stackOrder.length; i++) {
      const id = stackOrder[i]!;
      const sheet = sheetsById[id];
      if (
        sheet &&
        sheet.groupId === groupId &&
        sheet.scaleBackground &&
        sheet.status !== 'closing'
      ) {
        depth++;
        if (!sheetId) {
          break;
        }
      }
    }

    prevDepthRef.current = depth;
    return depth;
  };

  return useBottomSheetStore(scaleDepthSelector);
}

/**
 * Returns animated style for scale effect based on depth.
 * Uses power scaling: scale^depth for cascading effect.
 */
export function useScaleAnimatedStyle({ id }: { id?: string } = {}) {
  const { groupId, scaleConfig } = useBottomSheetManagerContext();
  const scaleDepth = useScaleDepth(groupId, id);

  const {
    scale = DEFAULT_CONFIG.scale,
    translateY = DEFAULT_CONFIG.translateY,
    borderRadius = DEFAULT_CONFIG.borderRadius,
    duration = DEFAULT_CONFIG.duration,
  } = scaleConfig ?? {};

  const progress = useDerivedValue(() => {
    return withTiming(scaleDepth, { duration });
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
