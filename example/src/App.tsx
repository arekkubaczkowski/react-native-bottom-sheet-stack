import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  useBottomSheetManager,
  BottomSheetManaged,
  useBottomSheetState,
  ScaleBackgroundWrapper,
} from 'react-native-bottom-sheet-stack';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { forwardRef, type PropsWithChildren } from 'react';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { initBottomSheetCoordinator } from '../../src/bottomSheetCoordinator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
initBottomSheetCoordinator();

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <BottomSheetManagerProvider id="default">
          <ScaleBackgroundWrapper
            config={{ scale: 0.92, translateY: 10, borderRadius: 16 }}
          >
            <View style={styles.container}>
              <Content />
            </View>
          </ScaleBackgroundWrapper>
          <BottomSheetHost />
        </BottomSheetManagerProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const Button = ({ onPress, title }: { onPress: () => void; title: string }) => (
  <TouchableOpacity onPress={onPress}>
    <Text
      style={{
        color: 'white',
        fontSize: 20,
        textAlign: 'center',
        padding: 20,
        backgroundColor: '#E90062',
        borderRadius: 8,
      }}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

export const Content = ({}: PropsWithChildren) => {
  const { openBottomSheet } = useBottomSheetManager();
  return (
    <View>
      <Button
        title="Open Bottom Sheet"
        onPress={() => openBottomSheet(<SheetA />, { scaleBackground: true })}
      />
    </View>
  );
};

const SheetA = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet A</Text>
          <Text style={styles.text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim Lorem ipsum dolor sit amet, consectetur adipiscing
            elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
            aliqua. Ut enim ad minim. Lorem ipsum dolor sit amet, consectetur
            adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim
          </Text>
          <Button
            title="Switch"
            onPress={() =>
              openBottomSheet(<SheetB />, {
                mode: 'switch',
              })
            }
          />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetB = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet B</Text>
          <Text style={styles.text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim. Lorem ipsum dolor sit amet, consectetur adipiscing
            elit.
          </Text>
          <Button
            title="Push"
            onPress={() => openBottomSheet(<SheetC />, { mode: 'push' })}
          />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetC = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();
  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet C</Text>
          <Text style={styles.text}>Lorem ipsum dolor sit amet</Text>
          <Button title="Close" onPress={close} />
          <Button
            title="Replace"
            onPress={() => openBottomSheet(<SheetD />, { mode: 'replace' })}
          />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetD = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet D</Text>
          <Text style={styles.text}>Lorem ipsum dolor sit amet - REPLACED</Text>
          <Button title="Close" onPress={close} />
          <Button
            title="Replace"
            onPress={() => openBottomSheet(<SheetC />, { mode: 'replace' })}
          />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    flexGrow: 1,
  },
  sheet: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: 'white',
    marginVertical: 16,
  },
});
