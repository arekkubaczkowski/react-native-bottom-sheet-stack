type Listener = (event: { height: number }) => void;
type Peer = () => unknown;

const mockListeners = new Map<string, Set<Listener>>();
const mockKeyboard = { visible: false, height: 0 };

const mockKeyboardEvents = {
  addListener: (name: string, listener: Listener) => {
    const listeners = mockListeners.get(name) ?? new Set<Listener>();
    mockListeners.set(name, listeners.add(listener));
    return { remove: () => listeners.delete(listener) };
  },
};

// Modelled on 1.20.7, hook included: its `useKeyboardState` re-reads the
// global state on will-show, did-show and did-hide, and never on will-hide.
const installedPeer: Peer = () => {
  const { useEffect, useState } = require('react') as typeof import('react');
  const KeyboardController = {
    isVisible: () => mockKeyboard.visible,
    state: () => ({ height: mockKeyboard.height }),
  };
  const useKeyboardState = <T,>(selector: (state: { height: number }) => T) => {
    // Compiled, it would read the compiler runtime from the outer module
    // registry, whose React is not the one rendering it.
    'use no memo';
    const [state, setState] = useState(() =>
      selector(KeyboardController.state())
    );
    useEffect(() => {
      const subscriptions = [
        'keyboardWillShow',
        'keyboardDidShow',
        'keyboardDidHide',
      ].map((name) =>
        mockKeyboardEvents.addListener(name, () =>
          setState(selector(KeyboardController.state()))
        )
      );
      return () => subscriptions.forEach((sub) => sub.remove());
    }, [selector]);
    return state;
  };
  return {
    KeyboardEvents: mockKeyboardEvents,
    KeyboardController,
    useKeyboardState,
  };
};

// 1.14: events, but neither `KeyboardController.isVisible()` nor `.state()`.
const peer114: Peer = () => ({
  KeyboardEvents: mockKeyboardEvents,
  KeyboardController: { dismiss: () => {} },
});

/**
 * The module decides whether the peer is usable once, at import. Each peer
 * state therefore needs its own module registry — and React, the renderer and
 * the component have to come out of that same registry, or the component runs
 * against a second copy of React.
 */
const load = (peer: Peer) => {
  jest.resetModules();
  jest.doMock('react-native-keyboard-controller', peer, { virtual: true });
  // `/pure`: the default entry registers its cleanup hooks on import, which
  // Jest rejects from inside a test.
  const { act, render } =
    require('@testing-library/react-native/pure') as typeof import('@testing-library/react-native/pure');
  const { Text } = require('react-native') as typeof import('react-native');
  const { SwmansionKeyboardInset } =
    require('../adapters/swmansion/SwmansionKeyboardInset') as typeof import('../adapters/swmansion/SwmansionKeyboardInset');

  // Native updates the global state before any JS listener runs.
  const emit = (name: string, height: number) =>
    act(() => {
      mockKeyboard.height = height;
      mockKeyboard.visible = height > 0;
      mockListeners.get(name)?.forEach((listener) => listener({ height }));
    });

  return { emit, render, Text, Inset: SwmansionKeyboardInset };
};

beforeEach(() => {
  mockListeners.clear();
  mockKeyboard.visible = false;
  mockKeyboard.height = 0;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SwmansionKeyboardInset', () => {
  it('pads by the keyboard as it starts to show and releases as it starts to hide', () => {
    const { emit, render, Text, Inset } = load(installedPeer);
    const view = render(
      <Inset style={{ flex: 1 }}>
        <Text>body</Text>
      </Inset>
    );

    emit('keyboardWillShow', 300);
    expect(view.toJSON()).toMatchObject({
      props: { style: [{ flex: 1 }, { paddingBottom: 300 }] },
    });

    emit('keyboardWillHide', 0);
    expect(view.toJSON()).toMatchObject({
      props: { style: [{ flex: 1 }, false] },
    });
  });

  it('starts padded when it mounts under a keyboard that is already up', () => {
    mockKeyboard.visible = true;
    mockKeyboard.height = 280;
    const { render, Text, Inset } = load(installedPeer);

    const view = render(
      <Inset>
        <Text>body</Text>
      </Inset>
    );

    expect(view.toJSON()).toMatchObject({
      props: { style: [undefined, { paddingBottom: 280 }] },
    });
  });

  it('pads only by what a gap below the sheet does not already cover', () => {
    const { emit, render, Text, Inset } = load(installedPeer);
    const view = render(
      <Inset bottomGap={34}>
        <Text>body</Text>
      </Inset>
    );

    emit('keyboardWillShow', 300);

    expect(view.toJSON()).toMatchObject({
      props: { style: [undefined, { paddingBottom: 266 }] },
    });
  });

  it('stops listening when it unmounts', () => {
    const { render, Text, Inset } = load(installedPeer);
    const view = render(
      <Inset>
        <Text>body</Text>
      </Inset>
    );
    expect(mockListeners.get('keyboardWillHide')?.size).toBe(1);

    view.unmount();

    expect(
      [...mockListeners.values()].every((listeners) => listeners.size === 0)
    ).toBe(true);
  });

  it.each<[string, Peer]>([
    [
      'is not installed',
      () => {
        throw new Error('Cannot find module');
      },
    ],
    ['predates 1.15', peer114],
  ])('renders without avoidance and warns once when the peer %s', (_, peer) => {
    const { render, Text, Inset } = load(peer);

    const view = render(
      <>
        <Inset>
          <Text>one</Text>
        </Inset>
        <Inset>
          <Text>two</Text>
        </Inset>
      </>
    );

    expect(view.getByText('one')).toBeTruthy();
    expect(view.getByText('two')).toBeTruthy();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('react-native-keyboard-controller')
    );
  });
});
