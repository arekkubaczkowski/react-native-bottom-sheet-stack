import { act, renderHook } from '@testing-library/react-native';

import { getSheetRef, __getAllSheetRefs } from '../refsMap';
import { useBottomSheetControl } from '../useBottomSheetControl';
import { useBottomSheetManager } from '../useBottomSheetManager';
import { useBottomSheetStatus } from '../useBottomSheetStatus';
import { inGroup, portal, setupSheetTest, statusOf, store } from './testUtils';

setupSheetTest();

const wrapper = inGroup();

const Sheet = () => null;

/**
 * `BottomSheetPortalId` narrows to the registry once an app augments it, and
 * the example app in this repo does — so these use real registered IDs rather
 * than casting past the type-safe surface.
 */
const PORTAL_ID = 'portal-mode-sheet-a';
const PARAM_PORTAL_ID = 'context-portal-sheet';

describe('useBottomSheetManager', () => {
  it('opens into the provider group and returns the id', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    let id: string | null = null;
    act(() => {
      id = result.current.open(<Sheet />, { id: 'a' });
    });

    expect(id).toBe('a');
    expect(store().stackOrderByGroup.g1).toEqual(['a']);
  });

  it('returns null when the store declines', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    act(() => {
      result.current.open(<Sheet />, { id: 'a' });
    });
    act(() => {
      store().markOpen('a');
    });

    let second: string | null = 'unset';
    act(() => {
      second = result.current.open(<Sheet />, { id: 'a' });
    });

    expect(second).toBeNull();
  });

  // The ref map is only cleaned up by QueueItem's unmount, which never happens
  // for a rejected open — so registering early leaked an unreclaimable entry.
  it('does not leak a ref when the open is declined', () => {
    const { result } = renderHook(() => useBottomSheetManager(), { wrapper });

    // Left in 'opening' so the group is busy and the next open is declined.
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

    expect(store().sheetsById.a?.params).toEqual({
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

    expect(store().sheetsById.a).toBeUndefined();
    expect(store().stackOrderByGroup.g1).toBeUndefined();
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
    expect(store().sheetsById[PORTAL_ID]?.usePortal).toBe(true);
  });

  it('reports false when the store declines', () => {
    const { result } = renderHook(() => useBottomSheetControl(PORTAL_ID), {
      wrapper,
    });

    act(() => {
      result.current.open();
    });
    act(() => {
      store().markOpen('sheet');
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
    expect(store().sheetsById[PARAM_PORTAL_ID]?.params).toEqual({
      greeting: 'hello',
    });

    act(() => {
      result.current.updateParams({ greeting: 'goodbye' });
    });
    expect(store().sheetsById[PARAM_PORTAL_ID]?.params).toEqual({
      greeting: 'goodbye',
    });

    act(() => {
      result.current.resetParams();
    });
    expect(store().sheetsById[PARAM_PORTAL_ID]?.params).toBeUndefined();
  });

  it('close reports the outcome', async () => {
    const { result } = renderHook(() => useBottomSheetControl(PORTAL_ID), {
      wrapper,
    });

    act(() => {
      result.current.open();
    });
    act(() => {
      store().markOpen('sheet');
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

  it('separates opening from open', () => {
    const { result } = renderHook(() => useBottomSheetStatus('a'));

    act(() => {
      store().open(portal('a'));
    });

    expect(result.current.isOpening).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVisible).toBe(true);

    act(() => {
      store().markOpen('a');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isOpening).toBe(false);
  });

  it('reports closing as visible but not open', () => {
    const { result } = renderHook(() => useBottomSheetStatus('a'));

    act(() => {
      store().open(portal('a'));
      store().markOpen('a');
      store().startClosing('a');
    });

    expect(result.current.isClosing).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVisible).toBe(true);
  });
});
