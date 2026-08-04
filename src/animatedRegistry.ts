import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * Registry for shared animated values per sheet.
 * AnimatedIndex is created eagerly in store actions (open/mount)
 * before any component renders, ensuring it's always available.
 */
const animatedIndexRegistry = new Map<string, SharedValue<number>>();

/** The value of a fully hidden sheet — the low end of the backdrop's fade. */
export const HIDDEN_ANIMATED_INDEX = -1;

export function ensureAnimatedIndex(sheetId: string): SharedValue<number> {
  const existing = animatedIndexRegistry.get(sheetId);
  if (existing) {
    return existing;
  }

  const animatedIndex = makeMutable(HIDDEN_ANIMATED_INDEX);
  animatedIndexRegistry.set(sheetId, animatedIndex);
  return animatedIndex;
}

/**
 * Returns the sheet's animated index, rewound to the hidden value first.
 *
 * Called by the store when a sheet starts opening, so the backdrop always has a
 * defined starting point for its fade. Without this a re-opened sheet would
 * still carry the value from its previous cycle, and the backdrop would flash
 * at full opacity for the frames before the adapter drives the value down.
 */
export function resetAnimatedIndex(sheetId: string): SharedValue<number> {
  const animatedIndex = ensureAnimatedIndex(sheetId);
  animatedIndex.value = HIDDEN_ANIMATED_INDEX;
  return animatedIndex;
}

export function getAnimatedIndex(
  sheetId: string
): SharedValue<number> | undefined {
  return animatedIndexRegistry.get(sheetId);
}

/**
 * Set the animated index value for a sheet.
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
