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
