import { useSheetStatus, type BottomSheetStatus } from './store';
import type { BottomSheetPortalId } from './portal.types';

export interface UseBottomSheetStatusReturn {
  /** The sheet's status, or `null` when the store has no record of it. */
  status: BottomSheetStatus | null;
  /** Fully open and interactive. Does **not** include the opening animation. */
  isOpen: boolean;
  /** Animating in. */
  isOpening: boolean;
  /** Animating out. */
  isClosing: boolean;
  /**
   * On screen in any form — opening, open, or closing. This is the one to use
   * for "should I render something alongside the sheet".
   */
  isVisible: boolean;
}

/**
 * Observes a sheet's status from outside the sheet.
 *
 * Works for every kind of sheet: registered portal and persistent IDs get
 * completion from the portal registry, and the random IDs returned by
 * `useBottomSheetManager().open()` are accepted just as well.
 */
export function useBottomSheetStatus(
  id: BottomSheetPortalId | (string & {})
): UseBottomSheetStatusReturn {
  const status = useSheetStatus(id) ?? null;

  return {
    status,
    isOpen: status === 'open',
    isOpening: status === 'opening',
    isClosing: status === 'closing',
    isVisible:
      status === 'open' || status === 'opening' || status === 'closing',
  };
}
