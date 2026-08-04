import { useBottomSheetStore } from '../store';
import type { OpenPayload } from '../store';
import { resetBottomSheetRegistries } from '../testing';

const store = () => useBottomSheetStore.getState();

/** A portal sheet payload — the common case; inline needs `content` too. */
const portal = (id: string, groupId = 'g1'): OpenPayload => ({
  kind: 'portal',
  id,
  groupId,
});

/** Opens a sheet and settles it, so the group is not left mid-animation. */
function openAndSettle(
  id: string,
  groupId = 'g1',
  mode?: 'push' | 'switch' | 'replace'
) {
  store().open(portal(id, groupId), mode);
  store().markOpen(id);
}

const stackOf = (groupId: string) =>
  useBottomSheetStore.getState().stackOrderByGroup[groupId] ?? [];

const statusOf = (id: string) =>
  useBottomSheetStore.getState().sheetsById[id]?.status;

/**
 * Everything observable about one group: its stack plus the status of every
 * sheet in it.
 *
 * Isolation assertions compare this before and after an operation in a
 * *different* group. Asserting on a single sheet is too weak — it only catches
 * a leak that happens to land on the sheet the test picked.
 */
function snapshotGroup(groupId: string) {
  const { sheetsById, stackOrderByGroup } = useBottomSheetStore.getState();
  return {
    stack: stackOrderByGroup[groupId] ?? [],
    statuses: Object.values(sheetsById)
      .filter((sheet) => sheet.groupId === groupId)
      .map((sheet) => [sheet.id, sheet.status] as const)
      .sort(),
  };
}

beforeEach(() => {
  resetBottomSheetRegistries();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('open', () => {
  it('puts the sheet on its own group stack as opening', () => {
    const result = store().open(portal('a'));

    expect(result).toEqual({ opened: true, id: 'a' });
    expect(stackOf('g1')).toEqual(['a']);
    expect(statusOf('a')).toBe('opening');
  });

  it('reports rejection instead of silently dropping an already-active sheet', () => {
    openAndSettle('a');

    const result = store().open(portal('a'));

    expect(result).toEqual({
      opened: false,
      id: 'a',
      reason: 'already-active',
    });
    expect(stackOf('g1')).toEqual(['a']);
  });

  it('reports rejection while another sheet in the group is animating open', () => {
    store().open(portal('a')); // left in 'opening'

    const result = store().open(portal('b'));

    expect(result).toEqual({ opened: false, id: 'b', reason: 'group-busy' });
    expect(stackOf('g1')).toEqual(['a']);
  });

  it('does not consider a different group busy', () => {
    store().open(portal('a', 'g1')); // g1 mid-animation

    const result = store().open(portal('b', 'g2'));

    expect(result.opened).toBe(true);
    expect(stackOf('g2')).toEqual(['b']);
  });

  it('records inline content and portal mode from the payload kind', () => {
    store().open({
      kind: 'inline',
      id: 'inline',
      groupId: 'g1',
      content: 'node',
    });

    const sheet = useBottomSheetStore.getState().sheetsById.inline!;
    expect(sheet.usePortal).toBe(false);
    expect(sheet.content).toBe('node');
  });
});

describe('open modes', () => {
  it('push leaves the sheet below visible', () => {
    openAndSettle('a');
    openAndSettle('b');

    expect(stackOf('g1')).toEqual(['a', 'b']);
    expect(statusOf('a')).toBe('open');
  });

  it('switch hides the sheet below without removing it', () => {
    openAndSettle('a');
    openAndSettle('b', 'g1', 'switch');

    expect(statusOf('a')).toBe('hidden');
    expect(stackOf('g1')).toEqual(['a', 'b']);
  });

  it('replace closes the sheet below', () => {
    openAndSettle('a');
    openAndSettle('b', 'g1', 'replace');

    expect(statusOf('a')).toBe('closing');
  });
});

// The bug this file exists for: three store operations used to walk one global
// stack, so a mode applied in one group could reach into another.
describe('group isolation', () => {
  it('switch does not hide a sheet in another group', () => {
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g2', 'switch');

    expect(statusOf('a')).toBe('open');
    expect(stackOf('g1')).toEqual(['a']);
    expect(stackOf('g2')).toEqual(['b']);
  });

  it('replace does not close a sheet in another group', () => {
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g2', 'replace');

    expect(statusOf('a')).toBe('open');
  });

  it('a full close cycle in one group leaves the other completely untouched', () => {
    // g1 ends up with a hidden sheet under an open one — the shape a leaking
    // getTopSheetId/getSheetBelowId would disturb.
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g1', 'switch');
    expect(statusOf('a')).toBe('hidden');

    const before = snapshotGroup('g1');

    openAndSettle('x', 'g2');
    store().startClosing('x');
    store().finishClosing('x');

    expect(snapshotGroup('g1')).toEqual(before);
    // g2 emptied out, and — the part a leak would break — it must not have
    // absorbed g1's sheets on the way. Asserting the whole map catches a write
    // that lands on the *other* group, which a per-group check cannot see.
    expect(useBottomSheetStore.getState().stackOrderByGroup).toEqual({
      g1: ['a', 'b'],
    });
  });

  it('closing in one group does not restore a sheet below in another', () => {
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g1', 'switch');
    openAndSettle('x', 'g2');

    const before = snapshotGroup('g1');
    store().startClosing('x');

    expect(snapshotGroup('g1')).toEqual(before);
    expect(useBottomSheetStore.getState().stackOrderByGroup).toEqual({
      g1: ['a', 'b'],
      g2: ['x'],
    });
  });

  it('opening in one group does not reorder another group stack', () => {
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g1');

    const before = snapshotGroup('g1');
    openAndSettle('x', 'g2', 'replace');

    expect(snapshotGroup('g1')).toEqual(before);
    expect(useBottomSheetStore.getState().stackOrderByGroup).toEqual({
      g1: ['a', 'b'],
      g2: ['x'],
    });
  });

  it('clearGroup leaves other groups untouched', () => {
    openAndSettle('a', 'g1');
    openAndSettle('x', 'g2');

    store().clearGroup('g1');

    expect(stackOf('g1')).toEqual([]);
    expect(stackOf('g2')).toEqual(['x']);
    expect(statusOf('x')).toBe('open');
  });
});

describe('close lifecycle', () => {
  it('removes a non-persistent sheet once closing finishes', () => {
    openAndSettle('a');
    store().startClosing('a');

    expect(statusOf('a')).toBe('closing');

    store().finishClosing('a');

    expect(useBottomSheetStore.getState().sheetsById.a).toBeUndefined();
    expect(stackOf('g1')).toEqual([]);
  });

  it('keeps a persistent sheet as hidden, off the stack', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    store().open(portal('p'));
    store().markOpen('p');
    store().startClosing('p');
    store().finishClosing('p');

    expect(statusOf('p')).toBe('hidden');
    expect(stackOf('g1')).toEqual([]);
  });

  it('restores the sheet below when the one above closes', () => {
    openAndSettle('a');
    openAndSettle('b', 'g1', 'switch');

    store().startClosing('b');

    expect(statusOf('a')).toBe('opening');
  });

  it('drops the group key once its last sheet closes', () => {
    openAndSettle('a');
    store().startClosing('a');
    store().finishClosing('a');

    expect('g1' in useBottomSheetStore.getState().stackOrderByGroup).toBe(
      false
    );
  });
});

describe('mount / unmount', () => {
  it('mounts a persistent sheet hidden and off the stack', () => {
    store().mount({ id: 'p', groupId: 'g1' });

    const sheet = useBottomSheetStore.getState().sheetsById.p!;
    expect(sheet.status).toBe('hidden');
    expect(sheet.keepMounted).toBe(true);
    expect(sheet.usePortal).toBe(true);
    expect(stackOf('g1')).toEqual([]);
  });

  it('is a no-op for an already-mounted id', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    const before = useBottomSheetStore.getState().sheetsById.p;

    store().mount({ id: 'p', groupId: 'g1' });

    expect(useBottomSheetStore.getState().sheetsById.p).toBe(before);
  });

  it('unmount removes the sheet from its group stack too', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    store().open(portal('p'));

    store().unmount('p');

    expect(useBottomSheetStore.getState().sheetsById.p).toBeUndefined();
    expect(stackOf('g1')).toEqual([]);
  });
});

describe('params', () => {
  it('updates and resets params', () => {
    store().open({ ...portal('a'), params: { userId: '1' } });

    expect(useBottomSheetStore.getState().sheetsById.a?.params).toEqual({
      userId: '1',
    });

    store().updateParams('a', { userId: '2' });
    expect(useBottomSheetStore.getState().sheetsById.a?.params).toEqual({
      userId: '2',
    });

    store().updateParams('a', undefined);
    expect(useBottomSheetStore.getState().sheetsById.a?.params).toBeUndefined();
  });

  it('keeps existing params when a persistent sheet re-opens without them', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    store().open({ ...portal('p'), params: { seen: true } });
    store().markOpen('p');
    store().startClosing('p');
    store().finishClosing('p');

    store().open(portal('p'));

    expect(useBottomSheetStore.getState().sheetsById.p?.params).toEqual({
      seen: true,
    });
  });
});
