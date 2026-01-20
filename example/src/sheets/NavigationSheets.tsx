import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetManager,
  useBottomSheetState,
} from 'react-native-bottom-sheet-stack';

import { Button, SecondaryButton, Sheet } from '../components';
import { sharedStyles } from '../styles/theme';

export const SheetA = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref}>
      <Text style={sharedStyles.h1}>Navigation Flow</Text>
      <Text style={sharedStyles.text}>
        This demo shows different navigation modes. Use "Switch" to replace this
        sheet while keeping it in the stack (you can go back).
      </Text>
      <View style={{ gap: 12 }}>
        <Button
          title="Switch to Sheet B"
          onPress={() => openBottomSheet(<SheetB />, { mode: 'switch' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetA.displayName = 'SheetA';

export const SheetB = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref}>
      <Text style={sharedStyles.h1}>Sheet B</Text>
      <Text style={sharedStyles.text}>
        This sheet was opened with "Switch" mode. Sheet A is hidden but still in
        the stack. Use "Push" to add a new sheet on top.
      </Text>
      <View style={{ gap: 12 }}>
        <Button
          title="Push Sheet C"
          onPress={() => openBottomSheet(<SheetC />, { mode: 'push' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetB.displayName = 'SheetB';

export const SheetC = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <Sheet ref={ref}>
      <Text style={sharedStyles.h1}>Sheet C</Text>
      <Text style={sharedStyles.text}>
        This sheet was "Pushed" on top. Use "Replace" to swap this sheet with a
        new one (removes this from stack).
      </Text>
      <View style={{ gap: 12 }}>
        <Button
          title="Replace with Sheet D"
          onPress={() => openBottomSheet(<SheetD />, { mode: 'replace' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetC.displayName = 'SheetC';

export const SheetD = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();

  return (
    <Sheet ref={ref}>
      <Text style={sharedStyles.h1}>Sheet D</Text>
      <Text style={sharedStyles.text}>
        This sheet "Replaced" Sheet C. Sheet C is no longer in the stack. Close
        this to go back to Sheet B.
      </Text>
      <View style={{ gap: 12 }}>
        <Button title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetD.displayName = 'SheetD';
