import { initBottomSheetCoordinator } from '../bottomSheetCoordinator';
import { setSheetRef } from '../refsMap';
import { useBottomSheetStore } from '../store';
import type { OpenPayload } from '../store';
import { resetBottomSheetRegistries } from '../testing';

const store = () => useBottomSheetStore.getState();

const portal = (id: string, groupId = 'g1'): OpenPayload => ({
  kind: 'portal',
  id,
  groupId,
});

const makeRef = () => ({
  current: { expand: jest.fn(), close: jest.fn() },
});

/**
 * Frames are driven by hand rather than by timers.
 *
 * The coordinator retries across requestAnimationFrame, and these tests care
 * about exactly how many frames elapse — advancing fake timers instead would
 * couple them to how rAF happens to be polyfilled, and `await` inside a
 * fake-timer loop deadlocks.
 */
type FrameCallback = (time: number) => void;

let frameQueue: FrameCallback[] = [];

const flushFrames = async (count = 1) => {
  for (let i = 0; i < count; i++) {
    const queued = frameQueue;
    frameQueue = [];
    queued.forEach((cb) => cb(0));
    await Promise.resolve();
  }
};

let unsubscribe: (() => void) | undefined;

beforeEach(() => {
  resetBottomSheetRegistries();
  frameQueue = [];
  jest
    .spyOn(global, 'requestAnimationFrame')
    .mockImplementation((cb: FrameCallback) => {
      frameQueue.push(cb);
      return frameQueue.length;
    });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  jest.restoreAllMocks();
});

describe('store to adapter sync', () => {
  it('expands the sheet when it starts opening', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    const ref = makeRef();
    setSheetRef('a', ref);

    store().open(portal('a'));
    await flushFrames();

    expect(ref.current.expand).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when it starts closing', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    const ref = makeRef();
    setSheetRef('a', ref);

    store().open(portal('a'));
    await flushFrames();
    store().markOpen('a');
    store().startClosing('a');
    await flushFrames();

    expect(ref.current.close).toHaveBeenCalledTimes(1);
  });

  it('ignores sheets belonging to another group', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    const ref = makeRef();
    setSheetRef('x', ref);

    store().open(portal('x', 'g2'));
    await flushFrames(3);

    expect(ref.current.expand).not.toHaveBeenCalled();
  });

  // B7: the ref may not exist yet — a portal sheet has to teleport its content
  // into the PortalHost first. A single attempt was a silent no-op, and for
  // 'closing' that left the sheet stuck in that status forever.
  it('retries until the adapter registers its ref', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');

    store().open(portal('a')); // no ref yet
    await flushFrames(2);

    const ref = makeRef();
    setSheetRef('a', ref);
    await flushFrames(2);

    expect(ref.current.expand).toHaveBeenCalledTimes(1);
  });

  it('retries a close that arrives before the ref does', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');

    store().open(portal('a'));
    store().markOpen('a');
    store().startClosing('a');
    await flushFrames(2);

    const ref = makeRef();
    setSheetRef('a', ref);
    await flushFrames(2);

    expect(ref.current.close).toHaveBeenCalledTimes(1);
  });

  it('gives up after a bounded number of frames and warns', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');

    store().open(portal('a')); // ref never arrives
    await flushFrames(15);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('never registered a ref')
    );
  });

  it('does not expand a sheet that stopped opening while waiting', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    const ref = makeRef();
    setSheetRef('a', ref);

    store().open(portal('a'));
    // Closed again before the frame callback runs.
    store().markOpen('a');
    store().startClosing('a');
    await flushFrames(2);

    expect(ref.current.expand).not.toHaveBeenCalled();
    expect(ref.current.close).toHaveBeenCalled();
  });

  it('stops reacting once unsubscribed', async () => {
    const stop = initBottomSheetCoordinator('g1');
    const ref = makeRef();
    setSheetRef('a', ref);

    stop();
    store().open(portal('a'));
    await flushFrames(3);

    expect(ref.current.expand).not.toHaveBeenCalled();
  });
});
