import { shallow } from 'zustand/shallow';
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
 * Whether the manager should render a backdrop for this sheet at all.
 *
 * Separate from {@link useSheetBackdrop} so `QueueItem` — memoized precisely
 * because every host render rebuilds its children — subscribes to a boolean
 * and re-renders only when the backdrop is switched on or off, not whenever
 * its styling changes.
 */
export const useSheetBackdropEnabled = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.backdrop !== false);

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
