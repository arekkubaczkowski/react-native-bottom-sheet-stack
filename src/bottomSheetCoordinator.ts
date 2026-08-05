import type { SheetAdapterEvents } from './adapter.types';
import { useBottomSheetStore } from './store';
import type { CascadeOptions, CloseAllResult, CloseResult } from './store';
import { getOnBeforeClose } from './onBeforeCloseRegistry';
import { getSheetRef } from './refsMap';

/**
 * Frames to keep retrying a ref call before giving up.
 *
 * The store can reach a terminal status before the adapter has mounted — a
 * portal sheet has to teleport its content into the `PortalHost` first. A
 * single attempt would be a silent no-op, leaving the sheet stuck in that
 * status forever (and, for 'opening', blocking every later open in the group).
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
            'The sheet has been forced to a closed state so the rest of its group ' +
            'keeps working. Make sure the adapter forwards its ref (see useAdapterRef).'
        );
      }
      // Without a terminal status an 'opening' sheet blocks every later open in
      // its group, with no way back short of destroyAll().
      useBottomSheetStore.getState().finishClosing(id);
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
 * @returns A {@link CloseResult}. `closed: false` carries a reason, because
 * "the interceptor declined" and "there was nothing to close" are different
 * answers that callers routinely need to tell apart.
 */
export async function requestClose(sheetId: string): Promise<CloseResult> {
  const initialStatus =
    useBottomSheetStore.getState().sheetsById[sheetId]?.status;

  // This prevents duplicate interceptor calls during close animations
  if (initialStatus === 'closing') {
    return { closed: false, reason: 'not-closable' };
  }

  const interceptor = getOnBeforeClose(sheetId);

  if (interceptor) {
    try {
      const allowed = await new Promise<boolean>((resolve) => {
        const result = interceptor({
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });

        // Discriminated on type, not truthiness: `false` is the documented way
        // to block, and a truthiness check would drop it and never settle.
        if (typeof result === 'boolean') {
          resolve(result);
        } else if (
          result &&
          typeof result === 'object' &&
          'then' in result &&
          typeof result.then === 'function'
        ) {
          result.then(resolve);
        }
        // Anything else (void) means the interceptor is using the callback
        // style: stay pending until onConfirm/onCancel fires.
      });

      if (!allowed) {
        return { closed: false, reason: 'blocked' };
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `[BottomSheet] onBeforeClose interceptor threw an error for sheet "${sheetId}". ` +
            'Close cancelled for safety. Fix the interceptor to avoid this warning.',
          error
        );
      }
      return { closed: false, reason: 'interceptor-error' };
    }
  }

  // Re-read rather than reusing the pre-interceptor snapshot: awaiting the
  // interceptor can mean awaiting a user, and the sheet may have been closed,
  // cleared or re-opened in the meantime.
  const state = useBottomSheetStore.getState();
  const currentStatus = state.sheetsById[sheetId]?.status;

  if (currentStatus === 'open' || currentStatus === 'opening') {
    state.startClosing(sheetId);
    return { closed: true };
  }

  // Nothing to close: hidden, already gone, or a status that cannot transition
  // to closing. No interceptor had an opinion — which is why this is its own
  // reason rather than being folded into `blocked`.
  return { closed: false, reason: 'not-closable' };
}

/**
 * The slice of `stack` a cascade should close, in bottom-to-top order.
 *
 * Both bounds only move the start later, so a `depth` cannot reach past an
 * `until` and vice versa — whichever closes fewer sheets holds.
 */
function resolveCascadeRange(
  stack: string[],
  options?: CascadeOptions
): string[] {
  let from = 0;

  if (options?.until !== undefined) {
    const index = stack.indexOf(options.until);
    if (index === -1) {
      // Closing the whole group would be the opposite of what a bounded call
      // asked for, so an unknown boundary closes nothing.
      if (__DEV__) {
        console.warn(
          `[BottomSheetStack] closeAll: "${options.until}" is not on this group's stack — closing nothing.`
        );
      }
      return [];
    }
    from = options.inclusive ? index : index + 1;
  }

  if (options?.depth !== undefined) {
    from = Math.max(from, stack.length - Math.max(0, options.depth));
  }

  return stack.slice(from);
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
 * `until` and `depth` narrow the cascade to part of the stack; with both, the
 * one that closes fewer sheets wins, so neither can be widened past the other.
 *
 * @param groupId - The manager group to close sheets in.
 * @param options.stagger - Delay in ms between each close (default: 100).
 * @param options.until - Stop at this sheet instead of emptying the group.
 * @param options.inclusive - Whether `until` closes too (default: false).
 * @param options.depth - Close at most this many sheets, counting from the top.
 * @returns A {@link CloseAllResult} naming what closed and, if the cascade was
 * stopped, which sheet stopped it. Without this a blocked cascade is
 * indistinguishable from one that closed everything.
 */
export async function closeAllAnimated(
  groupId: string,
  options?: CascadeOptions
): Promise<CloseAllResult> {
  const stagger = options?.stagger ?? DEFAULT_STAGGER_MS;

  const state = useBottomSheetStore.getState();

  const stack = state.stackOrderByGroup[groupId] ?? [];
  const reversed = resolveCascadeRange(stack, options).reverse();
  const closed: string[] = [];

  for (const [index, sheetId] of reversed.entries()) {
    const currentState = useBottomSheetStore.getState();
    const sheet = currentState.sheetsById[sheetId];

    // Skip sheets that are already closing or hidden
    if (!sheet || sheet.status === 'closing' || sheet.status === 'hidden') {
      continue;
    }

    const result = await requestClose(sheetId);

    if (!result.closed) {
      if (result.reason === 'not-closable') {
        // Nothing to close here (it settled or vanished mid-cascade); that is
        // not a refusal, so keep going rather than stranding the sheets below.
        continue;
      }
      // An interceptor declined — stop and report where.
      return { completed: false, closed, stoppedAt: sheetId };
    }

    closed.push(sheetId);

    if (stagger > 0 && index < reversed.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, stagger));
    }
  }

  return { completed: true, closed };
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
