import {
  openAndSettle,
  portal,
  setupSheetTest,
  snapshotGroup,
  stackOf,
  statusOf,
  store,
} from './testUtils';

setupSheetTest();

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
    store().open(portal('a'));

    const result = store().open(portal('b'));

    expect(result).toEqual({ opened: false, id: 'b', reason: 'group-busy' });
    expect(stackOf('g1')).toEqual(['a']);
  });

  it('does not consider a different group busy', () => {
    store().open(portal('a', 'g1'));

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

    expect(store().sheetsById.inline).toMatchObject({
      usePortal: false,
      content: 'node',
    });
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
    // A hidden sheet under an open one — the shape a stack leak would disturb.
    openAndSettle('a', 'g1');
    openAndSettle('b', 'g1', 'switch');
    expect(statusOf('a')).toBe('hidden');

    const before = snapshotGroup('g1');

    openAndSettle('x', 'g2');
    store().startClosing('x');
    store().finishClosing('x');

    expect(snapshotGroup('g1')).toEqual(before);
    // Asserting the whole map catches a write landing on the *other* group,
    // which a per-group check cannot see.
    expect(store().stackOrderByGroup).toEqual({
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
    expect(store().stackOrderByGroup).toEqual({
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
    expect(store().stackOrderByGroup).toEqual({
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

describe('re-opening a sheet that is still on the stack', () => {
  it('does not leave a duplicate entry', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    openAndSettle('p');
    openAndSettle('q', 'g1', 'switch');

    // 'p' is hidden but still stacked, which is what let it through twice.
    store().open(portal('p'));

    expect(stackOf('g1')).toEqual(['q', 'p']);
  });

  it('rejects an open from a group the sheet does not belong to', () => {
    store().mount({ id: 'p', groupId: 'g1' });

    const result = store().open(portal('p', 'g2'));

    expect(result).toEqual({
      opened: false,
      id: 'p',
      reason: 'group-mismatch',
    });
    // The record would otherwise stay in g1 while the stack entry landed in
    // g2, leaving the sheet unremovable from either.
    expect(store().sheetsById.p?.groupId).toBe('g1');
    expect(stackOf('g2')).toEqual([]);
  });
});

describe('close lifecycle', () => {
  it('removes a non-persistent sheet once closing finishes', () => {
    openAndSettle('a');
    store().startClosing('a');

    expect(statusOf('a')).toBe('closing');

    store().finishClosing('a');

    expect(store().sheetsById.a).toBeUndefined();
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

  it('does not restore the sheet below when closing from mid-stack', () => {
    openAndSettle('a');
    openAndSettle('b', 'g1', 'switch');
    openAndSettle('c');

    store().startClosing('b');

    // 'c' is still on top, so reviving 'a' underneath it would both look wrong
    // and block the group — the busy guard keys on 'opening'.
    expect(statusOf('a')).toBe('hidden');
    expect(statusOf('c')).toBe('open');
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

    expect('g1' in store().stackOrderByGroup).toBe(false);
  });
});

describe('mount / unmount', () => {
  it('mounts a persistent sheet hidden and off the stack', () => {
    store().mount({ id: 'p', groupId: 'g1' });

    const sheet = store().sheetsById.p!;
    expect(sheet.status).toBe('hidden');
    expect(sheet.keepMounted).toBe(true);
    expect(sheet.usePortal).toBe(true);
    expect(stackOf('g1')).toEqual([]);
  });

  it('is a no-op for an already-mounted id', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    const before = store().sheetsById.p;

    store().mount({ id: 'p', groupId: 'g1' });

    expect(store().sheetsById.p).toBe(before);
  });

  it('unmount restores the sheet below, like finishing a close does', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    openAndSettle('p');
    openAndSettle('q', 'g1', 'switch');

    store().unmount('q');

    // BottomSheetPersistent unmounts on every screen teardown, so leaving 'p'
    // hidden-but-stacked would render it as active while it is actually closed.
    expect(statusOf('p')).toBe('opening');
    expect(stackOf('g1')).toEqual(['p']);
  });

  it('unmount removes the sheet from its group stack too', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    store().open(portal('p'));

    store().unmount('p');

    expect(store().sheetsById.p).toBeUndefined();
    expect(stackOf('g1')).toEqual([]);
  });
});

describe('params', () => {
  it('updates and resets params', () => {
    store().open({ ...portal('a'), params: { userId: '1' } });

    expect(store().sheetsById.a?.params).toEqual({
      userId: '1',
    });

    store().updateParams('a', { userId: '2' });
    expect(store().sheetsById.a?.params).toEqual({
      userId: '2',
    });

    store().updateParams('a', undefined);
    expect(store().sheetsById.a?.params).toBeUndefined();
  });

  it('keeps existing params when a persistent sheet re-opens without them', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    store().open({ ...portal('p'), params: { seen: true } });
    store().markOpen('p');
    store().startClosing('p');
    store().finishClosing('p');

    store().open(portal('p'));

    expect(store().sheetsById.p?.params).toEqual({
      seen: true,
    });
  });
});
