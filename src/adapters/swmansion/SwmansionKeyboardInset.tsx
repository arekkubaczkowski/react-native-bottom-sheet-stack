import { useEffect, useState } from 'react';

// Keep the types local so this optional peer is unnecessary at build time.
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
    const clearHeight = () => setKeyboardHeight(0);
    const subscriptions = [
      KeyboardEvents.addListener('keyboardWillShow', (event) =>
        setKeyboardHeight(event.height)
      ),
      // Follow the hide animation from its start and also handle didHide alone.
      KeyboardEvents.addListener('keyboardWillHide', clearHeight),
      KeyboardEvents.addListener('keyboardDidHide', clearHeight),
    ];
    // Catch a keyboard change between the initial render and subscription.
    setKeyboardHeight(getKeyboardHeight());
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [enabled]);

  return enabled ? keyboardHeight : 0;
}
