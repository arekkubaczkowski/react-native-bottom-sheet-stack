import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetManager,
  useOnBeforeClose,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * The three ways out of a sheet that refuses to close, and what each one costs.
 *
 * `close()` asks the interceptor and is refused. `forceClose()` skips it but
 * still animates. `destroyAll()` skips it *and* the animation, dropping the
 * whole group from the store — the teardown primitive, not a close.
 */

export const ForceCloseDemo = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open, destroyAll } = useBottomSheetManager();
  const { close, forceClose, preventDismiss } = useBottomSheetContext();

  const [blocking, setBlocking] = useState(true);
  const [lastResult, setLastResult] = useState('no call yet');

  useOnBeforeClose(({ onCancel, onConfirm }) =>
    blocking ? onCancel() : onConfirm()
  );

  const tryClose = async () => {
    const result = await close();
    setLastResult(
      result.closed
        ? 'close() → closed: true'
        : `close() → closed: false, reason: ${result.reason}`
    );
  };

  return (
    <Sheet ref={ref}>
      <View style={styles.badges}>
        <Badge
          label={blocking ? 'refusing' : 'allowing'}
          color={blocking ? colors.error : colors.success}
        />
        <Badge
          label={`preventDismiss: ${preventDismiss}`}
          color={colors.cyan}
        />
      </View>

      <Text style={sharedStyles.h1}>Force close &amp; teardown</Text>
      <Text style={sharedStyles.text}>
        While this sheet refuses, the swipe-down gesture is disabled too — that
        is `preventDismiss` reaching the adapter.
      </Text>

      <View style={sharedStyles.contextBox}>
        <Text style={sharedStyles.contextTitle}>LAST RESULT</Text>
        <Text style={sharedStyles.contextValue}>{lastResult}</Text>
      </View>

      <View style={styles.toggle}>
        <Text style={sharedStyles.text}>Refuse to close (interceptor)</Text>
        <Switch value={blocking} onValueChange={setBlocking} />
      </View>

      <View style={{ gap: 12 }}>
        <Button title="close() — asks the interceptor" onPress={tryClose} />
        <Button
          title="forceClose() — skips it, still animates"
          style={{ backgroundColor: colors.warningDark }}
          onPress={forceClose}
        />
        <Button
          title="destroyAll() — no animation, no interceptor"
          style={{ backgroundColor: colors.errorDark }}
          onPress={destroyAll}
        />
        <Button
          title="Push a sheet with backdrop={false}"
          style={{ backgroundColor: colors.purpleDark }}
          onPress={() => open(<NoBackdropSheet />, { mode: 'push' })}
        />
        <SecondaryButton
          title="Push another blocking sheet"
          onPress={() => open(<ForceCloseDemo />, { mode: 'push' })}
        />
      </View>
    </Sheet>
  );
});

ForceCloseDemo.displayName = 'ForceCloseDemo';

export const NoBackdropSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref} backdrop={false}>
      <Badge label="backdrop={false}" color={colors.purple} />
      <Text style={sharedStyles.h1}>No backdrop</Text>
      <Text style={sharedStyles.text}>
        The adapter opted out of the manager's dim layer, so the sheet below
        stays at full brightness. Everything else — stacking, scale, close — is
        unchanged.
      </Text>
      <SecondaryButton title="Close" onPress={close} />
    </Sheet>
  );
});

NoBackdropSheet.displayName = 'NoBackdropSheet';

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
