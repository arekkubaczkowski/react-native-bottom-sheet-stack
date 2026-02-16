import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetControl,
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

import {
  Badge,
  Button,
  SecondaryButton,
  Sheet,
  SmallButton,
} from '../components';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles/theme';

interface ContextComparisonSheetProps {
  onOpenPortal: () => void;
}

export const ContextComparisonSheet = forwardRef<
  BottomSheetMethods,
  ContextComparisonSheetProps
>(({ onOpenPortal }, ref) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <Sheet ref={ref}>
      <Badge label="Context Demo" color={colors.success} />
      <Text style={sharedStyles.h1}>Context Preservation</Text>
      <Text style={sharedStyles.text}>
        This demo shows the difference between imperative and portal-based APIs.
        {'\n\n'}A UserContext with username "John Doe" is defined in the app.
        Open each sheet below to see if it can access this context.
      </Text>

      <View style={{ gap: 12 }}>
        <Button
          title="Open Imperative Sheet"
          onPress={() =>
            open(<ContextSheetImperative />, {
              mode: 'push',
              scaleBackground: true,
            })
          }
        />
        <Button title="Open Portal Sheet" onPress={onOpenPortal} />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

ContextComparisonSheet.displayName = 'ContextComparisonSheet';

export const ContextSheetImperative = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { close } = useBottomSheetContext();
    const user = useUser();

    return (
      <Sheet ref={ref}>
        <Badge label="Imperative API" color={colors.error} />
        <Text style={sharedStyles.h1}>Context Lost ❌</Text>
        <Text style={sharedStyles.text}>
          This sheet was opened with openBottomSheet(). The content is stored in
          Zustand and rendered in BottomSheetHost - outside the original React
          tree. Context is NOT available.
        </Text>

        <View style={[sharedStyles.contextBox, { borderColor: colors.error }]}>
          <Text style={sharedStyles.contextTitle}>UserContext Access</Text>
          <Text style={[sharedStyles.contextValue, { color: colors.error }]}>
            Username: {user?.username ?? '❌ undefined'}
          </Text>
          <Text style={[sharedStyles.contextValue, { color: colors.error }]}>
            Theme: {user?.theme ?? '❌ undefined'}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </Sheet>
    );
  }
);

ContextSheetImperative.displayName = 'ContextSheetImperative';

export const ContextSheetPortal = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close, params } = useBottomSheetContext<'context-portal-sheet'>();
  const { updateParams, resetParams } = useBottomSheetControl(
    'context-portal-sheet'
  );
  const { open } = useBottomSheetManager();
  const user = useUser();
  const [counter, setCounter] = useState(1);

  return (
    <Sheet ref={ref}>
      <Badge label="Portal API" color={colors.success} />
      <Text style={sharedStyles.h1}>Context Preserved ✅</Text>
      <Text style={sharedStyles.text}>
        This sheet was opened with BottomSheetPortal + useBottomSheetControl().
        The content is rendered in its original location in the React tree, then
        teleported to BottomSheetHost. Context IS available!
      </Text>

      <View style={[sharedStyles.contextBox, { borderColor: colors.success }]}>
        <Text style={sharedStyles.contextTitle}>UserContext Access</Text>
        <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
          Username: {user?.username ?? '❌ undefined'}
        </Text>
        <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
          Theme: {user?.theme ?? '❌ undefined'}
        </Text>
      </View>

      <View style={[sharedStyles.contextBox, { borderColor: colors.primary }]}>
        <Text style={sharedStyles.contextTitle}>Type-Safe Params</Text>
        <Text style={[sharedStyles.contextValue, { color: colors.primary }]}>
          Greeting: {params?.greeting ?? '❌ undefined'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <SmallButton
            title="Update"
            onPress={() => {
              setCounter((c) => c + 1);
              updateParams({ greeting: `Updated #${counter}` });
            }}
          />
          <SmallButton
            title="Reset"
            color={colors.error}
            onPress={() => resetParams()}
          />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          title="Open Nested Imperative Sheet"
          onPress={() => open(<NestedImperativeSheet />, { mode: 'push' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

ContextSheetPortal.displayName = 'ContextSheetPortal';

export const NestedImperativeSheet = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { close } = useBottomSheetContext();
    const user = useUser();

    return (
      <Sheet ref={ref}>
        <Badge label="Mixed APIs" color={colors.warning} />
        <Text style={sharedStyles.h1}>Nested from Portal</Text>
        <Text style={sharedStyles.text}>
          This sheet was opened using the imperative API from within a
          portal-based sheet. Notice that context is lost again - the imperative
          API always renders in BottomSheetHost.
        </Text>

        <View
          style={[sharedStyles.contextBox, { borderColor: colors.warning }]}
        >
          <Text style={sharedStyles.contextTitle}>UserContext Access</Text>
          <Text style={[sharedStyles.contextValue, { color: colors.error }]}>
            Username: {user?.username ?? '❌ undefined'}
          </Text>
          <Text style={[sharedStyles.contextValue, { color: colors.error }]}>
            Theme: {user?.theme ?? '❌ undefined'}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </Sheet>
    );
  }
);

NestedImperativeSheet.displayName = 'NestedImperativeSheet';
