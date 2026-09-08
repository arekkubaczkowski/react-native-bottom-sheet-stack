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
   * The ref the coordinator drives; a fallback adapter binds to it so
   * expand/close keep reaching the sheet. `undefined` when no ref is registered
   * for the id — the wrapper still renders, but nothing drives a fallback
   * adapter: the mount catch-up is skipped (it neither opens under `open` nor
   * ends the sheet under `closing`) and a programmatic close removes the sheet
   * with no exit animation.
   */
  sheetRef: SheetRef | undefined;
  children: ReactNode;
}

/**
 * Warns once per host when the `SheetWrapper` prop value changes.
 *
 * The wrapper is used as an element type, so a new value remounts every inline
 * sheet. Compares the value rather than skipping the first run: StrictMode
 * replays effects with the same ref object, and a run-counting flag would warn
 * on a wrapper that never changed.
 */
function useSheetWrapperIdentityWarning(
  SheetWrapper?: ComponentType<SheetWrapperProps>
) {
  const seen = useRef({ last: SheetWrapper, warned: false });

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
          'every inline sheet: the adapter replays its open animation and a ' +
          'stateful wrapper (an error boundary) loses its state. Keep the prop ' +
          'value stable for the life of the host — a module-scope component, ' +
          'not an inline arrow or a branch on a flag.'
      );
    }
  }, [SheetWrapper]);
}

interface BottomSheetHostProps {
  /**
   * Wraps each inline sheet's content inside its context — the place for a
   * per-sheet error boundary whose fallback is an adapter bound to `sheetRef`.
   * Portal and persistent sheets render where they are declared and are not
   * wrapped.
   *
   * The prop *value* must stay stable for the life of the host: it is used as
   * an element type, so a new value remounts every inline sheet — the adapter
   * replays its open animation and a stateful wrapper loses its state. Pass a
   * module-scope component, not an inline arrow and not a branch on a flag
   * (`flag ? Wrapper : undefined` remounts on the frame the flag resolves).
   * Changing it warns in dev.
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
