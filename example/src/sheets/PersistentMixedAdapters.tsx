import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CustomModalAdapter,
  useBottomSheetContext,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';
import { ReactNativeModalAdapter } from 'react-native-bottom-sheet-stack/react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  SecondaryButton,
  Sheet,
  SmallButton,
} from '../components';
import { colors, sharedStyles } from '../styles/theme';

// ---------------------------------------------------------------------------
// Persistent notepad — uses CustomModalAdapter, keeps state across close/open
// ---------------------------------------------------------------------------

export function PersistentNotepadContent() {
  const { close } = useBottomSheetContext<'persistent-notepad'>();
  const { open } = useBottomSheetManager();
  const [notes, setNotes] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const handleSave = () => {
    setSavedCount((c) => c + 1);
  };

  const handlePushGorhom = () => {
    open(<NotePreviewSheet notes={notes} savedCount={savedCount} />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  const handlePushModal = () => {
    open(<NoteShareModal notes={notes} />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  const handlePushRNModal = () => {
    open(<NoteHistoryModal savedCount={savedCount} />, {
      mode: 'push',
    });
  };

  return (
    <CustomModalAdapter contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Badge label="Persistent" color={colors.cyan} />
          <Badge label="CustomModalAdapter" color={colors.success} />
        </View>
        <Text style={[sharedStyles.h1, { marginTop: 8 }]}>
          Persistent Notepad
        </Text>
        <Text style={sharedStyles.text}>
          This persistent modal keeps your draft across close/open cycles. Push
          sheets with different adapters on top.
        </Text>

        <TextInput
          style={styles.textInput}
          placeholder="Type your notes here..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Characters</Text>
            <Text style={styles.statValue}>{notes.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Saves</Text>
            <Text style={styles.statValue}>{savedCount}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Save Draft" onPress={handleSave} />
        </View>

        <View style={styles.adapterSection}>
          <Text style={styles.adapterSectionLabel}>Open with adapter</Text>
          <View style={styles.adapterRow}>
            <SmallButton
              title="Preview (Sheet)"
              color={colors.primary}
              onPress={handlePushGorhom}
            />
            <SmallButton
              title="Share (Modal)"
              color={colors.success}
              onPress={handlePushModal}
            />
            <SmallButton
              title="History (RN Modal)"
              color={colors.warning}
              onPress={handlePushRNModal}
            />
          </View>
        </View>

        <SecondaryButton title="Close" onPress={close} />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Close and reopen — your draft and save count persist because this is
            a persistent sheet. Pushed sheets on top reset on close.
          </Text>
        </View>
      </View>
    </CustomModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// Pushed sheets — each uses a different adapter
// ---------------------------------------------------------------------------

interface NotePreviewProps {
  ref?: React.Ref<unknown>;
  notes: string;
  savedCount: number;
}

const NotePreviewSheet = ({ ref, notes, savedCount }: NotePreviewProps) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref as any} enableDynamicSizing>
      <View style={styles.badgeRow}>
        <Badge label="GorhomSheet" color={colors.primary} />
        <Badge label="push" color={colors.success} />
      </View>
      <Text style={sharedStyles.h1}>Note Preview</Text>
      <Text style={sharedStyles.text}>
        Pushed from the persistent notepad using GorhomSheetAdapter.
      </Text>

      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>Draft content:</Text>
        <Text style={styles.previewText}>{notes || '(empty)'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Characters</Text>
          <Text style={styles.statValue}>{notes.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Saves</Text>
          <Text style={styles.statValue}>{savedCount}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

interface NoteShareProps {
  ref?: React.Ref<unknown>;
  notes: string;
}

const NoteShareModal = ({ ref, notes }: NoteShareProps) => {
  const { close } = useBottomSheetContext();
  const [shared, setShared] = useState(false);

  return (
    <CustomModalAdapter ref={ref as any} contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Badge label="CustomModalAdapter" color={colors.success} />
          <Badge label="push" color={colors.success} />
        </View>
        <Text style={[sharedStyles.h1, { marginTop: 8 }]}>Share Note</Text>
        <Text style={sharedStyles.text}>
          Pushed from the persistent notepad using CustomModalAdapter.
        </Text>

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Will share:</Text>
          <Text style={styles.previewText} numberOfLines={3}>
            {notes || '(empty note)'}
          </Text>
        </View>

        {shared && (
          <View style={[styles.previewBox, { borderColor: colors.success }]}>
            <Text style={[styles.previewLabel, { color: colors.success }]}>
              Shared successfully!
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title={shared ? 'Shared!' : 'Share'}
            onPress={() => setShared(true)}
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </CustomModalAdapter>
  );
};

interface NoteHistoryProps {
  ref?: React.Ref<unknown>;
  savedCount: number;
}

const NoteHistoryModal = ({ ref, savedCount }: NoteHistoryProps) => {
  const { close } = useBottomSheetContext();

  return (
    <ReactNativeModalAdapter
      ref={ref as any}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeDirection="down"
      style={{ margin: 0 }}
    >
      <SafeAreaView style={styles.rnModalContainer}>
        <View style={styles.rnModalHandle}>
          <View style={styles.rnModalHandleBar} />
        </View>
        <View style={styles.rnModalContent}>
          <View style={styles.badgeRow}>
            <Badge label="ReactNativeModal" color={colors.warning} />
            <Badge label="push" color={colors.success} />
          </View>
          <Text style={sharedStyles.h1}>Save History</Text>
          <Text style={sharedStyles.text}>
            Pushed from the persistent notepad using ReactNativeModalAdapter.
          </Text>

          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Total saves this session:</Text>
            <Text style={[styles.statValue, { textAlign: 'center' }]}>
              {savedCount}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This count comes from the persistent notepad's state. Close this
              modal, and the notepad still remembers it.
            </Text>
          </View>

          <View style={styles.actions}>
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </SafeAreaView>
    </ReactNativeModalAdapter>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    minHeight: 80,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.cyan,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  adapterSection: {
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  adapterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adapterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  previewText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
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
  rnModalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rnModalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  rnModalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  rnModalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
});
