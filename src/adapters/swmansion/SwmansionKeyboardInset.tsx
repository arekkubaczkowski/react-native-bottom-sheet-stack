import { type ReactNode, useEffect, useState } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

// Minimal shape of the bits we use — typed locally so the lib does not need the
// optional peer installed to typecheck (matching the react-native-modal /
// actions-sheet adapters, which `require` uninstalled peers untyped).
interface KeyboardControllerModule {
  KeyboardEvents: {
    addListener: (
      name:
        | 'keyboardWillShow'
        | 'keyboardDidShow'
        | 'keyboardWillHide'
        | 'keyboardDidHide',
      callback: (event: { height: number }) => void
    ) => { remove: () => void };
  };
  KeyboardController: {
    isVisible: () => boolean;
    state: () => { height: number };
  };
}

// `react-native-keyboard-controller` is an optional peer. Resolve it lazily and
// tolerate its absence so the adapter never hard-requires it — keyboard
// avoidance is strictly opt-in via `keyboardBehavior="inset"`. Apps that don't
// use that prop pull in zero extra native code.
let keyboardController: Partial<KeyboardControllerModule> | null;
try {
  keyboardController =
    require('react-native-keyboard-controller') as Partial<KeyboardControllerModule>;
} catch {
  keyboardController = null;
}

// `KeyboardController.state()` arrived in 1.18, so an older install takes the
// fallback rather than throwing on the first render. Module-level constant, so
// the branch in `SwmansionKeyboardInset` is stable for the lifetime of the app
// and never violates the rules of hooks.
const isKeyboardControllerUsable =
  typeof keyboardController?.KeyboardEvents?.addListener === 'function' &&
  typeof keyboardController?.KeyboardController?.state === 'function';

let hasWarnedMissingPeer = false;

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Space the sheet already keeps below its content (a detached sheet's gap). */
  bottomGap?: number;
}

function KeyboardInsetActive({ children, style, bottomGap = 0 }: Props) {
  const { KeyboardController, KeyboardEvents } =
    keyboardController as KeyboardControllerModule;
  const [keyboardHeight, setKeyboardHeight] = useState(() =>
    KeyboardController.isVisible() ? KeyboardController.state().height : 0
  );

  useEffect(() => {
    // Will-hide, not only did-hide: releasing the inset once the keyboard is
    // gone leaves the sheet standing over an empty strip for the whole
    // dismissal.
    const subscriptions = [
      KeyboardEvents.addListener('keyboardWillShow', (event) =>
        setKeyboardHeight(event.height)
      ),
      KeyboardEvents.addListener('keyboardWillHide', () =>
        setKeyboardHeight(0)
      ),
      KeyboardEvents.addListener('keyboardDidHide', () => setKeyboardHeight(0)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [KeyboardEvents]);

  // Pad by the keyboard height: a content-sized sheet re-measures taller (the
  // strip hides behind the keyboard); a fixed-height one (gets `flex: 1` via
  // `style`) shrinks its scroll area above the keyboard instead. A gap the
  // sheet already keeps below itself covers that much of the keyboard.
  const inset = Math.max(0, keyboardHeight - bottomGap);

  return (
    <View style={[style, inset > 0 && { paddingBottom: inset }]}>
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
          'react-native-keyboard-controller >= 1.18. Rendering without ' +
          'keyboard avoidance.'
      );
    }
  }, []);

  return <View style={style}>{children}</View>;
}

/**
 * Pads its content by the on-screen keyboard height. Used by
 * `SwmansionSheetAdapter` for every sheet size when `keyboardBehavior="inset"`.
 *
 * Falls back to a plain wrapper (and a one-time dev warning) when
 * `react-native-keyboard-controller` is missing or older than 1.18.
 */
export function SwmansionKeyboardInset(props: Props) {
  return isKeyboardControllerUsable ? (
    <KeyboardInsetActive {...props} />
  ) : (
    <MissingPeerFallback {...props} />
  );
}
