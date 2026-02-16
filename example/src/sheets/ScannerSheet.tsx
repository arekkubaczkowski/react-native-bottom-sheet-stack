import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { ScannerNestedSheet1 } from './ScannerNestedSheets';
import { colors, sharedStyles } from '../styles/theme';

export const ScannerSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close, params } = useBottomSheetContext<'scanner-sheet'>();
  const { open } = useBottomSheetManager();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const title = params?.title ?? 'QR Scanner';
  const sourceLabel =
    params?.source === 'navigation' ? 'From Navigation' : 'From Home';

  const handleStartScan = useCallback(() => {
    setIsScanning(true);
    setScanResult(null);

    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(
        `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      );
    }, 2000);
  }, []);

  const handleReset = useCallback(() => {
    setIsScanning(false);
    setScanResult(null);
  }, []);

  return (
    <Sheet ref={ref} enableDynamicSizing>
      <View style={styles.badgeRow}>
        <Badge label="Persistent" color={colors.cyan} />
        <Badge
          label={sourceLabel}
          color={
            params?.source === 'navigation' ? colors.purple : colors.primary
          }
        />
      </View>
      <Text style={sharedStyles.h1}>{title}</Text>
      <Text style={sharedStyles.text}>
        This sheet is always mounted (keepMounted). It opens instantly without
        mount delay and preserves state between open/close cycles.
      </Text>

      {/* Scanner viewport */}
      <View style={styles.scannerViewport}>
        {isScanning ? (
          <View style={styles.scanningOverlay}>
            <View style={styles.scanLine} />
            <Text style={styles.scanningText}>Scanning...</Text>
          </View>
        ) : scanResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Scanned Code:</Text>
            <Text style={styles.resultValue}>{scanResult}</Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>[ ]</Text>
            <Text style={styles.placeholderText}>Ready to scan</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {scanResult ? (
          <>
            <Button title="Scan Again" onPress={handleReset} />
            <Button
              title="Open Nested Sheet"
              onPress={() =>
                open(<ScannerNestedSheet1 />, {
                  scaleBackground: true,
                  mode: 'switch',
                })
              }
            />
            <SecondaryButton title="Close" onPress={close} />
          </>
        ) : (
          <>
            <Button
              title={isScanning ? 'Scanning...' : 'Start Scan'}
              onPress={isScanning ? () => {} : handleStartScan}
            />
            <Button
              title="Open Nested Sheet"
              onPress={() =>
                open(<ScannerNestedSheet1 />, {
                  scaleBackground: true,
                  mode: 'switch',
                })
              }
            />
            <SecondaryButton title="Close" onPress={close} />
          </>
        )}
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Try closing and reopening - the sheet appears instantly because it's
          pre-mounted with keepMounted flag.
        </Text>
      </View>
    </Sheet>
  );
});

ScannerSheet.displayName = 'ScannerSheet';

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scannerViewport: {
    height: 180,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanLine: {
    width: '80%',
    height: 2,
    backgroundColor: colors.cyan,
    marginBottom: 16,
  },
  scanningText: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: {
    color: colors.success,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    color: colors.textMuted,
    marginBottom: 8,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
