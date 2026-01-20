import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetManager,
  useBottomSheetState,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

export const NestedSheet1 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref} snapPoints={['50%']} backgroundColor={colors.nested1}>
      <Badge label="Level 1" />
      <Text style={sharedStyles.h1}>Nested Scale</Text>
      <Text style={sharedStyles.text}>
        This demo shows the cascading scale effect. Each new sheet scales down
        the ones below it, creating a depth effect.
      </Text>
      <View style={{ gap: 12, marginTop: 'auto' }}>
        <Button
          title="Open Level 2"
          onPress={() =>
            openBottomSheet(<NestedSheet2 />, {
              mode: 'push',
              scaleBackground: true,
            })
          }
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

NestedSheet1.displayName = 'NestedSheet1';

export const NestedSheet2 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref} snapPoints={['48%']} backgroundColor={colors.nested2}>
      <Badge label="Level 2" color={colors.purple} />
      <Text style={sharedStyles.h1}>Going Deeper</Text>
      <Text style={sharedStyles.text}>
        Notice how Level 1 is now scaled down behind this sheet. The background
        content also remains scaled. Open Level 3 to see even more depth.
      </Text>
      <View style={{ gap: 12, marginTop: 'auto' }}>
        <Button
          title="Open Level 3"
          onPress={() =>
            openBottomSheet(<NestedSheet3 />, {
              mode: 'push',
              scaleBackground: true,
            })
          }
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

NestedSheet2.displayName = 'NestedSheet2';

export const NestedSheet3 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref} snapPoints={['100%']} backgroundColor={colors.nested3}>
      <Badge label="Level 3" color={colors.pink} />
      <Text style={sharedStyles.h1}>Maximum Depth</Text>
      <Text style={sharedStyles.text}>
        You're now 3 levels deep. Each sheet behind is progressively more
        scaled, creating a visual stack effect. Close sheets to go back.
      </Text>
      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Current Scale Values</Text>
        <Text style={sharedStyles.scaleInfoItem}>Background: scale²</Text>
        <Text style={sharedStyles.scaleInfoItem}>Level 1: scale²</Text>
        <Text style={sharedStyles.scaleInfoItem}>Level 2: scale¹</Text>
        <Text style={sharedStyles.scaleInfoItem}>Level 3: no scale</Text>
      </View>
      <View style={{ gap: 12, marginTop: 'auto' }}>
        <Button title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

NestedSheet3.displayName = 'NestedSheet3';
