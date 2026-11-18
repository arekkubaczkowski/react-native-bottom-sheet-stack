export {};

type Listener = (event: { height: number }) => void;
type Peer = () => unknown;

const mockListeners = new Map<string, Set<Listener>>();
let mockHeight = 0;

const installedPeer: Peer = () => ({
  KeyboardEvents: {
    addListener: (name: string, listener: Listener) => {
      const listeners = mockListeners.get(name) ?? new Set<Listener>();
      mockListeners.set(name, listeners.add(listener));
      return { remove: () => listeners.delete(listener) };
    },
  },
  KeyboardController: {
    isVisible: () => mockHeight > 0,
    state: () => ({ height: mockHeight }),
  },
});

const peer114: Peer = () => ({
  ...(installedPeer() as object),
  KeyboardController: { dismiss: () => {} },
});

const load = (peer: Peer) => {
  // The optional peer is resolved once at import. Reset React and the renderer too.
  jest.resetModules();
  jest.doMock('react-native-keyboard-controller', peer, { virtual: true });
  const { act, renderHook } =
    require('@testing-library/react-native/pure') as typeof import('@testing-library/react-native/pure');
  const { useSwmansionKeyboardHeight } =
    require('../adapters/swmansion/SwmansionKeyboardInset') as typeof import('../adapters/swmansion/SwmansionKeyboardInset');

  return {
    emit: (name: string, height: number) =>
      act(() => {
        mockHeight = height;
        mockListeners.get(name)?.forEach((listener) => listener({ height }));
      }),
    renderHeight: (enabled = true) =>
      renderHook(useSwmansionKeyboardHeight, { initialProps: enabled }),
  };
};

beforeEach(() => {
  mockListeners.clear();
  mockHeight = 0;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSwmansionKeyboardHeight', () => {
  it('reports the height from the start of show until the start of hide', () => {
    const { emit, renderHeight } = load(installedPeer);
    const { result, unmount } = renderHeight();

    emit('keyboardWillShow', 300);
    expect(result.current).toBe(300);

    emit('keyboardWillHide', 0);
    expect(result.current).toBe(0);
    unmount();
  });

  it('starts with the current height if the keyboard is visible', () => {
    mockHeight = 280;
    const { renderHeight } = load(installedPeer);
    const { result, unmount } = renderHeight();

    expect(result.current).toBe(280);
    unmount();
  });

  it('reads the current height when enabled and unsubscribes when disabled', () => {
    const { emit, renderHeight } = load(installedPeer);
    const { result, rerender, unmount } = renderHeight(false);
    emit('keyboardWillShow', 300);
    expect(result.current).toBe(0);
    expect(mockListeners.size).toBe(0);

    rerender(true);
    expect(result.current).toBe(300);
    expect(mockListeners.get('keyboardWillShow')?.size).toBe(1);

    rerender(false);
    expect(result.current).toBe(0);
    expect(mockListeners.get('keyboardWillShow')?.size).toBe(0);
    unmount();
  });

  it('removes all its listeners on unmount', () => {
    const { renderHeight } = load(installedPeer);
    const { unmount } = renderHeight();
    expect(mockListeners.get('keyboardWillHide')?.size).toBe(1);

    unmount();

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
  ])('returns zero and only warns when enabled if the peer %s', (_, peer) => {
    const { renderHeight } = load(peer);
    const first = renderHeight(false);
    expect(first.result.current).toBe(0);
    expect(console.warn).not.toHaveBeenCalled();

    first.rerender(true);
    const second = renderHeight();
    expect(first.result.current).toBe(0);
    expect(second.result.current).toBe(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('react-native-keyboard-controller')
    );
    first.unmount();
    second.unmount();
  });
});
