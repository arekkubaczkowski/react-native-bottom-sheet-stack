import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useBottomSheetContext } from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/** Throws after it has opened — the case the wrapper exists for. */
export const ErrorBoundaryDemoSheet = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { close } = useBottomSheetContext();
    const [crashed, setCrashed] = useState(false);

    if (crashed) {
      throw new Error('ErrorBoundaryDemoSheet failed to render');
    }

    return (
      <Sheet ref={ref}>
        <Badge label="Inline" color={colors.error} />
        <Text style={sharedStyles.h1}>Sheet error boundary</Text>
        <Text style={sharedStyles.text}>
          The default host wraps every inline sheet in `SheetErrorBoundary`.
          Crash this one and a fallback sheet takes its place, bound to the same
          ref — Retry remounts this content, Close animates the sheet out.
          Nothing else in the stack notices.
        </Text>

        <View style={{ gap: 12, marginTop: 8 }}>
          <Button
            title="Crash this sheet's body"
            onPress={() => setCrashed(true)}
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </Sheet>
    );
  }
);

ErrorBoundaryDemoSheet.displayName = 'ErrorBoundaryDemoSheet';
