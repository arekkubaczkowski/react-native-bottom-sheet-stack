import { act, renderHook } from '@testing-library/react-native';

import { getOnBeforeClose } from '../onBeforeCloseRegistry';
import { useBottomSheetContext } from '../useBottomSheetContext';
import { useOnBeforeClose } from '../useOnBeforeClose';
import { useSheetRenderData } from '../useSheetRenderData';
import {
  inGroup,
  inSheet,
  portal,
  setupSheetTest,
  statusOf,
  store,
} from './testUtils';

setupSheetTest();

const openPortal = (id: string, groupId = 'g1') =>
  store().open(portal(id, groupId));

describe('useSheetRenderData', () => {
  it('returns active sheets with a per-group stack index', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup(),
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

  // Indices drive z-index layering.
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

  // Hidden persistent sheets stay rendered so React never remounts them.
  it('renders hidden persistent sheets before active ones', () => {
    const { result } = renderHook(() => useSheetRenderData(), {
      wrapper: inGroup(),
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
      wrapper: inGroup(),
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
      wrapper: inGroup(),
    });

    act(() => {
      store().mount({ id: 'other', groupId: 'g2' });
    });

    expect(result.current).toEqual([]);
  });
});

describe('useOnBeforeClose', () => {
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
    expect(store().sheetsById.a?.preventDismiss).toBe(false);
  });

  it('keeps one registration that always sees the latest closure', () => {
    act(() => {
      openPortal('a');
    });

    const noop = { onConfirm: () => {}, onCancel: () => {} };
    const { rerender } = renderHook(
      ({ allow }: { allow: boolean }) => useOnBeforeClose(() => allow),
      { wrapper: inSheet('a'), initialProps: { allow: false } }
    );

    const registered = getOnBeforeClose('a');
    expect(registered?.(noop)).toBe(false);

    rerender({ allow: true });

    expect(getOnBeforeClose('a')).toBe(registered);
    expect(registered?.(noop)).toBe(true);
  });

  it('throws outside a sheet', () => {
    expect(() =>
      renderHook(() => useOnBeforeClose(() => true), {
        wrapper: inGroup(),
      })
    ).toThrow(/must be used within a BottomSheet/);
  });
});

describe('useBottomSheetContext', () => {
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

  it('forceClose closes without consulting the interceptor', () => {
    act(() => {
      openPortal('a');
      store().markOpen('a');
    });

    const interceptor = jest.fn<void, [{ onCancel: () => void }]>(
      ({ onCancel }) => onCancel()
    );
    renderHook(() => useOnBeforeClose(interceptor), { wrapper: inSheet('a') });

    const { result } = renderHook(() => useBottomSheetContext(), {
      wrapper: inSheet('a'),
    });
    act(() => result.current.forceClose());

    expect(interceptor).not.toHaveBeenCalled();
    expect(statusOf('a')).toBe('closing');
  });

  it('throws outside a sheet', () => {
    expect(() => renderHook(() => useBottomSheetContext())).toThrow(
      /must be used within a BottomSheet/
    );
  });
});
