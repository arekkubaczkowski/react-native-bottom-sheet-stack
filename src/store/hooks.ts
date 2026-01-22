import { shallow } from 'zustand/shallow';
import { useBottomSheetStore } from './store';

// State hooks

export const useSheet = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id], shallow);

export const useSheetStatus = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.status, shallow);

export const useSheetParams = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.params, shallow);

export const useSheetContent = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.content, shallow);

export const useSheetUsePortal = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.usePortal, shallow);

export const useSheetKeepMounted = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.keepMounted, shallow);
export const useSheetPortalSession = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.portalSession, shallow);

export const useSheetExists = (id: string) =>
  useBottomSheetStore((state) => !!state.sheetsById[id], shallow);

export const useIsSheetOpen = (id: string) =>
  useBottomSheetStore((state) => {
    const status = state.sheetsById[id]?.status;
    return status === 'open' || status === 'opening';
  }, shallow);

// Action hooks

export const useOpen = () => useBottomSheetStore((state) => state.open);

export const useStartClosing = () =>
  useBottomSheetStore((state) => state.startClosing);

export const useUpdateParams = () =>
  useBottomSheetStore((state) => state.updateParams);

export const useClearGroup = () =>
  useBottomSheetStore((state) => state.clearGroup);

export const useMount = () => useBottomSheetStore((state) => state.mount);

export const useUnmount = () => useBottomSheetStore((state) => state.unmount);
