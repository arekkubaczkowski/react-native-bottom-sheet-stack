import { useCallback, useLayoutEffect, useRef } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: No better alternative available.
type CallbackType = (...args: any[]) => any;

/**
 * Stable function identity with an always-fresh closure.
 *
 * Named `useStableCallback` rather than `useEvent` (the RFC's name) because
 * `react-native-reanimated` exports an unrelated `useEvent` for native event
 * handlers, and adapters import both.
 *
 * RFC: https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
 */
export const useStableCallback = <T extends CallbackType>(callback: T) => {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // The one sanctioned `useCallback` in the codebase: identity *is* the feature
  // here, not an optimisation the compiler could reproduce.
  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    return callbackRef.current(...args);
  }, []);
};
