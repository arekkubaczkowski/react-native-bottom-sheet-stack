import {
  cleanupAnimatedIndex,
  ensureAnimatedIndex,
  getAnimatedIndex,
  HIDDEN_ANIMATED_INDEX,
  resetAnimatedIndex,
} from '../animatedRegistry';
import { getOnBeforeClose, setOnBeforeClose } from '../onBeforeCloseRegistry';
import { getNextPortalSession } from '../portalSessionRegistry';
import { getSheetRef, setSheetRef } from '../refsMap';
import { resetBottomSheetRegistries } from '../testing';
import { portal, setupSheetTest, store } from './testUtils';

setupSheetTest();

describe('animatedRegistry', () => {
  it('creates a value at the hidden position and reuses it', () => {
    const first = ensureAnimatedIndex('a');

    expect(first.value).toBe(HIDDEN_ANIMATED_INDEX);
    expect(ensureAnimatedIndex('a')).toBe(first);
  });

  it('rewinds an existing value without replacing it', () => {
    const value = ensureAnimatedIndex('a');
    value.value = 0;

    // Same object: adapters already hold this reference.
    expect(resetAnimatedIndex('a')).toBe(value);
    expect(value.value).toBe(HIDDEN_ANIMATED_INDEX);
  });

  it('cleanup removes the value', () => {
    ensureAnimatedIndex('a');
    cleanupAnimatedIndex('a');

    expect(getAnimatedIndex('a')).toBeUndefined();
  });
});

describe('store rewinds animatedIndex on open', () => {
  it('resets a persistent sheet to hidden when it re-opens', () => {
    store().mount({ id: 'p', groupId: 'g1' });

    const value = ensureAnimatedIndex('p');
    value.value = 0;

    store().open(portal('p'));

    expect(value.value).toBe(HIDDEN_ANIMATED_INDEX);
  });

  it('does not rewind when the open is rejected', () => {
    store().open(portal('a'));
    store().markOpen('a');

    const value = ensureAnimatedIndex('a');
    value.value = 0;

    store().open(portal('a'));

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

describe('resetBottomSheetRegistries', () => {
  it('clears the store and every module-level registry', () => {
    store().open(portal('a'));
    setSheetRef('a', { current: null });
    setOnBeforeClose('a', jest.fn());
    ensureAnimatedIndex('a');

    resetBottomSheetRegistries();

    expect(store().sheetsById).toEqual({});
    expect(store().stackOrderByGroup).toEqual({});
    expect(getSheetRef('a')).toBeUndefined();
    expect(getOnBeforeClose('a')).toBeUndefined();
    expect(getAnimatedIndex('a')).toBeUndefined();
  });
});
