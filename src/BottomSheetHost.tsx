import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';

import type { SheetRef } from './adapter.types';
import { useBottomSheetStore, useClearGroup } from './store';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import { useBottomSheetManagerContext } from './BottomSheetManager.context';
import { QueueItem } from './QueueItem';
import { getSheetRef } from './refsMap';
import { useSheetRenderData } from './useSheetRenderData';

/**
 * Frames to keep retrying the initial reconcile before giving up — the adapter
 * ref appears a frame or two after the sheet enters the store, and a portal
 * sheet has to teleport its content into the `PortalHost` first.
 */
const RECONCILE_MAX_FRAMES = 10;

/**
 * Drives sheets that are already mid-transition when the coordinator subscribes.
 *
 * The subscription does not fire for state that predates it, and this host's
 * effect runs *after* the effects of the content rendered beside it — so a sheet
 * opened from an app mount effect writes `'opening'` with nobody listening, and
 * would sit in that status forever, blocking every later open in the group.
 *
 * Only the statuses captured at subscribe time are replayed; anything that moves
 * afterwards belongs to the subscription and must not be driven twice.
 */
function reconcilePendingTransitions(groupId: string): () => void {
  const initialState = useBottomSheetStore.getState();

  let pending = (initialState.stackOrderByGroup[groupId] ?? [])
    .map((id) => ({ id, status: initialState.sheetsById[id]?.status }))
    .filter(
      ({ status }) =>
        status === 'opening' || status === 'closing' || status === 'hidden'
    );

  let framesLeft = RECONCILE_MAX_FRAMES;
  let cancelled = false;

  const attempt = () => {
    if (cancelled) {
      return;
    }

    const { sheetsById } = useBottomSheetStore.getState();

    pending = pending.filter(({ id, status }) => {
      if (sheetsById[id]?.status !== status) {
        return false;
      }

      const ref = getSheetRef(id)?.current;
      if (!ref) {
        return true;
      }

      if (status === 'opening') {
        ref.expand();
      } else {
        ref.close();
      }
      return false;
    });

    if (pending.length > 0 && --framesLeft > 0) {
      requestAnimationFrame(attempt);
    }
  };

  if (pending.length > 0) {
    requestAnimationFrame(attempt);
  }

  return () => {
    cancelled = true;
  };
}

export interface SheetWrapperProps {
  id: string;
  /**
   * The ref the coordinator drives; bind a fallback adapter to it. `undefined`
   * when nothing is registered for the id: the wrapper still renders, but no
   * catch-up or programmatic close reaches its fallback adapter.
   */
  sheetRef: SheetRef | undefined;
  children: ReactNode;
}

function useSheetWrapperIdentityWarning(
  SheetWrapper?: ComponentType<SheetWrapperProps>
) {
  const seen = useRef({ last: SheetWrapper, warned: false });

  // Compares the value instead of skipping the first run: StrictMode replays
  // effects with the same ref object.
  useEffect(() => {
    const state = seen.current;
    if (state.last === SheetWrapper) {
      return;
    }
    state.last = SheetWrapper;

    if (__DEV__ && !state.warned) {
      state.warned = true;
      console.warn(
        '[BottomSheet] `SheetWrapper` changed between renders, which remounts ' +
          'every inline sheet (open animation replays, a stateful wrapper loses ' +
          'its state). Keep the value stable: a module-scope component, not an ' +
          'inline arrow or a branch on a flag.'
      );
    }
  }, [SheetWrapper]);
}

interface BottomSheetHostProps {
  /**
   * Wraps each inline sheet's content inside its context — the place for a
   * per-sheet error boundary whose fallback is an adapter bound to `sheetRef`.
   * Portal and persistent sheets are not wrapped. Keep the value stable for the
   * life of the host: it is the element type, so a new value (an inline arrow,
   * `flag ? Wrapper : undefined`) remounts every inline sheet; dev warns.
   */
  SheetWrapper?: ComponentType<SheetWrapperProps>;
}

export function BottomSheetHost({ SheetWrapper }: BottomSheetHostProps) {
  const sheetRenderData = useSheetRenderData();
  const clearGroup = useClearGroup();
  const { groupId } = useBottomSheetManagerContext();

  useSheetWrapperIdentityWarning(SheetWrapper);

  useEffect(() => {
    const unsubscribe = initBottomSheetCoordinator(groupId);
    const cancelReconcile = reconcilePendingTransitions(groupId);
    return () => {
      cancelReconcile();
      unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    return () => {
      clearGroup(groupId);
    };
  }, [clearGroup, groupId]);

  return (
    <>
      {sheetRenderData.map(({ id, stackIndex, isActive }) => (
        <QueueItem
          key={id}
          id={id}
          stackIndex={stackIndex}
          isActive={isActive}
          SheetWrapper={SheetWrapper}
        />
      ))}
    </>
  );
}
