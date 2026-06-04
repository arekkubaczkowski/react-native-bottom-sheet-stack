import { type ReactNode, useEffect } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

// Minimal shape of the bits we use — typed locally so the lib does not need the
// optional peer installed to typecheck (matching the react-native-modal /
// actions-sheet adapters, which `require` uninstalled peers untyped).
interface KeyboardControllerModule {
  useKeyboardState: <T>(selector: (state: { height: number }) => T) => T;
}

// `react-native-keyboard-controller` is an optional peer. Resolve it lazily and
// tolerate its absence so the adapter never hard-requires it — keyboard
// avoidance is strictly opt-in via `keyboardBehavior="inset"`. Apps that don't
// use that prop pull in zero extra native code.
let keyboardController: KeyboardControllerModule | null;
try {
  keyboardController =
    require('react-native-keyboard-controller') as KeyboardControllerModule;
} catch {
  keyboardController = null;
}

// Whether the optional peer is installed. Module-level constant, so the branch
// in `SwmansionKeyboardInset` is stable for the lifetime of the app and never
// violates the rules of hooks.
const isKeyboardControllerAvailable = keyboardController !== null;

let hasWarnedMissingPeer = false;

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function KeyboardInsetActive({ children, style }: Props) {
  // Pad by the keyboard height: a content-sized sheet re-measures taller (the
  // strip hides behind the keyboard); a fixed-height one (gets `flex: 1` via
  // `style`) shrinks its scroll area above the keyboard instead.
  const keyboardHeight = keyboardController!.useKeyboardState(
    (state) => state.height
  );

  return (
    <View
      style={[style, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
    >
      {children}
    </View>
  );
}

function MissingPeerFallback({ children, style }: Props) {
  // Warn from an effect (not during render) so the one-time flag mutation is a
  // legal side effect under the React Compiler.
  useEffect(() => {
    if (__DEV__ && !hasWarnedMissingPeer) {
      hasWarnedMissingPeer = true;
      console.warn(
        '[SwmansionSheetAdapter] keyboardBehavior="inset" requires ' +
          'react-native-keyboard-controller to be installed. Rendering without ' +
          'keyboard avoidance.'
      );
    }
  }, []);

  return <View style={style}>{children}</View>;
}

/**
 * Grows its content by the on-screen keyboard height. Used by
 * `SwmansionSheetAdapter` for content-sized sheets when `keyboardBehavior="inset"`.
 *
 * Falls back to a plain wrapper (and a one-time dev warning) when
 * `react-native-keyboard-controller` is not installed, so the feature degrades
 * gracefully instead of crashing.
 */
export function SwmansionKeyboardInset(props: Props) {
  return isKeyboardControllerAvailable ? (
    <KeyboardInsetActive {...props} />
  ) : (
    <MissingPeerFallback {...props} />
  );
}
