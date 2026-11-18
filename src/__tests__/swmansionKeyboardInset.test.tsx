export {};

type Listener = (event: { height: number }) => void;
type Peer = () => unknown;

let mockHandlers: Record<string, Listener> | undefined;

const installedPeer: Peer = () => ({
  useGenericKeyboardHandler: (handlers: Record<string, Listener>) => {
    const { useLayoutEffect } = require('react') as typeof import('react');
    useLayoutEffect(() => {
      mockHandlers = handlers;
      return () => {
        mockHandlers = undefined;
      };
    }, [handlers]);
  },
});

const load = (peer: Peer) => {
  jest.resetModules();
  jest.doMock('react-native-keyboard-controller', peer, { virtual: true });
  const { createElement } = require('react') as typeof import('react');
  const { act, render } =
    require('@testing-library/react-native/pure') as typeof import('@testing-library/react-native/pure');
  const { Keyboard } = require('react-native') as typeof import('react-native');
  const { makeMutable } =
    require('react-native-reanimated') as typeof import('react-native-reanimated');
  const { SwmansionKeyboardInset } =
    require('../adapters/swmansion/SwmansionKeyboardInset') as typeof import('../adapters/swmansion/SwmansionKeyboardInset');

  return {
    emit: (name: string, height: number) =>
      act(() => mockHandlers?.[name]?.({ height })),
    mount: () => {
      const height = makeMutable(0);
      return {
        height,
        ...render(createElement(SwmansionKeyboardInset, { height })),
      };
    },
    setVisibleHeight: (height: number) =>
      jest.spyOn(Keyboard, 'metrics').mockReturnValue({
        height,
        width: 390,
        screenX: 0,
        screenY: 844 - height,
      }),
  };
};

beforeEach(() => {
  mockHandlers = undefined;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SwmansionKeyboardInset', () => {
  it('uses intermediate native positions through opening and interactive dismissal', () => {
    const { emit, mount } = load(installedPeer);
    const { height, unmount } = mount();

    emit('onStart', 300);
    expect(height.get()).toBe(0);
    emit('onMove', 127);
    expect(height.get()).toBe(127);
    emit('onMove', 246);
    expect(height.get()).toBe(246);
    emit('onEnd', 300);
    expect(height.get()).toBe(300);

    emit('onStart', 0);
    expect(height.get()).toBe(300);
    emit('onInteractive', 108);
    expect(height.get()).toBe(108);
    emit('onEnd', 0);
    expect(height.get()).toBe(0);
    unmount();
  });

  it('starts at the current height when mounted with a visible keyboard', () => {
    const { mount, setVisibleHeight } = load(installedPeer);
    setVisibleHeight(280);

    const { height, unmount } = mount();
    expect(height.get()).toBe(280);
    unmount();
  });

  it('unsubscribes and clears the offset on unmount', () => {
    const { emit, mount } = load(installedPeer);
    const { height, unmount } = mount();
    emit('onMove', 150);

    unmount();
    expect(mockHandlers).toBeUndefined();
    expect(height.get()).toBe(0);
  });

  it.each<[string, Peer]>([
    [
      'is not installed',
      () => {
        throw new Error('Cannot find module');
      },
    ],
    ['lacks native movement handlers', () => ({})],
  ])('leaves the offset at zero and warns once if the peer %s', (_, peer) => {
    const { mount, setVisibleHeight } = load(peer);
    setVisibleHeight(280);
    const first = mount();
    const second = mount();

    expect(first.height.get()).toBe(0);
    expect(second.height.get()).toBe(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('react-native-keyboard-controller')
    );
    first.unmount();
    second.unmount();
  });
});
