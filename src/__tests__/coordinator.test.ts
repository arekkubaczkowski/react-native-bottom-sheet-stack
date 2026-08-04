import { closeAllAnimated, requestClose } from '../bottomSheetCoordinator';
import { setOnBeforeClose } from '../onBeforeCloseRegistry';
import { useBottomSheetStore } from '../store';
import type { OpenPayload } from '../store';
import { resetBottomSheetRegistries } from '../testing';

const store = () => useBottomSheetStore.getState();

const portal = (id: string, groupId = 'g1'): OpenPayload => ({
  kind: 'portal',
  id,
  groupId,
});

function openAndSettle(id: string, groupId = 'g1', mode?: 'push' | 'switch') {
  store().open(portal(id, groupId), mode);
  store().markOpen(id);
}

const statusOf = (id: string) =>
  useBottomSheetStore.getState().sheetsById[id]?.status;

beforeEach(() => {
  resetBottomSheetRegistries();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestClose', () => {
  it('closes an open sheet', async () => {
    openAndSettle('a');

    await expect(requestClose('a')).resolves.toEqual({ closed: true });
    expect(statusOf('a')).toBe('closing');
  });

  it('closes a sheet that is still opening', async () => {
    store().open(portal('a'));

    await expect(requestClose('a')).resolves.toEqual({ closed: true });
  });

  // Each of these used to be indistinguishable — the function returned a bare
  // boolean that meant four different things.
  it('reports not-closable for a sheet that is already closing', async () => {
    openAndSettle('a');
    await requestClose('a');

    await expect(requestClose('a')).resolves.toEqual({
      closed: false,
      reason: 'not-closable',
    });
  });

  it('reports not-closable for an unknown sheet', async () => {
    await expect(requestClose('nope')).resolves.toEqual({
      closed: false,
      reason: 'not-closable',
    });
  });

  it('reports not-closable for a hidden persistent sheet', async () => {
    store().mount({ id: 'p', groupId: 'g1' });

    await expect(requestClose('p')).resolves.toEqual({
      closed: false,
      reason: 'not-closable',
    });
  });

  it('reports blocked when an interceptor declines', async () => {
    openAndSettle('a');
    setOnBeforeClose('a', ({ onCancel }) => onCancel());

    await expect(requestClose('a')).resolves.toEqual({
      closed: false,
      reason: 'blocked',
    });
    expect(statusOf('a')).toBe('open');
  });

  it('reports interceptor-error and keeps the sheet open when it throws', async () => {
    openAndSettle('a');
    setOnBeforeClose('a', () => {
      throw new Error('boom');
    });

    await expect(requestClose('a')).resolves.toEqual({
      closed: false,
      reason: 'interceptor-error',
    });
    expect(statusOf('a')).toBe('open');
  });

  it('closes when the interceptor confirms', async () => {
    openAndSettle('a');
    setOnBeforeClose('a', ({ onConfirm }) => onConfirm());

    await expect(requestClose('a')).resolves.toEqual({ closed: true });
    expect(statusOf('a')).toBe('closing');
  });

  it('accepts a boolean-returning interceptor', async () => {
    openAndSettle('a');
    openAndSettle('b');
    setOnBeforeClose('a', () => false);
    setOnBeforeClose('b', () => true);

    await expect(requestClose('a')).resolves.toEqual({
      closed: false,
      reason: 'blocked',
    });
    await expect(requestClose('b')).resolves.toEqual({ closed: true });
  });
});

describe('closeAllAnimated', () => {
  it('closes every sheet in the group, topmost first', async () => {
    openAndSettle('a');
    openAndSettle('b');
    openAndSettle('c');

    const result = await closeAllAnimated('g1', { stagger: 0 });

    expect(result).toEqual({ closedAll: true, closed: ['c', 'b', 'a'] });
    expect(statusOf('a')).toBe('closing');
    expect(statusOf('c')).toBe('closing');
  });

  it('stops at a blocking interceptor and names it', async () => {
    openAndSettle('a');
    openAndSettle('b');
    openAndSettle('c');
    setOnBeforeClose('b', ({ onCancel }) => onCancel());

    const result = await closeAllAnimated('g1', { stagger: 0 });

    expect(result).toEqual({
      closedAll: false,
      closed: ['c'],
      stoppedAt: 'b',
    });
    // Everything below the refusal stays open.
    expect(statusOf('a')).toBe('open');
    expect(statusOf('b')).toBe('open');
  });

  // Regression: 'nothing to close' used to break the loop like a refusal,
  // stranding every sheet underneath one that had already settled.
  it('keeps going past a sheet that has nothing to close', async () => {
    openAndSettle('a');
    openAndSettle('b');
    openAndSettle('c');

    // 'b' is already on its way out before the cascade reaches it, so
    // requestClose will report not-closable for it.
    await requestClose('b');
    expect(statusOf('b')).toBe('closing');

    const result = await closeAllAnimated('g1', { stagger: 0 });

    expect(result.closedAll).toBe(true);
    // 'b' is skipped rather than treated as a refusal, so 'a' below it still
    // gets closed.
    expect(result.closed).toEqual(['c', 'a']);
    expect(statusOf('a')).toBe('closing');
  });

  it('only touches its own group', async () => {
    openAndSettle('a', 'g1');
    openAndSettle('x', 'g2');

    const result = await closeAllAnimated('g1', { stagger: 0 });

    expect(result.closed).toEqual(['a']);
    expect(statusOf('x')).toBe('open');
  });

  it('is a no-op for an empty group', async () => {
    await expect(closeAllAnimated('nothing', { stagger: 0 })).resolves.toEqual({
      closedAll: true,
      closed: [],
    });
  });

  it('staggers between closes', async () => {
    jest.useFakeTimers();
    try {
      openAndSettle('a');
      openAndSettle('b');

      const pending = closeAllAnimated('g1', { stagger: 100 });

      // The topmost closes immediately; the next waits out the stagger.
      await Promise.resolve();
      expect(statusOf('b')).toBe('closing');
      expect(statusOf('a')).toBe('open');

      await jest.advanceTimersByTimeAsync(100);
      await pending;

      expect(statusOf('a')).toBe('closing');
    } finally {
      jest.useRealTimers();
    }
  });
});
