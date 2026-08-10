import { shallow } from 'zustand/shallow';
import { backdropOverrideOf } from '../backdrop.resolve';
import { getGroupStack } from './helpers';
import { useBottomSheetStore } from './store';

// State hooks
//
// Selectors returning a primitive are compared by reference — passing `shallow`
// there only adds a call. Only the ones returning objects need it.

export const useSheetStatus = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.status);

export const useSheetParams = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.params, shallow);

export const useSheetContent = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.content);

export const useSheetUsePortal = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.usePortal);

export const useSheetKeepMounted = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.keepMounted);

/**
 * The sheet's backdrop override, for resolving what to render.
 *
 * Returns an object without `shallow` on purpose: `setBackdrop` bails on
 * value-equal writes, so the stored config's identity is already stable across
 * the re-applications an adapter's effect performs.
 */
export const useSheetBackdrop = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.backdrop);

/**
 * What the sheet's own record says about its backdrop, as a stable primitive.
 *
 * Separate from {@link useSheetBackdrop} so `QueueItem` — memoized precisely
 * because every host render rebuilds its children — never subscribes to the
 * config object, and so re-renders only when the backdrop is switched on or
 * off, not whenever it is restyled. Pair it with the group's `backdrop` via
 * `isBackdropEnabled`, since `'inherit'` is answered by the group.
 */
export const useSheetBackdropOverride = (id: string) =>
  useBottomSheetStore((state) =>
    backdropOverrideOf(state.sheetsById[id]?.backdrop)
  );

export const useSheetPortalSession = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.portalSession);

export const useSheetPreventDismiss = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.preventDismiss ?? false);

export const useSheetExists = (id: string) =>
  useBottomSheetStore((state) => !!state.sheetsById[id]);

/**
 * Whether `id` is the topmost sheet of its own group and fully open.
 *
 * Resolves the group from the sheet itself, so a sheet is never treated as
 * "not on top" just because a different group has sheets of its own.
 */
export const useIsTopmostAndOpen = (id: string) =>
  useBottomSheetStore((state) => {
    const sheet = state.sheetsById[id];
    if (!sheet || sheet.status !== 'open') return false;
    const groupStack = getGroupStack(state.stackOrderByGroup, sheet.groupId);
    return groupStack[groupStack.length - 1] === id;
  });

// Action hooks

export const useOpen = () => useBottomSheetStore((state) => state.open);

export const useStartClosing = () =>
  useBottomSheetStore((state) => state.startClosing);

export const useUpdateParams = () =>
  useBottomSheetStore((state) => state.updateParams);

export const useClearGroup = () =>
  useBottomSheetStore((state) => state.clearGroup);

export const useSetPreventDismiss = () =>
  useBottomSheetStore((state) => state.setPreventDismiss);

export const useSetBackdrop = () =>
  useBottomSheetStore((state) => state.setBackdrop);

export const useMount = () => useBottomSheetStore((state) => state.mount);

export const useUnmount = () => useBottomSheetStore((state) => state.unmount);
