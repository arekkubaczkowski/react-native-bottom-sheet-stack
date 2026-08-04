import { act, renderHook } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { BottomSheetContext } from '../BottomSheet.context';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { getOnBeforeClose } from '../onBeforeCloseRegistry';
import { useBottomSheetStore } from '../store';
import { resetBottomSheetRegistries } from '../testing';
import { useBottomSheetContext } from '../useBottomSheetContext';
import { useOnBeforeClose } from '../useOnBeforeClose';
import { useSheetRenderData } from '../useSheetRenderData';

const store = () => useBottomSheetStore.getState();

const inGroup =
  (id: string) =>
  ({ children }: { children: ReactNode }) => (
    <BottomSheetManagerProvider id={id}>{children}</BottomSheetManagerProvider>
  );

const openPortal = (id: string, groupId: string) =>
  store().open({ kind: 'portal', id, groupId });

beforeEach(() => {
  resetBottomSheetRegistries();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSheetRenderData', () => {
  it('returns active sheets with a per-group stack index', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup('g1'),
    });

    act(() => {
      openPortal('a', 'g1');
      store().markOpen('a');
      openPortal('b', 'g1');
    });

    expect(result.current).toEqual([
      { id: 'a', stackIndex: 0, isActive: true },
      { id: 'b', stackIndex: 1, isActive: true },
    ]);
  });

  // Indices drive z-index layering, so they must not shift because another
  // group happens to have sheets open.
  it('indexes from its own group only', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup('g2'),
    });

    act(() => {
      openPortal('a', 'g1');
      store().markOpen('a');
      openPortal('x', 'g2');
    });

    expect(result.current).toEqual([
      { id: 'x', stackIndex: 0, isActive: true },
    ]);
  });

  // Persistent sheets stay rendered while hidden, so React does not unmount
  // and remount them across open/close cycles — that is the whole point of
  // keeping them mounted.
  it('renders hidden persistent sheets before active ones', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup('g1'),
    });

    act(() => {
      store().mount({ id: 'p', groupId: 'g1' });
      openPortal('a', 'g1');
    });

    expect(result.current).toEqual([
      { id: 'p', stackIndex: -1, isActive: false },
      { id: 'a', stackIndex: 0, isActive: true },
    ]);
  });

  it('moves a persistent sheet into the active list when it opens', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup('g1'),
    });

    act(() => {
      store().mount({ id: 'p', groupId: 'g1' });
    });
    expect(result.current[0]).toMatchObject({ id: 'p', isActive: false });

    act(() => {
      openPortal('p', 'g1');
    });
    expect(result.current).toEqual([
      { id: 'p', stackIndex: 0, isActive: true },
    ]);
  });

  it('does not leak another group persistent sheets', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup('g1'),
    });

    act(() => {
      store().mount({ id: 'other', groupId: 'g2' });
    });

    expect(result.current).toEqual([]);
  });
});

describe('useOnBeforeClose', () => {
  const inSheet =
    (id: string) =>
    ({ children }: { children: ReactNode }) => (
      <BottomSheetManagerProvider id="g1">
        <BottomSheetContext.Provider value={{ id }}>
          {children}
        </BottomSheetContext.Provider>
      </BottomSheetManagerProvider>
    );

  it('registers the interceptor and flags the sheet as non-dismissable', () => {
    act(() => {
      openPortal('a', 'g1');
    });

    const { unmount } = renderHook(() => useOnBeforeClose(() => true), {
      wrapper: inSheet('a'),
    });

    expect(getOnBeforeClose('a')).toBeDefined();
    expect(store().sheetsById.a?.preventDismiss).toBe(true);

    act(() => unmount());

    expect(getOnBeforeClose('a')).toBeUndefined();
    expect(useBottomSheetStore.getState().sheetsById.a?.preventDismiss).toBe(
      false
    );
  });

  it('keeps a stable registration while the callback identity changes', () => {
    act(() => {
      openPortal('a', 'g1');
    });

    const { rerender } = renderHook(
      ({ flag }: { flag: boolean }) => useOnBeforeClose(() => flag),
      { wrapper: inSheet('a'), initialProps: { flag: false } }
    );

    const first = getOnBeforeClose('a');
    rerender({ flag: true });

    // Same stable wrapper, but it must now see the latest closure.
    expect(getOnBeforeClose('a')).toBe(first);
  });

  it('throws outside a sheet', () => {
    expect(() =>
      renderHook(() => useOnBeforeClose(() => true), {
        wrapper: inGroup('g1'),
      })
    ).toThrow(/must be used within a BottomSheet/);
  });
});

describe('useBottomSheetContext', () => {
  const inSheet =
    (id: string) =>
    ({ children }: { children: ReactNode }) => (
      <BottomSheetContext.Provider value={{ id }}>
        {children}
      </BottomSheetContext.Provider>
    );

  it('exposes the sheet id, params and dismissal state', () => {
    act(() => {
      store().open({
        kind: 'portal',
        id: 'a',
        groupId: 'g1',
        params: { userId: '9' },
      });
    });

    const { result } = renderHook(() => useBottomSheetContext(), {
      wrapper: inSheet('a'),
    });

    expect(result.current.id).toBe('a');
    expect(result.current.params).toEqual({ userId: '9' });
    expect(result.current.preventDismiss).toBe(false);
  });

  it('forceClose bypasses the interceptor', async () => {
    act(() => {
      openPortal('a', 'g1');
      store().markOpen('a');
    });

    const { result } = renderHook(() => useBottomSheetContext(), {
      wrapper: inSheet('a'),
    });

    // An interceptor that would refuse if it were consulted.
    const { unmount } = renderHook(
      () => useOnBeforeClose(({ onCancel }) => onCancel()),
      { wrapper: inSheet('a') }
    );

    act(() => result.current.forceClose());

    expect(useBottomSheetStore.getState().sheetsById.a?.status).toBe('closing');
    unmount();
  });

  it('throws outside a sheet', () => {
    expect(() => renderHook(() => useBottomSheetContext())).toThrow(
      /must be used within a BottomSheet/
    );
  });
});
