import type { SheetAdapterEvents } from './adapter.types';
import { useBottomSheetStore } from './store';
import { getOnBeforeClose } from './onBeforeCloseRegistry';
import { getSheetRef } from './refsMap';

/**
 * Frames to keep retrying a ref call before giving up.
 *
 * The store can reach a terminal status before the adapter has mounted — a
 * portal sheet has to teleport its content into the `PortalHost` first. A
 * single attempt would be a silent no-op, leaving the sheet stuck in that
 * status forever (and, for 'closing', blocking every later open in the group).
 */
const REF_CALL_MAX_FRAMES = 10;

/**
 * Calls `action` on the sheet's adapter ref, retrying across frames until the
 * ref exists — and re-checking the status each time, so a sheet that changed
 * its mind mid-wait is not driven to a stale target.
 */
function driveSheetRef(
  id: string,
  expectedStatus: string,
  action: (ref: NonNullable<ReturnType<typeof getSheetRef>>['current']) => void
) {
  let framesLeft = REF_CALL_MAX_FRAMES;

  const attempt = () => {
    const currentStatus = useBottomSheetStore.getState().sheetsById[id]?.status;
    if (currentStatus !== expectedStatus) {
      return;
    }

    const ref = getSheetRef(id)?.current;
    if (ref) {
      action(ref);
      return;
    }

    if (--framesLeft <= 0) {
      if (__DEV__) {
        console.warn(
          `[BottomSheet] Sheet "${id}" reached status "${expectedStatus}" but its ` +
            'adapter never registered a ref, so the transition could not be driven. ' +
            'The sheet will be stuck in this status. Make sure the adapter forwards ' +
            'its ref (see useAdapterRef).'
        );
      }
      return;
    }

    requestAnimationFrame(attempt);
  };

  requestAnimationFrame(attempt);
}

/**
 * Subscribes to store changes and calls adapter ref methods.
 * Direction: Store → Adapter (via SheetAdapterRef)
 */
export function initBottomSheetCoordinator(groupId: string) {
  return useBottomSheetStore.subscribe(
    (s) =>
      (s.stackOrderByGroup[groupId] ?? []).map((id) => ({
        id,
        status: s.sheetsById[id]?.status,
      })),
    (next, prev) => {
      next.forEach(({ id, status }) => {
        const prevStatus = prev.find((p) => p.id === id)?.status;

        if (prevStatus === status) {
          return;
        }

        switch (status) {
          case 'opening':
            driveSheetRef(id, 'opening', (ref) => ref?.expand());
            break;
          case 'hidden':
          case 'closing':
            driveSheetRef(id, status, (ref) => ref?.close());
            break;
        }
      });
    }
  );
}

/**
 * Attempts to close a sheet, respecting the onBeforeClose interceptor.
 *
 * If an onBeforeClose callback is registered for the sheet and it returns
 * `false` (or resolves to `false`), the close is cancelled.
 *
 * @returns `true` if the sheet is now closing, `false` if the interceptor
 * blocked it — or if there was nothing to close (the sheet is already closing,
 * hidden, or does not exist).
 */
export async function requestClose(sheetId: string): Promise<boolean> {
  const state = useBottomSheetStore.getState();
  const currentStatus = state.sheetsById[sheetId]?.status;

  // Don't run interceptor if sheet is already closing
  // This prevents duplicate interceptor calls during close animations
  if (currentStatus === 'closing') {
    return false;
  }

  const interceptor = getOnBeforeClose(sheetId);

  if (interceptor) {
    try {
      const allowed = await new Promise<boolean>((resolve) => {
        const result = interceptor({
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });

        if (result) {
          if (typeof result === 'boolean') {
            resolve(result);
          } else if (
            result &&
            typeof result === 'object' &&
            'then' in result &&
            typeof result.then === 'function'
          ) {
            // It's a Promise
            result.then(resolve);
          }
        }
      });

      if (!allowed) {
        return false;
      }
    } catch (error) {
      // If the interceptor throws, cancel the close for safety
      if (__DEV__) {
        console.warn(
          `[BottomSheet] onBeforeClose interceptor threw an error for sheet "${sheetId}". ` +
            'Close cancelled for safety. Fix the interceptor to avoid this warning.',
          error
        );
      }
      return false;
    }
  }

  if (currentStatus === 'open' || currentStatus === 'opening') {
    state.startClosing(sheetId);
    return true;
  }

  // Nothing to close: hidden, already gone, or a status that cannot transition
  // to closing. The interceptor did not block, but the sheet is not closing
  // either — say so rather than reporting a close that never happened.
  return false;
}

/**
 * Default stagger delay between cascading close animations (ms).
 */
const DEFAULT_STAGGER_MS = 100;

/**
 * Closes all sheets in a group from top to bottom with cascading animation.
 *
 * Each sheet is closed with a staggered delay so the user sees them
 * peel off one-by-one (similar to `popToRoot` in React Navigation).
 *
 * If a sheet has an `onBeforeClose` interceptor that rejects, the cascade
 * stops at that sheet — sheets below it remain open.
 *
 * @param groupId - The manager group to close sheets in.
 * @param options.stagger - Delay in ms between each close (default: 100).
 * @returns A promise that resolves when the cascade finishes (or is stopped).
 */
export async function closeAllAnimated(
  groupId: string,
  options?: { stagger?: number }
): Promise<void> {
  const stagger = options?.stagger ?? DEFAULT_STAGGER_MS;

  const state = useBottomSheetStore.getState();

  // Close from top to bottom (reverse order)
  const reversed = [...(state.stackOrderByGroup[groupId] ?? [])].reverse();

  for (const [index, sheetId] of reversed.entries()) {
    const currentState = useBottomSheetStore.getState();
    const sheet = currentState.sheetsById[sheetId];

    // Skip sheets that are already closing or hidden
    if (!sheet || sheet.status === 'closing' || sheet.status === 'hidden') {
      continue;
    }

    const closed = await requestClose(sheetId);

    if (!closed) {
      // Interceptor blocked — stop the cascade
      break;
    }

    if (stagger > 0 && index < reversed.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, stagger));
    }
  }
}

/**
 * Creates event handlers that adapters call to sync UI state back to the store.
 * Direction: Adapter Events → Store
 *
 * Adapters must call:
 * - `handleDismiss()` when the user initiates dismissal (swipe, backdrop tap, back button)
 * - `handleOpened()` when the show animation completes
 * - `handleClosed()` when the hide animation completes
 */
export function createSheetEventHandlers(sheetId: string): SheetAdapterEvents {
  const handleDismiss = () => {
    const interceptor = getOnBeforeClose(sheetId);

    if (interceptor) {
      requestClose(sheetId);
      return;
    }

    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus === 'open' || currentStatus === 'opening') {
      state.startClosing(sheetId);
    }
  };

  const handleOpened = () => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus === 'opening') {
      state.markOpen(sheetId);
    }
  };

  const handleClosed = () => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus !== 'hidden') {
      state.finishClosing(sheetId);
    }
  };

  return {
    handleDismiss,
    handleOpened,
    handleClosed,
  };
}
