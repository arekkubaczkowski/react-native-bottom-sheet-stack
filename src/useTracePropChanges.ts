import { useEffect, useRef } from 'react';

export function useTracePropChanges(
  componentName: string,
  props: Record<string, any>
) {
  const prevProps = useRef(props);

  useEffect(() => {
    const allKeys = Object.keys({ ...props, ...prevProps.current });
    allKeys.forEach((key) => {
      if (prevProps.current[key] !== props[key]) {
        console.log(`[${componentName}] Prop '${key}' changed.`);
        if (
          typeof props[key] === 'object' ||
          typeof props[key] === 'function'
        ) {
          console.log(
            `[${componentName}] New instance detected for prop '${key}'.`
          );
        }
      }
    });

    prevProps.current = props;
  });
}
