import { useLayoutEffect } from 'react';
import { Keyboard } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

type KeyboardFrameHandler = (event: { height: number }) => void;
type UseKeyboardFrames = (
  handlers: {
    onMove: KeyboardFrameHandler;
    onInteractive: KeyboardFrameHandler;
    onEnd: KeyboardFrameHandler;
  },
  deps: unknown[]
) => void;

function loadKeyboardFrames(): UseKeyboardFrames | undefined {
  try {
    const { useGenericKeyboardHandler } =
      require('react-native-keyboard-controller') as {
        useGenericKeyboardHandler?: UseKeyboardFrames;
      };
    return useGenericKeyboardHandler;
  } catch {
    return undefined;
  }
}

const keyboardFrames = loadKeyboardFrames();
const useKeyboardFrames = keyboardFrames ?? (() => {});
let hasWarnedMissingPeer = false;

export function SwmansionKeyboardInset({
  height,
}: {
  height: SharedValue<number>;
}) {
  useLayoutEffect(() => {
    if (keyboardFrames) {
      height.set(Keyboard.metrics()?.height ?? 0);
    } else if (__DEV__ && !hasWarnedMissingPeer) {
      hasWarnedMissingPeer = true;
      console.warn(
        '[SwmansionSheetAdapter] keyboardBehavior="inset" requires ' +
          'react-native-keyboard-controller >= 1.15. Rendering without ' +
          'keyboard avoidance.'
      );
    }
    return () => height.set(0);
  }, [height]);

  const updateHeight: KeyboardFrameHandler = (frame) => {
    'worklet';
    height.set(frame.height);
  };

  // onStart contains the destination, so only use movement and end frames.
  useKeyboardFrames(
    { onMove: updateHeight, onInteractive: updateHeight, onEnd: updateHeight },
    [height]
  );

  return null;
}
