import {
  cleanupAnimatedIndex,
  ensureAnimatedIndex,
  getAnimatedIndex,
  HIDDEN_ANIMATED_INDEX,
  resetAnimatedIndex,
} from '../animatedRegistry';
import {
  getOnBeforeClose,
  removeOnBeforeClose,
  setOnBeforeClose,
} from '../onBeforeCloseRegistry';
import { getNextPortalSession } from '../portalSessionRegistry';
import { cleanupSheetRef, getSheetRef, setSheetRef } from '../refsMap';
import { useBottomSheetStore } from '../store';
import { resetBottomSheetRegistries } from '../testing';

beforeEach(resetBottomSheetRegistries);

describe('animatedRegistry', () => {
  it('creates a value at the hidden position and reuses it', () => {
    const first = ensureAnimatedIndex('a');

    expect(first.value).toBe(HIDDEN_ANIMATED_INDEX);
    expect(ensureAnimatedIndex('a')).toBe(first);
  });

  it('rewinds an existing value without replacing it', () => {
    const value = ensureAnimatedIndex('a');
    value.value = 0;

    // Same object — adapters and the backdrop already hold this reference, so
    // swapping it would silently detach them.
    expect(resetAnimatedIndex('a')).toBe(value);
    expect(value.value).toBe(HIDDEN_ANIMATED_INDEX);
  });

  it('cleanup removes the value', () => {
    ensureAnimatedIndex('a');
    cleanupAnimatedIndex('a');

    expect(getAnimatedIndex('a')).toBeUndefined();
  });
});

// The backdrop reads animatedIndex from its first rendered frame, so a
// re-opened sheet must not still carry the value from its last cycle.
describe('store rewinds animatedIndex on open', () => {
  it('resets a persistent sheet to hidden when it re-opens', () => {
    const store = useBottomSheetStore.getState();
    store.mount({ id: 'p', groupId: 'g1' });

    const value = ensureAnimatedIndex('p');
    value.value = 0; // as if fully open from a previous cycle

    store.open({ kind: 'portal', id: 'p', groupId: 'g1' });

    expect(value.value).toBe(HIDDEN_ANIMATED_INDEX);
  });

  it('does not rewind when the open is rejected', () => {
    const store = useBottomSheetStore.getState();
    store.open({ kind: 'portal', id: 'a', groupId: 'g1' });
    store.markOpen('a');

    const value = ensureAnimatedIndex('a');
    value.value = 0;

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    store.open({ kind: 'portal', id: 'a', groupId: 'g1' }); // already-active
    jest.restoreAllMocks();

    // The sheet is still open on screen; rewinding would blank its backdrop.
    expect(value.value).toBe(0);
  });
});

describe('portalSessionRegistry', () => {
  it('hands out a fresh session per sheet, monotonically', () => {
    expect(getNextPortalSession('a')).toBe(1);
    expect(getNextPortalSession('a')).toBe(2);
    expect(getNextPortalSession('b')).toBe(1);
  });
});

describe('refsMap', () => {
  it('stores, reads and clears refs', () => {
    const ref = { current: { expand: jest.fn(), close: jest.fn() } };
    setSheetRef('a', ref);

    expect(getSheetRef('a')).toBe(ref);

    cleanupSheetRef('a');
    expect(getSheetRef('a')).toBeUndefined();
  });
});

describe('onBeforeCloseRegistry', () => {
  it('stores and removes interceptors', () => {
    const cb = jest.fn();
    setOnBeforeClose('a', cb);

    expect(getOnBeforeClose('a')).toBe(cb);

    removeOnBeforeClose('a');
    expect(getOnBeforeClose('a')).toBeUndefined();
  });
});

describe('resetBottomSheetRegistries', () => {
  it('clears the store and every module-level registry', () => {
    const store = useBottomSheetStore.getState();
    store.open({ kind: 'portal', id: 'a', groupId: 'g1' });
    setSheetRef('a', { current: null });
    setOnBeforeClose('a', jest.fn());
    ensureAnimatedIndex('a');

    resetBottomSheetRegistries();

    expect(useBottomSheetStore.getState().sheetsById).toEqual({});
    expect(useBottomSheetStore.getState().stackOrderByGroup).toEqual({});
    expect(getSheetRef('a')).toBeUndefined();
    expect(getOnBeforeClose('a')).toBeUndefined();
    expect(getAnimatedIndex('a')).toBeUndefined();
  });
});
