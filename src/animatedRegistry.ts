import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * Registry for shared animated values per sheet.
 * This allows backdrop to access the animatedIndex from the bottom sheet.
 */
const animatedIndexRegistry = new Map<string, SharedValue<number>>();

export function getAnimatedIndex(sheetId: string): SharedValue<number> {
  let animatedIndex = animatedIndexRegistry.get(sheetId);

  if (!animatedIndex) {
    animatedIndex = makeMutable(-1);
    animatedIndexRegistry.set(sheetId, animatedIndex);
  }

  return animatedIndex;
}

export function cleanupAnimatedIndex(sheetId: string): void {
  animatedIndexRegistry.delete(sheetId);
}

/**
 * Reset all animated indexes. Useful for testing.
 * @internal
 */
export function __resetAnimatedIndexes(): void {
  animatedIndexRegistry.clear();
}
