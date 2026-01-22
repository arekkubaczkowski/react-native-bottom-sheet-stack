import { useCallback, useLayoutEffect, useRef } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: No better alternative available.
type CallbackType = (...args: any[]) => any;

// RFC: https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
export const useEvent = <T extends CallbackType>(callback: T) => {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    return callbackRef.current(...args);
  }, []);
};
