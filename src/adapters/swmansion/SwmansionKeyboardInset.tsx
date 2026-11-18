import { useLayoutEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

// Keep the types local so this optional peer is unnecessary at build time.
interface KeyboardControllerModule {
  KeyboardEvents: {
    addListener: (
      name: 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidHide',
      callback: (event: { height: number; duration: number }) => void
    ) => { remove: () => void };
  };
  KeyboardController: {
    isVisible: () => boolean;
    state: () => { height: number } | null;
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
  return controller?.isVisible() ? (controller.state()?.height ?? 0) : 0;
}

export function useSwmansionKeyboardHeight(enabled: boolean) {
  const keyboardHeight = useSharedValue(0);
  useLayoutEffect(() => {
    if (!enabled) {
      keyboardHeight.set(0);
      return;
    }
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
      KeyboardEvents.addListener('keyboardWillShow', ({ height, duration }) =>
        keyboardHeight.set(
          withTiming(height, { duration: Math.max(0, duration) })
        )
      ),
      KeyboardEvents.addListener('keyboardWillHide', ({ duration }) =>
        keyboardHeight.set(withTiming(0, { duration: Math.max(0, duration) }))
      ),
      KeyboardEvents.addListener('keyboardDidHide', () =>
        keyboardHeight.set(0)
      ),
    ];
    // Catch a keyboard change between the initial render and subscription.
    keyboardHeight.set(getKeyboardHeight());
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [enabled, keyboardHeight]);

  return keyboardHeight;
}
