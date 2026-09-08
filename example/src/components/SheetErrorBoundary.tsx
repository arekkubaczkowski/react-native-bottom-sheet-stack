import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CustomModalAdapter,
  useBottomSheetContext,
  type SheetWrapperProps,
} from 'react-native-bottom-sheet-stack';

import { colors, sharedStyles } from '../styles/theme';
import { Badge } from './Badge';
import { Button, SecondaryButton } from './Button';

/** Replaces the sheet that threw; bound to its ref, so the manager keeps driving it. */
function FallbackSheet({
  sheetRef,
  onRetry,
}: {
  sheetRef: SheetWrapperProps['sheetRef'];
  onRetry: () => void;
}) {
  const { close } = useBottomSheetContext();

  return (
    <CustomModalAdapter ref={sheetRef} contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <Badge label="Fallback" color={colors.error} />
        <Text style={sharedStyles.h1}>This sheet could not be shown</Text>
        <Text style={sharedStyles.text}>
          Its content threw while rendering. The host and every other sheet in
          the stack are untouched — only this one was replaced.
        </Text>
        <View style={styles.actions}>
          <Button title="Retry" onPress={onRetry} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </CustomModalAdapter>
  );
}

/** Module scope on purpose: `QueueItem` is memoized. */
export class SheetErrorBoundary extends Component<
  SheetWrapperProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <FallbackSheet
        sheetRef={this.props.sheetRef}
        onRetry={() => this.setState({ failed: false })}
      />
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
});
