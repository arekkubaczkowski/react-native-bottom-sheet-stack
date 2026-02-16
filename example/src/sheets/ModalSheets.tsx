import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionsSheetAdapter,
  ModalAdapter,
  useBottomSheetContext,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';

import { Badge, SecondaryButton, Sheet, SmallButton } from '../components';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles/theme';

// ---------------------------------------------------------------------------
// Mixed Adapter Stack — Entry point (portal-based ModalAdapter)
// ---------------------------------------------------------------------------

/**
 * Entry point for the mixed adapter demo. Opens as a centered modal card
 * with buttons to open any adapter type in push or switch mode.
 */
export function MixedStackContent() {
  const { close } = useBottomSheetContext<'mixed-stack'>();
  const { open } = useBottomSheetManager();

  return (
    <ModalAdapter contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Badge label="Modal" color={colors.warning} />
          <Badge label="Step 1" color={colors.textMuted} />
        </View>
        <Text style={sharedStyles.h1}>Mixed Adapter Stack</Text>
        <Text style={sharedStyles.text}>
          Build a stack mixing different adapter types. Each step can open any
          adapter using push or switch mode.
        </Text>

        <AdapterButtons open={open} from="Modal" step={1} />

        <View style={{ marginTop: 12 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// Simple Modal (used by Adapter Comparison)
// ---------------------------------------------------------------------------

export function SimpleModalContent() {
  const { close, params } = useBottomSheetContext<'simple-modal'>();
  const user = useUser();

  return (
    <ModalAdapter contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <Badge label="Modal Adapter" color={colors.warning} />
        <Text style={sharedStyles.h1}>Modal Sheet</Text>
        <Text style={sharedStyles.text}>
          This modal uses the ModalAdapter — a simple View-based overlay with a
          zoom animation. It participates in the same stack as bottom sheets,
          supporting push, switch, and replace modes.
        </Text>

        <View
          style={[sharedStyles.contextBox, { borderColor: colors.success }]}
        >
          <Text style={sharedStyles.contextTitle}>Context Access</Text>
          <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
            Username: {user?.username ?? 'undefined'}
          </Text>
          <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
            Theme: {user?.theme ?? 'undefined'}
          </Text>
        </View>

        {params?.title && (
          <View style={styles.paramBox}>
            <Text style={styles.paramLabel}>Received param:</Text>
            <Text style={styles.paramValue}>{params.title}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// Adapter Comparison
// ---------------------------------------------------------------------------

export function AdapterComparisonContent() {
  const { close } = useBottomSheetContext<'adapter-comparison'>();
  const simpleModalControl = useBottomSheetControl('simple-modal');
  const { open } = useBottomSheetManager();
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  const handleOpenAsBottomSheet = () => {
    setLastOpened('Bottom Sheet');
    open(<ComparisonBottomSheet />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  const handleOpenAsModal = () => {
    setLastOpened('Modal');
    simpleModalControl.open({
      mode: 'push',
      params: { title: 'Opened from comparison demo' },
    });
  };

  return (
    <ModalAdapter contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <Badge label="Adapter Pattern" color={colors.cyan} />
        <Text style={[sharedStyles.h1, { marginTop: 8 }]}>
          Choose Your Adapter
        </Text>
        <Text style={sharedStyles.text}>
          The same stack management works with any adapter. Open the same
          content as a bottom sheet or a modal — both support
          push/switch/replace.
        </Text>

        {lastOpened && (
          <View style={styles.lastOpenedBox}>
            <Text style={styles.lastOpenedLabel}>Last opened as:</Text>
            <Text style={styles.lastOpenedValue}>{lastOpened}</Text>
          </View>
        )}

        <View style={styles.comparisonButtons}>
          <SmallButton
            title="As Bottom Sheet"
            color={colors.primary}
            onPress={handleOpenAsBottomSheet}
          />
          <SmallButton
            title="As Modal"
            color={colors.warning}
            onPress={handleOpenAsModal}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ModalAdapter>
  );
}

const ComparisonBottomSheet = ({ ref }: { ref?: React.Ref<unknown> }) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref as any}>
      <Badge label="GorhomSheetAdapter" color={colors.primary} />
      <Text style={sharedStyles.h1}>I'm a Bottom Sheet</Text>
      <Text style={sharedStyles.text}>
        Opened with GorhomSheetAdapter (the default). Features snap points,
        swipe-to-dismiss gestures, and spring animations from
        @gorhom/bottom-sheet.
      </Text>
      <View style={styles.actions}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// Mixed Step Components (inline, opened via useBottomSheetManager)
// ---------------------------------------------------------------------------

interface MixedStepProps {
  ref?: React.Ref<unknown>;
  mode: 'push' | 'switch';
  from: string;
  step: number;
}

const MixedModalStep = ({ ref, mode, from, step }: MixedStepProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <ModalAdapter ref={ref as any} contentContainerStyle={styles.overlay}>
      <View style={styles.card}>
        <StepHeader
          adapterName="Modal"
          adapterColor={colors.warning}
          mode={mode}
          from={from}
          step={step}
        />
        <AdapterButtons open={open} from="Modal" step={step} />
        <View style={{ marginTop: 12 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ModalAdapter>
  );
};

const MixedGorhomStep = ({ ref, mode, from, step }: MixedStepProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <Sheet ref={ref as any}>
      <StepHeader
        adapterName="Bottom Sheet"
        adapterColor={colors.primary}
        mode={mode}
        from={from}
        step={step}
      />
      <AdapterButtons open={open} from="Bottom Sheet" step={step} />
      <View style={{ marginTop: 12 }}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

const MixedActionsStep = ({ ref, mode, from, step }: MixedStepProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <ActionsSheetAdapter
      ref={ref as any}
      gestureEnabled
      snapPoints={[50, 100]}
      initialSnapIndex={0}
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      indicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.sheetContent}>
        <StepHeader
          adapterName="Actions Sheet"
          adapterColor={colors.purple}
          mode={mode}
          from={from}
          step={step}
        />
        <AdapterButtons open={open} from="Actions Sheet" step={step} />
        <View style={{ marginTop: 12 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ActionsSheetAdapter>
  );
};

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

function StepHeader({
  adapterName,
  adapterColor,
  mode,
  from,
  step,
}: {
  adapterName: string;
  adapterColor: string;
  mode: 'push' | 'switch';
  from: string;
  step: number;
}) {
  return (
    <>
      <View style={styles.badgeRow}>
        <Badge label={adapterName} color={adapterColor} />
        <Badge
          label={mode}
          color={mode === 'push' ? colors.success : colors.warning}
        />
        <Badge label={`Step ${step}`} color={colors.textMuted} />
      </View>
      <Text style={sharedStyles.h1}>{adapterName}</Text>
      <Text style={sharedStyles.text}>
        {mode === 'push' ? 'Pushed' : 'Switched'} from {from}. Open any adapter
        type to continue building the mixed stack.
      </Text>
    </>
  );
}

function AdapterButtons({
  open,
  from,
  step,
}: {
  open: ReturnType<typeof useBottomSheetManager>['open'];
  from: string;
  step: number;
}) {
  const handleOpen = (
    adapter: 'modal' | 'sheet' | 'actions',
    mode: 'push' | 'switch'
  ) => {
    const nextStep = step + 1;
    const props = { mode, from, step: nextStep };
    const scaleBackground = adapter === 'sheet';

    switch (adapter) {
      case 'modal':
        open(<MixedModalStep {...props} />, { mode, scaleBackground });
        break;
      case 'sheet':
        open(<MixedGorhomStep {...props} />, { mode, scaleBackground });
        break;
      case 'actions':
        open(<MixedActionsStep {...props} />, { mode, scaleBackground });
        break;
    }
  };

  return (
    <View style={styles.buttonSection}>
      <Text style={styles.buttonSectionLabel}>Push</Text>
      <View style={styles.buttonRow}>
        <SmallButton
          title="Modal"
          color={colors.warning}
          onPress={() => handleOpen('modal', 'push')}
        />
        <SmallButton
          title="Bottom Sheet"
          color={colors.primary}
          onPress={() => handleOpen('sheet', 'push')}
        />
        <SmallButton
          title="Actions Sheet"
          color={colors.purple}
          onPress={() => handleOpen('actions', 'push')}
        />
      </View>
      <Text style={styles.buttonSectionLabel}>Switch</Text>
      <View style={styles.buttonRow}>
        <SmallButton
          title="Modal"
          color={colors.warning}
          onPress={() => handleOpen('modal', 'switch')}
        />
        <SmallButton
          title="Bottom Sheet"
          color={colors.primary}
          onPress={() => handleOpen('sheet', 'switch')}
        />
        <SmallButton
          title="Actions Sheet"
          color={colors.purple}
          onPress={() => handleOpen('actions', 'switch')}
        />
      </View>
    </View>
  );
}

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
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  buttonSection: {
    marginTop: 16,
    gap: 8,
  },
  buttonSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  paramBox: {
    backgroundColor: colors.warningDark,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  paramLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  paramValue: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  lastOpenedBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastOpenedLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  lastOpenedValue: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '700',
  },
});
