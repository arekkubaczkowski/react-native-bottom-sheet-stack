import { act, renderHook } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { getSheetRef, __getAllSheetRefs } from '../refsMap';
import { useBottomSheetStore } from '../store';
import { resetBottomSheetRegistries } from '../testing';
import { useBottomSheetControl } from '../useBottomSheetControl';
import { useBottomSheetManager } from '../useBottomSheetManager';
import { useBottomSheetStatus } from '../useBottomSheetStatus';

const wrapper = ({ children }: { children: ReactNode }) => (
  <BottomSheetManagerProvider id="g1">{children}</BottomSheetManagerProvider>
);

const Sheet = () => null;

/**
 * A registered portal ID.
 *
 * `BottomSheetPortalId` narrows to the registry once an app augments it — and
 * the example app in this repo does, so an arbitrary string no longer type-checks
 * here. Using a real registered ID keeps these tests honest about the type-safe
 * surface rather than casting past it.
 */
const PORTAL_ID = 'portal-mode-sheet-a';

/** A registered portal ID that declares params, so updateParams is meaningful. */
const PARAM_PORTAL_ID = 'context-portal-sheet';

const statusOf = (id: string) =>
  useBottomSheetStore.getState().sheetsById[id]?.status;

beforeEach(() => {
  resetBottomSheetRegistries();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useBottomSheetManager', () => {
  it('opens into the provider group and returns the id', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    let id: string | null = null;
    act(() => {
      id = result.current.open(<Sheet />, { id: 'a' });
    });

    expect(id).toBe('a');
    expect(useBottomSheetStore.getState().stackOrderByGroup.g1).toEqual(['a']);
  });

  it('returns null when the store declines', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    act(() => {
      result.current.open(<Sheet />, { id: 'a' });
    });
    act(() => {
      useBottomSheetStore.getState().markOpen('a');
    });

    let second: string | null = 'unset';
    act(() => {
      second = result.current.open(<Sheet />, { id: 'a' });
    });

    expect(second).toBeNull();
  });

  // B2: the ref map is module-global and only ever cleaned up by QueueItem's
  // unmount. Registering before the store accepted the sheet leaked an entry
  // nothing could reclaim — once per rejected call, since inline IDs are random.
  it('does not leak a ref when the open is declined', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    // Left in 'opening' on purpose — that is what makes the group busy, so the
    // next open is genuinely declined.
    act(() => {
      result.current.open(<Sheet />, { id: 'a' });
    });

    const refCountBefore = __getAllSheetRefs().size;

    let rejected: string | null = 'unset';
    act(() => {
      rejected = result.current.open(<Sheet />, { id: 'rejected' });
    });

    expect(rejected).toBeNull();
    expect(getSheetRef('rejected')).toBeUndefined();
    expect(__getAllSheetRefs().size).toBe(refCountBefore);
  });

  it('registers a ref for an accepted open', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    act(() => {
      result.current.open(<Sheet />, { id: 'a' });
    });

    expect(getSheetRef('a')).toBeDefined();
  });

  it('passes params through to the sheet', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    act(() => {
      result.current.open(<Sheet />, { id: 'a', params: { userId: '7' } });
    });

    expect(useBottomSheetStore.getState().sheetsById.a?.params).toEqual({
      userId: '7',
    });
  });

  it('destroyAll drops the group without running interceptors', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    act(() => {
      result.current.open(<Sheet />, { id: 'a' });
    });
    act(() => {
      result.current.destroyAll();
    });

    expect(useBottomSheetStore.getState().sheetsById.a).toBeUndefined();
    expect(useBottomSheetStore.getState().stackOrderByGroup.g1).toBeUndefined();
  });
});

describe('useBottomSheetControl', () => {
  it('opens a portal sheet and reports success', () => {
    const { result } = renderHook(() => useBottomSheetControl(PORTAL_ID), {
      wrapper,
    });

    let opened: boolean | undefined;
    act(() => {
      opened = result.current.open();
    });

    expect(opened).toBe(true);
    expect(
      useBottomSheetStore.getState().sheetsById[PORTAL_ID]?.usePortal
    ).toBe(true);
  });

  // The asymmetry this closes: the store reported the rejection, the hook
  // consumed it internally and told the caller nothing.
  it('reports false when the store declines', () => {
    const { result } = renderHook(() => useBottomSheetControl(PORTAL_ID), {
      wrapper,
    });

    act(() => {
      result.current.open();
    });
    act(() => {
      useBottomSheetStore.getState().markOpen('sheet');
    });

    let second: boolean | undefined;
    act(() => {
      second = result.current.open();
    });

    expect(second).toBe(false);
  });

  it('updates and resets params', () => {
    const { result } = renderHook(
      () => useBottomSheetControl(PARAM_PORTAL_ID),
      { wrapper }
    );

    act(() => {
      result.current.open({ params: { greeting: 'hello' } });
    });
    expect(
      useBottomSheetStore.getState().sheetsById[PARAM_PORTAL_ID]?.params
    ).toEqual({ greeting: 'hello' });

    act(() => {
      result.current.updateParams({ greeting: 'goodbye' });
    });
    expect(
      useBottomSheetStore.getState().sheetsById[PARAM_PORTAL_ID]?.params
    ).toEqual({ greeting: 'goodbye' });

    act(() => {
      result.current.resetParams();
    });
    expect(
      useBottomSheetStore.getState().sheetsById[PARAM_PORTAL_ID]?.params
    ).toBeUndefined();
  });

  it('close reports the outcome', async () => {
    const { result } = renderHook(() => useBottomSheetControl(PORTAL_ID), {
      wrapper,
    });

    act(() => {
      result.current.open();
    });
    act(() => {
      useBottomSheetStore.getState().markOpen('sheet');
    });

    await act(async () => {
      await expect(result.current.close()).resolves.toEqual({ closed: true });
    });
    expect(statusOf(PORTAL_ID)).toBe('closing');
  });
});

describe('useBottomSheetStatus', () => {
  it('reports null for a sheet that was never opened', () => {
    const { result } = renderHook(() => useBottomSheetStatus('nope'));

    expect(result.current).toEqual({
      status: null,
      isOpen: false,
      isOpening: false,
      isClosing: false,
      isVisible: false,
    });
  });

  // isOpen used to include 'opening', so there was no way to tell the
  // interactive state from the animation.
  it('separates opening from open', () => {
    const { result } = renderHook(() => useBottomSheetStatus('a'));

    act(() => {
      useBottomSheetStore
        .getState()
        .open({ kind: 'portal', id: 'a', groupId: 'g1' });
    });

    expect(result.current.isOpening).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVisible).toBe(true);

    act(() => {
      useBottomSheetStore.getState().markOpen('a');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isOpening).toBe(false);
  });

  it('reports closing as visible but not open', () => {
    const { result } = renderHook(() => useBottomSheetStatus('a'));

    act(() => {
      const store = useBottomSheetStore.getState();
      store.open({ kind: 'portal', id: 'a', groupId: 'g1' });
      store.markOpen('a');
      store.startClosing('a');
    });

    expect(result.current.isClosing).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVisible).toBe(true);
  });
});
