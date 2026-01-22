import { getTopSheetId } from './helpers';
import { useBottomSheetStore } from './store';

// State hooks

export const useSheet = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]);

export const useSheetStatus = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.status);

export const useSheetParams = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.params);

export const useSheetContent = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.content);

export const useSheetUsePortal = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.usePortal);

export const useSheetKeepMounted = (id: string) =>
  useBottomSheetStore((state) => state.sheetsById[id]?.keepMounted);

export const useSheetExists = (id: string) =>
  useBottomSheetStore((state) => !!state.sheetsById[id]);

export const useIsSheetOpen = (id: string) =>
  useBottomSheetStore((state) => {
    const status = state.sheetsById[id]?.status;
    return status === 'open' || status === 'opening';
  });

export const useTopSheetId = () =>
  useBottomSheetStore((state) => getTopSheetId(state.stackOrder));

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
