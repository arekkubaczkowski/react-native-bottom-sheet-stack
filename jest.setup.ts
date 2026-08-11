/**
 * Test setup.
 *
 * Reanimated is replaced with a minimal shared-value implementation rather than
 * transformed and run for real. The store and coordinator only ever use shared
 * values as a place to put a number, so running the animation engine here would
 * add ESM transform config, worklet plumbing and frame timing to tests that are
 * about state transitions — and would make them depend on animation behaviour
 * they are not asserting.
 *
 * Adapter-level tests that genuinely need animation behaviour should mock at a
 * narrower scope instead of relying on this.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const makeMutable = <T>(initial: T) => {
    let current = initial;
    return {
      get value() {
        return current;
      },
      set value(next: T) {
        current = next;
      },
      get: () => current,
      set: (next: T) => {
        current = next;
      },
      addListener: jest.fn(),
      removeListener: jest.fn(),
      modify: jest.fn(),
    };
  };

  return {
    __esModule: true,
    // `Animated.View` passes through to a plain RN `View`, so a component that
    // renders one (the backdrop, `ScaleWrapper`) can be rendered in a test and
    // its resolved styles asserted on.
    default: {
      View: (props: Record<string, unknown>) =>
        React.createElement(View, props),
    },
    makeMutable,
    // Timing/spring helpers resolve to their target value: tests assert where a
    // value lands, not how it travels.
    withTiming: <T>(toValue: T) => toValue,
    withSpring: <T>(toValue: T) => toValue,
    useSharedValue: makeMutable,
    useDerivedValue: jest.fn(),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedReaction: jest.fn(),
    useEvent: jest.fn(),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp' },
  };
});

/**
 * `react-native-teleport` ships ESM and is only ever used as plumbing here:
 * `PortalProvider` wraps the tree, `Portal`/`PortalHost` move content between
 * two points. Tests in this repo assert store transitions and hook contracts,
 * not teleportation, so the components render their children in place.
 *
 * A test that genuinely exercises portal behaviour should unmock this.
 */
jest.mock('react-native-teleport', () => {
  const React = require('react');
  const passthrough =
    (name: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, { key: name }, children);

  return {
    __esModule: true,
    PortalProvider: passthrough('PortalProvider'),
    Portal: passthrough('Portal'),
    PortalHost: () => null,
  };
});
