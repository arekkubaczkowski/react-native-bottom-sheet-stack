import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  useBottomSheetStore,
  __getAllAnimatedIndexes,
} from 'react-native-bottom-sheet-stack';

interface LogEntry {
  timestamp: number;
  type:
    | 'open'
    | 'close'
    | 'status'
    | 'animatedIndex'
    | 'error'
    | 'cleanup'
    | 'valueChange';
  sheetId: string;
  message: string;
  value?: unknown;
}

const MAX_LOGS = 200;
const logHistory: LogEntry[] = [];

// Track previous animatedIndex values for change detection
const previousValues = new Map<string, number>();

// Track cleanup calls
let cleanupCount = 0;
let ensureCount = 0;

export function addDebugLog(
  type: LogEntry['type'],
  sheetId: string,
  message: string,
  value?: unknown
) {
  logHistory.unshift({
    timestamp: Date.now(),
    type,
    sheetId,
    message,
    value,
  });
  if (logHistory.length > MAX_LOGS) {
    logHistory.pop();
  }
}

// Functions to be called from animatedRegistry to track cleanup/ensure
export function trackCleanup(sheetId: string) {
  cleanupCount++;
  addDebugLog('cleanup', sheetId, `Cleanup called (total: ${cleanupCount})`);
}

export function trackEnsure(sheetId: string, value: number) {
  ensureCount++;
  addDebugLog(
    'animatedIndex',
    sheetId,
    `Ensure called (total: ${ensureCount})`,
    { initialValue: value }
  );
}

// Poll all animatedIndex values and log changes
function pollAnimatedIndexValues() {
  const registry = __getAllAnimatedIndexes();

  registry.forEach((animatedIndex, key) => {
    const currentValue = animatedIndex.value;
    const previousValue = previousValues.get(key);

    // Log if value changed significantly (more than 0.01)
    if (
      previousValue === undefined ||
      Math.abs(currentValue - previousValue) > 0.01
    ) {
      // Especially log if value went to 0 or very close to 0
      if (
        currentValue >= -0.1 &&
        currentValue <= 0.1 &&
        (previousValue === undefined ||
          previousValue < -0.5 ||
          previousValue > 0.5)
      ) {
        addDebugLog(
          'valueChange',
          key,
          `⚠️ VALUE JUMPED TO ~0! ${previousValue?.toFixed(4) ?? 'N/A'} -> ${currentValue.toFixed(4)}`
        );
      } else if (previousValue !== undefined) {
        addDebugLog(
          'valueChange',
          key,
          `Value: ${previousValue.toFixed(4)} -> ${currentValue.toFixed(4)}`
        );
      }
      previousValues.set(key, currentValue);
    }
  });

  // Check for keys that were removed
  previousValues.forEach((_, key) => {
    if (!registry.has(key)) {
      addDebugLog('cleanup', key, `Key removed from registry`);
      previousValues.delete(key);
    }
  });
}

export function BottomSheetDebugMonitor() {
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { sheetsById, stackOrder } = useBottomSheetStore();

  const pan = useRef(new Animated.ValueXY({ x: 20, y: 100 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Poll animatedIndex values every 50ms to catch rapid changes
  useEffect(() => {
    const interval = setInterval(pollAnimatedIndexValues, 50);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to store changes to log them
  useEffect(() => {
    const unsubscribe = useBottomSheetStore.subscribe(
      (state) => ({
        sheetsById: state.sheetsById,
        stackOrder: state.stackOrder,
      }),
      (current, previous) => {
        // Detect new sheets
        Object.keys(current.sheetsById).forEach((id) => {
          const currentSheet = current.sheetsById[id];
          const previousSheet = previous.sheetsById[id];

          if (!previousSheet && currentSheet) {
            addDebugLog(
              'open',
              id,
              `Sheet created with status: ${currentSheet.status}`
            );
          } else if (
            previousSheet &&
            currentSheet &&
            previousSheet.status !== currentSheet.status
          ) {
            addDebugLog(
              'status',
              id,
              `Status: ${previousSheet.status} -> ${currentSheet.status}`
            );
          }
        });

        // Detect removed sheets
        Object.keys(previous.sheetsById).forEach((id) => {
          if (!current.sheetsById[id]) {
            addDebugLog('close', id, 'Sheet removed from store');
          }
        });

        // Detect stack changes
        if (
          JSON.stringify(current.stackOrder) !==
          JSON.stringify(previous.stackOrder)
        ) {
          addDebugLog(
            'status',
            'stack',
            `Stack: [${current.stackOrder.join(', ')}]`
          );
        }
      }
    );

    return unsubscribe;
  }, []);

  // Auto refresh when modal is open
  useEffect(() => {
    if (modalVisible) {
      const interval = setInterval(() => setRefreshKey((k) => k + 1), 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [modalVisible]);

  const sheetCount = Object.keys(sheetsById).length;
  const activeCount = stackOrder.length;

  const generateStatsText = () => {
    const registry = __getAllAnimatedIndexes();
    const registryEntries = Array.from(registry.entries());

    let text = '=== BOTTOM SHEET DEBUG STATS ===\n\n';
    text += `Timestamp: ${new Date().toISOString()}\n\n`;

    // Counters
    text += '--- COUNTERS ---\n';
    text += `ensureAnimatedIndex calls: ${ensureCount}\n`;
    text += `cleanupAnimatedIndex calls: ${cleanupCount}\n`;
    text += `Registry size: ${registryEntries.length}\n`;
    text += `Store sheets: ${Object.keys(sheetsById).length}\n`;
    text += `Stack size: ${stackOrder.length}\n\n`;

    // Stack Order
    text += '--- STACK ORDER ---\n';
    text += `[${stackOrder.join(', ') || 'empty'}]\n\n`;

    // Sheets in Store with key matching
    text += '--- SHEETS IN STORE ---\n';
    Object.entries(sheetsById).forEach(([id, sheet]) => {
      // Calculate the registry key that SHOULD be used
      const expectedKey = sheet.portalSession
        ? `${id}-${sheet.portalSession}`
        : id;
      const animatedIndexByExpectedKey = registry.get(expectedKey);
      const animatedIndexById = registry.get(id);

      text += `\n[${id}]\n`;
      text += `  status: ${sheet.status}\n`;
      text += `  usePortal: ${sheet.usePortal}\n`;
      text += `  keepMounted: ${sheet.keepMounted}\n`;
      text += `  portalSession: ${sheet.portalSession}\n`;
      text += `  inStack: ${stackOrder.includes(id)}\n`;
      text += `  expectedRegistryKey: ${expectedKey}\n`;
      text += `  animatedIndex (by expectedKey): ${animatedIndexByExpectedKey ? animatedIndexByExpectedKey.value.toFixed(6) : 'N/A'}\n`;
      text += `  animatedIndex (by id only): ${animatedIndexById ? animatedIndexById.value.toFixed(6) : 'N/A'}\n`;
      text += `  KEY MATCH: ${animatedIndexByExpectedKey ? 'YES' : 'NO - MISMATCH!'}\n`;
    });

    // AnimatedIndex Registry
    text += '\n--- ANIMATED INDEX REGISTRY ---\n';
    text += `Total entries: ${registryEntries.length}\n`;
    if (registryEntries.length === 0) {
      text += 'Empty\n';
    } else {
      registryEntries.forEach(([key, animatedIndex]) => {
        // Parse the key to find base id and session
        const parts = key.split('-');
        const possibleSession = parts[parts.length - 1];
        const isSessionKey = !isNaN(Number(possibleSession));
        const baseId = isSessionKey ? parts.slice(0, -1).join('-') : key;

        const sheetInStore = sheetsById[baseId];
        const expectedByStore = sheetInStore?.portalSession
          ? `${baseId}-${sheetInStore.portalSession}`
          : baseId;

        text += `\n[${key}]\n`;
        text += `  value: ${animatedIndex.value.toFixed(6)}\n`;
        text += `  baseId: ${baseId}\n`;
        text += `  isSessionKey: ${isSessionKey}\n`;
        text += `  sheetInStore: ${sheetInStore ? 'YES' : 'NO'}\n`;
        if (sheetInStore) {
          text += `  store.portalSession: ${sheetInStore.portalSession}\n`;
          text += `  expectedKeyByStore: ${expectedByStore}\n`;
          text += `  KEYS MATCH: ${key === expectedByStore ? 'YES' : 'NO - STALE KEY!'}\n`;
        } else {
          text += `  STATUS: ORPHAN (no sheet in store)\n`;
        }
      });
    }

    // Log History (last 50, filtered to show important events)
    text += '\n--- LOG HISTORY (last 50) ---\n';
    logHistory.slice(0, 50).forEach((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
      });
      const ms = log.timestamp % 1000;
      text += `${time}.${ms.toString().padStart(3, '0')} [${log.type}] [${log.sheetId}] ${log.message}`;
      if (log.value !== undefined) {
        text += ` | ${JSON.stringify(log.value)}`;
      }
      text += '\n';
    });

    return text;
  };

  const copyStats = () => {
    const text = generateStatsText();
    Clipboard.setString(text);
    Alert.alert('Copied!', 'Stats copied to clipboard');
  };

  return (
    <>
      {/* Floating Badge */}
      <Animated.View
        style={[
          styles.floatingBadge,
          { transform: pan.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => setModalVisible(true)}
          style={styles.badgeContent}
        >
          <Text style={styles.badgeText}>BS</Text>
          <Text style={styles.badgeCount}>
            {activeCount}/{sheetCount}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Debug Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Bottom Sheet Debug</Text>
            <View style={styles.headerButtons}>
              <Pressable onPress={copyStats} style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </Pressable>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.content} key={refreshKey}>
            {/* Current State */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current State</Text>
              <Text style={styles.label}>Stack Order:</Text>
              <Text style={styles.value}>
                [{stackOrder.join(', ') || 'empty'}]
              </Text>

              <Text style={styles.label}>Sheets ({sheetCount}):</Text>
              {Object.entries(sheetsById).map(([id, sheet]) => {
                const animatedIndexRegistry = __getAllAnimatedIndexes();
                const animatedIndex = animatedIndexRegistry.get(id);
                return (
                  <View key={id} style={styles.sheetItem}>
                    <Text style={styles.sheetId}>{id}</Text>
                    <Text style={styles.sheetDetails}>
                      status: {sheet.status} | portal: {String(sheet.usePortal)}{' '}
                      | keepMounted: {String(sheet.keepMounted)}
                    </Text>
                    <Text style={styles.sheetDetails}>
                      portalSession: {sheet.portalSession} | inStack:{' '}
                      {String(stackOrder.includes(id))}
                    </Text>
                    <Text
                      style={[styles.sheetDetails, styles.animatedIndexValue]}
                    >
                      animatedIndex:{' '}
                      {animatedIndex ? animatedIndex.value.toFixed(4) : 'N/A'}
                      {animatedIndex ? ` (in registry)` : ' (NOT in registry!)'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* AnimatedIndex Registry */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AnimatedIndex Registry</Text>
              {(() => {
                const registry = __getAllAnimatedIndexes();
                const entries = Array.from(registry.entries());
                if (entries.length === 0) {
                  return <Text style={styles.value}>Empty</Text>;
                }
                return entries.map(([id, animatedIndex]) => (
                  <View key={id} style={styles.registryItem}>
                    <Text style={styles.registryId}>{id}</Text>
                    <Text style={styles.registryValue}>
                      value: {animatedIndex.value.toFixed(4)}
                    </Text>
                    <Text
                      style={[
                        styles.registryStatus,
                        sheetsById[id]
                          ? styles.registryInStore
                          : styles.registryOrphan,
                      ]}
                    >
                      {sheetsById[id] ? 'in store' : 'ORPHAN (not in store!)'}
                    </Text>
                  </View>
                ));
              })()}
            </View>

            {/* Log History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Log History ({logHistory.length})
              </Text>
              {logHistory.map((log, index) => (
                <View
                  key={index}
                  style={[styles.logItem, styles[`log_${log.type}`]]}
                >
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.logSheet}>[{log.sheetId}]</Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  {log.value !== undefined && (
                    <Text style={styles.logValue}>
                      {JSON.stringify(log.value)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBadge: {
    position: 'absolute',
    zIndex: 9999,
  },
  badgeContent: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeCount: {
    color: 'white',
    fontSize: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  value: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  sheetItem: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  sheetId: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  sheetDetails: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  logItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: '#2a2a2a',
  },
  log_open: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  log_close: {
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  log_status: {
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  log_animatedIndex: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  log_error: {
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
    backgroundColor: '#3a2a2a',
  },
  log_cleanup: {
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
  },
  log_valueChange: {
    borderLeftWidth: 3,
    borderLeftColor: '#E91E63',
    backgroundColor: '#3a2a3a',
  },
  logTime: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  logSheet: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  logMessage: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  logValue: {
    color: '#FF9800',
    fontSize: 10,
    fontFamily: 'monospace',
    width: '100%',
    marginTop: 4,
  },
  animatedIndexValue: {
    color: '#FF9800',
  },
  registryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  registryId: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  registryValue: {
    color: '#FF9800',
    fontSize: 12,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  registryStatus: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  registryInStore: {
    color: '#4CAF50',
  },
  registryOrphan: {
    color: '#f44336',
    fontWeight: 'bold',
  },
});
