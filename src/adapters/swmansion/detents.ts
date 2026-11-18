import type {
  Detent,
  DetentConfig,
  DetentInsets,
} from '@swmansion/react-native-bottom-sheet';

export const CLOSED_INDEX = 0;

const DEFAULT_DETENTS: Detent[] = [0, 'content'];
// Native caps a fixed detent to the available height.
const FULL_HEIGHT_DETENT = 1_000_000;

export function getDetents(
  detents: Detent[] | undefined,
  fullHeight?: boolean
) {
  return detents ?? (fullHeight ? [0, FULL_HEIGHT_DETENT] : DEFAULT_DETENTS);
}

export function toDetentConfig(detent: Detent): DetentConfig {
  return typeof detent === 'object' && detent !== null
    ? detent
    : { value: detent };
}

export function isClosedDetent(detent: Detent | undefined): boolean {
  if (detent === undefined) return false;
  const { value } = toDetentConfig(detent);
  return (typeof value === 'number' ? value : Number.parseFloat(value)) === 0;
}

export function applyDetentOptions(
  detents: Detent[],
  preventDismiss: boolean,
  detachedInsets: DetentInsets | undefined
): Detent[] {
  if (!preventDismiss && !detachedInsets) return detents;

  return detents.map((detent, index) => {
    if (index === CLOSED_INDEX) {
      return preventDismiss
        ? { ...toDetentConfig(detent), programmatic: true }
        : detent;
    }
    if (!detachedInsets) return detent;
    const config = toDetentConfig(detent);
    return config.insets ? config : { ...config, insets: detachedInsets };
  });
}
