import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { Alert, Switch, Text, TextInput, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetManager,
  useOnBeforeClose,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * Root sheet that demonstrates closeAll() with cascading animation
 */
export const CloseInterceptionDemo = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { open, closeAll } = useBottomSheetManager();
    const { close } = useBottomSheetContext();

    const handleCloseAll = () => {
      closeAll({ stagger: 150 });
    };

    return (
      <Sheet ref={ref}>
        <Badge label="Demo Root" color={colors.primary} />
        <Text style={sharedStyles.h1}>Close Interception</Text>
        <Text style={sharedStyles.text}>
          This demo shows how{' '}
          <Text style={{ fontWeight: '600' }}>onBeforeClose</Text> interceptors
          can prevent sheets from closing, and how{' '}
          <Text style={{ fontWeight: '600' }}>closeAll()</Text>
          cascades with stagger animation.
        </Text>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Features</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            🔒 <Text style={{ fontWeight: '600' }}>Unsaved Changes</Text> -
            Prompts before closing
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            🌊 <Text style={{ fontWeight: '600' }}>Cascade Close</Text> -
            Top-to-bottom animation
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            🛑 <Text style={{ fontWeight: '600' }}>Block Cascade</Text> - Stops
            at interceptor
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          <Button
            title="Open Form Sheet (Has Interceptor)"
            onPress={() =>
              open(<FormSheet />, { mode: 'push', scaleBackground: true })
            }
          />
          <Button
            title="Open Read-Only Sheet"
            onPress={() =>
              open(<ReadOnlySheet />, { mode: 'push', scaleBackground: true })
            }
          />
          <Button
            title="🌊 Close All (Cascade)"
            style={{ backgroundColor: colors.warning }}
            onPress={handleCloseAll}
          />
          <SecondaryButton title="Close This Sheet" onPress={close} />
        </View>
      </Sheet>
    );
  }
);

CloseInterceptionDemo.displayName = 'CloseInterceptionDemo';

/**
 * Form sheet with unsaved changes - demonstrates onBeforeClose interceptor
 */
export const FormSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open, closeAll } = useBottomSheetManager();
  const { close } = useBottomSheetContext();
  const [text, setText] = useState('');
  const [hasInterceptor, setHasInterceptor] = useState(true);

  const isDirty = text.trim().length > 0;

  // Register interceptor that prompts if there are unsaved changes
  useOnBeforeClose(({ onConfirm, onCancel }) => {
    if (!hasInterceptor) {
      onConfirm();
      return;
    }

    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved text. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onConfirm,
          },
        ]
      );
    } else {
      onConfirm();
    }
  });

  const handleCloseAll = () => {
    closeAll({ stagger: 150 });
  };

  return (
    <Sheet ref={ref}>
      <Badge label="Form Sheet" color={colors.warning} />
      <Text style={sharedStyles.h1}>Unsaved Changes</Text>
      <Text style={sharedStyles.text}>
        Try typing below, then close or use "Close All". The interceptor will
        prompt you to confirm. Notice how the cascade waits for your decision!
      </Text>

      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Interceptor Settings</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={sharedStyles.scaleInfoItem}>
            {hasInterceptor
              ? '🔒 Interceptor Active'
              : '✅ Interceptor Disabled'}
          </Text>
          <Switch
            value={hasInterceptor}
            onValueChange={setHasInterceptor}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
        {isDirty && (
          <Text
            style={[
              sharedStyles.scaleInfoItem,
              { color: colors.warning, marginTop: 4 },
            ]}
          >
            ⚠️ Unsaved changes detected
          </Text>
        )}
      </View>

      <TextInput
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 16,
          color: colors.text,
          fontSize: 15,
          minHeight: 100,
          textAlignVertical: 'top',
          marginTop: 16,
        }}
        placeholder="Type something here..."
        placeholderTextColor={colors.textMuted}
        multiline
        value={text}
        onChangeText={setText}
      />

      <View style={{ gap: 12, marginTop: 20 }}>
        <Button
          title="Push Another Form"
          onPress={() =>
            open(<FormSheet />, { mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="Push Read-Only Sheet"
          onPress={() =>
            open(<ReadOnlySheet />, { mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="🌊 Close All"
          style={{ backgroundColor: colors.warning }}
          onPress={handleCloseAll}
        />
        <SecondaryButton title="Try to Close" onPress={close} />
      </View>
    </Sheet>
  );
});

FormSheet.displayName = 'FormSheet';

/**
 * Read-only sheet without interceptor - closes immediately
 */
export const ReadOnlySheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open, closeAll } = useBottomSheetManager();
  const { close } = useBottomSheetContext();

  const handleCloseAll = () => {
    closeAll({ stagger: 150 });
  };

  return (
    <Sheet ref={ref}>
      <Badge label="Read-Only" color={colors.success} />
      <Text style={sharedStyles.h1}>No Interceptor</Text>
      <Text style={sharedStyles.text}>
        This sheet has no{' '}
        <Text style={{ fontWeight: '600' }}>onBeforeClose</Text> interceptor, so
        it closes immediately without confirmation.
      </Text>

      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Try This</Text>
        <Text style={sharedStyles.scaleInfoItem}>
          1. Stack multiple sheets (forms + read-only)
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>2. Type in a form sheet</Text>
        <Text style={sharedStyles.scaleInfoItem}>
          3. Click "Close All" to see cascade animation
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          4. Watch cascade stop at form with changes
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 20 }}>
        <Button
          title="Push Form Sheet"
          onPress={() =>
            open(<FormSheet />, { mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="Push Another Read-Only"
          onPress={() =>
            open(<ReadOnlySheet />, { mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="🌊 Close All"
          style={{ backgroundColor: colors.warning }}
          onPress={handleCloseAll}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

ReadOnlySheet.displayName = 'ReadOnlySheet';
