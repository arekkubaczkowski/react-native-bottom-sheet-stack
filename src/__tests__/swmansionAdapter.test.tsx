import { type ComponentProps, type ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render } from '@testing-library/react-native';
import { useEvent } from 'react-native-reanimated';

import { BottomSheetContext } from '../BottomSheet.context';
import { BottomSheetDefaultIndexContext } from '../BottomSheetDefaultIndex.context';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { BottomSheetRefContext } from '../BottomSheetRef.context';
import { SwmansionSheetAdapter, programmatic } from '../adapters/swmansion';
import type { SheetAdapterRef } from '../adapter.types';
import { initBottomSheetCoordinator } from '../bottomSheetCoordinator';
import { setOnBeforeClose } from '../onBeforeCloseRegistry';
import { setSheetRef } from '../refsMap';
import { portal, setupSheetTest, stackOf, statusOf, store } from './testUtils';

type NativeProps = Record<string, any>;

const mockNativeProps: NativeProps[] = [];

// The native sheet is replaced by a recorder: these tests are about what the
// adapter tells it and what the adapter does with what it reports back.
jest.mock('@swmansion/react-native-bottom-sheet', () => ({
  BottomSheet: (props: Record<string, any>) => {
    mockNativeProps.push(props);
    return (
      <>
        {props.surface}
        {props.children}
      </>
    );
  },
}));

const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: INSETS,
};

const native = () => mockNativeProps[mockNativeProps.length - 1]!;

type AdapterProps = Partial<ComponentProps<typeof SwmansionSheetAdapter>>;

const makeAdapterRef = () => ({ current: null as SheetAdapterRef | null });

// Module scope, not inside a test: the compiler outlines components, and an
// outlined component loses whatever it captured from a test body.
const tree = (
  id: string,
  ref: { current: SheetAdapterRef | null },
  props: AdapterProps,
  persistent: boolean
): ReactElement => (
  <SafeAreaProvider initialMetrics={initialMetrics}>
    <BottomSheetManagerProvider id="g1">
      <BottomSheetContext.Provider value={{ id }}>
        <BottomSheetDefaultIndexContext.Provider
          value={{ defaultIndex: persistent ? -1 : 0 }}
        >
          <BottomSheetRefContext.Provider value={ref}>
            <SwmansionSheetAdapter {...props}>
              {props.children ?? <Text>body</Text>}
            </SwmansionSheetAdapter>
          </BottomSheetRefContext.Provider>
        </BottomSheetDefaultIndexContext.Provider>
      </BottomSheetContext.Provider>
    </BottomSheetManagerProvider>
  </SafeAreaProvider>
);

/** A portal sheet: on the stack as `opening`, adapter mounted at its open index. */
const renderOpening = (props: AdapterProps = {}, id = 'a') => {
  store().open(portal(id));
  const ref = makeAdapterRef();
  setSheetRef(id, ref);
  const view = render(tree(id, ref, props, false));
  return {
    ...view,
    ref,
    rerender: (next: AdapterProps) => view.rerender(tree(id, ref, next, false)),
  };
};

/** A persistent sheet: registered `hidden`, adapter mounted at the closed index. */
const renderPersistent = (props: AdapterProps = {}, id = 'p') => {
  store().mount({ id, groupId: 'g1' });
  const ref = makeAdapterRef();
  setSheetRef(id, ref);
  const view = render(tree(id, ref, props, true));
  return {
    ...view,
    ref,
    rerender: (next: AdapterProps) => view.rerender(tree(id, ref, next, true)),
  };
};

const settle = (index: number) => act(() => native().onSettle(index));
const userSnap = async (index: number) => {
  await act(async () => {
    native().onIndexChange(index);
  });
};

// Frames are driven by hand, as in coordinatorSync.test.ts: the coordinator
// retries across `requestAnimationFrame`, and these tests care how many frames
// elapse.
type FrameCallback = (time: number) => void;
let frameQueue: FrameCallback[] = [];

const flushFrames = async (count = 1) => {
  for (let i = 0; i < count; i++) {
    await act(async () => {
      const queued = frameQueue;
      frameQueue = [];
      queued.forEach((cb) => cb(0));
      await Promise.resolve();
    });
  }
};

let unsubscribe: (() => void) | undefined;

setupSheetTest();

beforeEach(() => {
  mockNativeProps.length = 0;
  frameQueue = [];
  (useEvent as jest.Mock).mockClear();
  jest
    .spyOn(global, 'requestAnimationFrame')
    .mockImplementation((cb: FrameCallback) => {
      frameQueue.push(cb);
      return frameQueue.length;
    });
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
});

describe('lifecycle', () => {
  it('opens on the settle of the open detent and closes on the settle of the closed one', async () => {
    renderOpening({ detents: [0, 'content'] });
    expect(native().index).toBe(1);

    settle(1);
    expect(statusOf('a')).toBe('open');

    await userSnap(0);
    expect(statusOf('a')).toBe('closing');

    settle(0);
    expect(store().sheetsById.a).toBeUndefined();
    expect(stackOf('g1')).toEqual([]);
  });

  it('does not report open for an expand() that lands while the sheet is still rising', () => {
    const { ref } = renderOpening();

    act(() => ref.current!.expand());
    expect(statusOf('a')).toBe('opening');

    settle(1);
    expect(statusOf('a')).toBe('open');
  });

  it('reports closed itself when asked to close a sheet that already rests closed', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    renderPersistent();
    settle(0);

    act(() => {
      store().open(portal('p'));
      store().startClosing('p');
    });
    await flushFrames(2);

    expect(native().index).toBe(0);
    expect(statusOf('p')).toBe('hidden');
    expect(stackOf('g1')).toEqual([]);
    expect(store().open(portal('p'))).toMatchObject({ opened: true });
  });

  it('waits for the native settle when asked to close a sheet that is still moving', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    renderPersistent();

    act(() => {
      store().open(portal('p'));
      store().startClosing('p');
    });
    await flushFrames(2);
    expect(statusOf('p')).toBe('closing');

    settle(0);
    expect(statusOf('p')).toBe('hidden');
  });

  it('reports open itself when asked to expand a sheet that already rests open', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    renderOpening();
    await flushFrames();
    settle(1);
    expect(statusOf('a')).toBe('open');

    setSheetRef('b', { current: { expand: jest.fn(), close: jest.fn() } });
    act(() => {
      store().open(portal('b'), 'switch');
      store().startClosing('b');
    });
    expect(statusOf('a')).toBe('opening');
    await flushFrames(2);

    expect(native().index).toBe(1);
    expect(statusOf('a')).toBe('open');
    // `b`'s stub adapter never reports its own close.
    expect(stackOf('g1')).toEqual(['a', 'b']);
    expect(statusOf('b')).toBe('closing');
  });

  it('still reports open itself after detents shrank under the resting sheet', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    const { rerender } = renderOpening({ detents: [0, 300, 600] });
    await flushFrames();
    settle(2);
    // Native clamps to the last detent on its own and settles nothing.
    rerender({ detents: [0, 300] });
    expect(native().index).toBe(1);

    setSheetRef('b', { current: { expand: jest.fn(), close: jest.fn() } });
    act(() => {
      store().open(portal('b'), 'switch');
      store().startClosing('b');
    });
    await flushFrames(2);

    expect(statusOf('a')).toBe('open');
  });

  it('restores a sheet the user dragged closed when an interceptor declines the close', async () => {
    renderOpening();
    settle(1);
    // The registry alone, without useOnBeforeClose: detent 0 stays draggable.
    setOnBeforeClose('a', () => false);

    await userSnap(0);
    expect(statusOf('a')).toBe('open');
    expect(native().index).toBe(0);

    settle(0);
    expect(statusOf('a')).toBe('open');
    expect(stackOf('g1')).toEqual(['a']);
    expect(native().index).toBe(1);
  });

  it('ignores a closed settle that is older than the open that followed it', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    renderPersistent();

    expect(store().open(portal('p'))).toMatchObject({ opened: true });
    settle(0);
    expect(statusOf('p')).toBe('opening');
    expect(stackOf('g1')).toEqual(['p']);

    await flushFrames();
    expect(native().index).toBe(1);
    settle(1);
    expect(statusOf('p')).toBe('open');
  });

  it('leaves a sheet parked by switch alone when its closed settle arrives', async () => {
    unsubscribe = initBottomSheetCoordinator('g1');
    renderOpening();
    await flushFrames();
    settle(1);

    setSheetRef('b', { current: { expand: jest.fn(), close: jest.fn() } });
    act(() => {
      store().open(portal('b'), 'switch');
    });
    await flushFrames();
    expect(native().index).toBe(0);

    settle(0);
    expect(statusOf('a')).toBe('hidden');
    expect(stackOf('g1')).toEqual(['a', 'b']);
  });
});

describe('controlled index', () => {
  it('follows a user snap between open detents', async () => {
    const onIndexChange = jest.fn();
    renderOpening({ detents: [0, 300, 600], onIndexChange });
    settle(2);

    await userSnap(1);

    expect(native().index).toBe(1);
    expect(onIndexChange).toHaveBeenLastCalledWith(1, 2);
    expect(statusOf('a')).toBe('open');
  });

  it('never hands native an index its detents do not cover', () => {
    const { rerender } = renderOpening({ detents: [0, 300, 600] });
    expect(native().index).toBe(2);

    rerender({ detents: [0, 300] });

    for (const props of mockNativeProps) {
      expect(props.index).toBeLessThan(props.detents.length);
    }
    expect(native().index).toBe(1);
  });

  it.each([
    [0, 1],
    [5, 2],
    [1.5, 2],
  ])('clamps expandedIndex %p to %p and warns', (expandedIndex, expected) => {
    renderOpening({ detents: [0, 300, 600], expandedIndex });

    expect(native().index).toBe(expected);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('expandedIndex')
    );
  });

  it('keeps a closed sheet closed when expandedIndex changes', () => {
    const { rerender, ref } = renderPersistent({
      detents: [0, 300, 600],
      expandedIndex: 1,
    });

    rerender({ detents: [0, 300, 600], expandedIndex: 2 });
    expect(native().index).toBe(0);

    act(() => ref.current!.expand());
    expect(native().index).toBe(2);
  });

  it('does not move an open sheet when a detent is added above it', () => {
    const { rerender } = renderOpening({ detents: [0, 300] });
    settle(1);

    rerender({ detents: [0, 300, 600] });

    expect(native().index).toBe(1);
  });

  it('warns once, not on every render, when the first detent cannot close the sheet', () => {
    const { rerender } = renderOpening({ detents: [200, 400] });
    rerender({ detents: [200, 400], cornerRadius: 4 });
    rerender({ detents: [200, 400], cornerRadius: 8 });

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('closed first detent')
    );
  });

  it('announces a programmatic open once, from the closed index', () => {
    const onIndexChange = jest.fn();
    const { ref } = renderOpening({ detents: [0, 300, 600], onIndexChange });

    act(() => ref.current!.expand());
    act(() => ref.current!.expand());

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2, 0);
  });

  it('treats a 0% detent as closed', async () => {
    renderOpening({ detents: ['0%', '50%'] });
    settle(1);
    expect(console.warn).not.toHaveBeenCalled();

    await userSnap(0);
    settle(0);

    expect(store().sheetsById.a).toBeUndefined();
  });
});

describe('props handed to the native sheet', () => {
  it('keeps the sheet below the status bar by offsetting the host, not natively', () => {
    renderOpening();

    expect(native().style[0]).toEqual({ top: INSETS.top });
    expect(native().topInset).toBe(0);
    expect(native()).not.toHaveProperty('extendUnderStatusBar');
  });

  it('honours topInset, and the deprecated extendUnderStatusBar as topInset 0', () => {
    const { rerender } = renderOpening({ topInset: 12 });
    expect(native().style[0]).toEqual({ top: 12 });
    expect(native().topInset).toBe(0);

    rerender({ extendUnderStatusBar: true });
    expect(native().style[0]).toEqual({ top: 0 });

    rerender({ extendUnderStatusBar: true, topInset: 8 });
    expect(native().style[0]).toEqual({ top: 8 });
  });

  it('maps the deprecated disableScrollableNegotiation onto scrollCoordination', () => {
    const { rerender } = renderOpening({ disableScrollableNegotiation: true });
    expect(native().scrollCoordination).toBe('none');
    expect(native()).not.toHaveProperty('disableScrollableNegotiation');

    rerender({
      disableScrollableNegotiation: true,
      scrollCoordination: 'handoff',
    });
    expect(native().scrollCoordination).toBe('handoff');
  });

  it('never lets the native sheet unmount its content at the closed detent', () => {
    renderPersistent({ lazy: true } as AdapterProps);

    expect(native().lazy).toBe(false);
  });

  it('makes the closed detent programmatic while dismissal is blocked', () => {
    renderOpening({ detents: [{ value: 0 }, 'content'], handle: true });
    expect(native().detents[0]).toEqual({ value: 0 });

    act(() => store().setPreventDismiss('a', true));

    expect(native().detents).toEqual([
      { value: 0, programmatic: true },
      'content',
    ]);
  });

  it('keeps the deprecated programmatic() helper working', () => {
    expect(programmatic(320)).toEqual({ value: 320, programmatic: true });
  });

  it('expands to the full height the sheet has, unless detents say otherwise', () => {
    const { rerender } = renderOpening({ fullHeight: true });
    expect(native().detents).toEqual([0, 1_000_000]);

    rerender({ fullHeight: true, detents: [0, 400] });
    expect(native().detents).toEqual([0, 400]);
  });
});
