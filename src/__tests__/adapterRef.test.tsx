import { renderHook } from '@testing-library/react-native';

import { BottomSheetRefContext } from '../BottomSheetRef.context';
import { useAdapterRef } from '../useAdapterRef';
import {
  inSheet,
  makeRef,
  portal,
  setupSheetTest,
  stackOf,
  statusOf,
  store,
} from './testUtils';

setupSheetTest();

describe('useAdapterRef', () => {
  it('prefers the ref from context over the forwarded one', () => {
    const contextRef = makeRef();
    const forwarded = makeRef();
    const { result } = renderHook(() => useAdapterRef(forwarded), {
      wrapper: ({ children }) => (
        <BottomSheetRefContext.Provider value={contextRef}>
          {children}
        </BottomSheetRefContext.Provider>
      ),
    });
    expect(result.current).toBe(contextRef);
  });

  it('expands on mount when the sheet is already open', () => {
    store().open(portal('a'));
    store().markOpen('a');
    const ref = makeRef();

    renderHook(() => useAdapterRef(ref), { wrapper: inSheet('a') });

    expect(ref.current.expand).toHaveBeenCalledTimes(1);
  });

  it('leaves an opening sheet to the coordinator', () => {
    store().open(portal('a'));
    const ref = makeRef();

    renderHook(() => useAdapterRef(ref), { wrapper: inSheet('a') });

    expect(ref.current.expand).not.toHaveBeenCalled();
  });

  it('ends a sheet whose adapter mounts while it is closing', () => {
    store().open(portal('a'));
    store().markOpen('a');
    store().startClosing('a');
    const ref = makeRef();

    renderHook(() => useAdapterRef(ref), { wrapper: inSheet('a') });

    expect(ref.current.close).not.toHaveBeenCalled();
    expect(store().sheetsById.a).toBeUndefined();
    expect(stackOf('g1')).toEqual([]);
  });

  it('leaves a sheet parked as hidden by switch for the store to restore', () => {
    store().open(portal('a'));
    store().markOpen('a');
    store().open(portal('b'), 'switch');
    store().markOpen('b');
    expect(statusOf('a')).toBe('hidden');
    const ref = makeRef();

    renderHook(() => useAdapterRef(ref), { wrapper: inSheet('a') });

    expect(statusOf('a')).toBe('hidden');
    expect(stackOf('g1')).toEqual(['a', 'b']);

    store().startClosing('b');
    expect(statusOf('a')).toBe('opening');
  });

  it('does nothing for a hidden persistent sheet or outside a sheet context', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    const hiddenRef = makeRef();
    renderHook(() => useAdapterRef(hiddenRef), { wrapper: inSheet('p') });
    expect(hiddenRef.current.expand).not.toHaveBeenCalled();

    const bareRef = makeRef();
    renderHook(() => useAdapterRef(bareRef));
    expect(bareRef.current.expand).not.toHaveBeenCalled();
  });
});
