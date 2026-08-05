import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * Two managers, two stacks.
 *
 * Group B is mounted at the app root with its own `BottomSheetHost`, so its
 * sheets are a separate stack rather than a filtered view of one. `closeAll()`
 * called in either group leaves the other standing — the thing that breaks the
 * moment anyone flattens `stackOrderByGroup`.
 */

export const GroupASheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open, closeAll } = useBottomSheetManager();
  const { close } = useBottomSheetContext();
  const [lastResult, setLastResult] = useState('no call yet');

  const closeGroup = async () => {
    const result = await closeAll({ stagger: 120 });
    setLastResult(`closed: [${result.closed.join(', ') || '(none)'}]`);
  };

  return (
    <Sheet ref={ref}>
      <Badge label="group: default" color={colors.primary} />
      <Text style={sharedStyles.h1}>Group A</Text>
      <Text style={sharedStyles.text}>
        Open group B on top of this, then close all of A. B stays exactly where
        it was.
      </Text>

      <View style={sharedStyles.contextBox}>
        <Text style={sharedStyles.contextTitle}>LAST RESULT</Text>
        <Text style={sharedStyles.contextValue}>{lastResult}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          title="Push another A sheet"
          onPress={() =>
            open(<GroupASheet />, { mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="Open a B sheet on top"
          style={{ backgroundColor: colors.cyan }}
          onPress={() => open(<GroupBSheet />, { groupId: 'secondary' })}
        />
        <Button
          title="closeAll() — group A only"
          style={{ backgroundColor: colors.warningDark }}
          onPress={closeGroup}
        />
        <SecondaryButton title="Close this one" onPress={close} />
      </View>
    </Sheet>
  );
});

GroupASheet.displayName = 'GroupASheet';

export const GroupBSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open, closeAll } = useBottomSheetManager();
  const { close } = useBottomSheetContext();
  // Registered to group A by the persistent mount in App.tsx, so opening it
  // from here is the cross-group case the store rejects.
  const scanner = useBottomSheetControl('scanner-sheet');
  const [lastResult, setLastResult] = useState('no call yet');

  const closeGroup = async () => {
    const result = await closeAll({ stagger: 120 });
    setLastResult(`closed: [${result.closed.join(', ') || '(none)'}]`);
  };

  return (
    <Sheet ref={ref}>
      <Badge label="group: secondary" color={colors.cyan} />
      <Text style={sharedStyles.h1}>Group B</Text>
      <Text style={sharedStyles.text}>
        A separate manager with its own host. Group B has no scale view, so
        nothing behind it scales — that wrapper belongs to group A.
      </Text>

      <View style={sharedStyles.contextBox}>
        <Text style={sharedStyles.contextTitle}>LAST RESULT</Text>
        <Text style={sharedStyles.contextValue}>{lastResult}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          title="Push another B sheet"
          onPress={() => open(<GroupBSheet />, { mode: 'push' })}
        />
        <Button
          title="Open scanner-sheet here — group-mismatch"
          style={{ backgroundColor: colors.errorDark }}
          onPress={() =>
            setLastResult(
              `scanner-sheet from group B → ${scanner.open({
                params: { source: 'home' },
              })}`
            )
          }
        />
        <Button
          title="closeAll() — group B only"
          style={{ backgroundColor: colors.warningDark }}
          onPress={closeGroup}
        />
        <SecondaryButton title="Close this one" onPress={close} />
      </View>
    </Sheet>
  );
});

GroupBSheet.displayName = 'GroupBSheet';
