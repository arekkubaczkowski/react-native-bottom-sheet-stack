import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * Registry for shared animated values per sheet.
 * AnimatedIndex is created eagerly in store actions (open/mount)
 * before any component renders, ensuring it's always available.
 */
const animatedIndexRegistry = new Map<string, SharedValue<number>>();

export function ensureAnimatedIndex(sheetId: string): SharedValue<number> {
  const existing = animatedIndexRegistry.get(sheetId);
  if (existing) {
    return existing;
  }

  const animatedIndex = makeMutable(-1);
  animatedIndexRegistry.set(sheetId, animatedIndex);
  return animatedIndex;
}

export function getAnimatedIndex(
  sheetId: string
): SharedValue<number> | undefined {
  const animatedIndex = animatedIndexRegistry.get(sheetId);
  return animatedIndex;
}

/**
 * Set the animated index value for a sheet.
 * Extracted as a standalone function so the React Compiler
 * doesn't flag SharedValue mutations inside component bodies.
 */
export function setAnimatedIndexValue(sheetId: string, value: number): void {
  const animatedIndex = animatedIndexRegistry.get(sheetId);
  if (animatedIndex) {
    animatedIndex.value = value;
  }
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

/**
 * Get all animated indexes for debugging.
 * @internal
 */
export function __getAllAnimatedIndexes(): Map<string, SharedValue<number>> {
  return animatedIndexRegistry;
}
