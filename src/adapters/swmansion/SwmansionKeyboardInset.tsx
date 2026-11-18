import { useEffect, useState } from 'react';

// Minimal shape of the bits we use — typed locally so the lib does not need the
// optional peer installed to typecheck (matching the react-native-modal /
// actions-sheet adapters, which `require` uninstalled peers untyped).
interface KeyboardControllerModule {
  KeyboardEvents: {
    addListener: (
      name: 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidHide',
      callback: (event: { height: number }) => void
    ) => { remove: () => void };
  };
  KeyboardController: {
    isVisible: () => boolean;
    state: () => { height: number };
  };
}

// The optional peer can be absent when keyboard avoidance is unused.
let keyboardController: Partial<KeyboardControllerModule> | null;
try {
  keyboardController =
    require('react-native-keyboard-controller') as Partial<KeyboardControllerModule>;
} catch {
  keyboardController = null;
}

// isVisible() and state() require 1.15, above the optional peer range.
const isKeyboardControllerUsable =
  typeof keyboardController?.KeyboardEvents?.addListener === 'function' &&
  typeof keyboardController?.KeyboardController?.isVisible === 'function' &&
  typeof keyboardController?.KeyboardController?.state === 'function';

const keyboard = isKeyboardControllerUsable
  ? (keyboardController as KeyboardControllerModule)
  : null;
let hasWarnedMissingPeer = false;

function getKeyboardHeight() {
  const controller = keyboard?.KeyboardController;
  return controller?.isVisible() ? controller.state().height : 0;
}

export function useSwmansionKeyboardHeight(enabled: boolean) {
  const [keyboardHeight, setKeyboardHeight] = useState(() =>
    enabled ? getKeyboardHeight() : 0
  );
  useEffect(() => {
    if (!enabled) return;
    if (!keyboard) {
      if (__DEV__ && !hasWarnedMissingPeer) {
        hasWarnedMissingPeer = true;
        console.warn(
          '[SwmansionSheetAdapter] keyboardBehavior="inset" requires ' +
            'react-native-keyboard-controller >= 1.15. Rendering without ' +
            'keyboard avoidance.'
        );
      }
      return;
    }

    const { KeyboardEvents } = keyboard;
    const subscriptions = [
      KeyboardEvents.addListener('keyboardWillShow', (event) =>
        setKeyboardHeight(event.height)
      ),
      KeyboardEvents.addListener('keyboardWillHide', () =>
        setKeyboardHeight(0)
      ),
      KeyboardEvents.addListener('keyboardDidHide', () => setKeyboardHeight(0)),
    ];
    // Catch a keyboard change between the initial render and subscription.
    setKeyboardHeight(getKeyboardHeight());
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [enabled]);

  return enabled ? keyboardHeight : 0;
}
