import {
  BottomSheetHost,
  BottomSheetManagerProvider,
  BottomSheetScaleView,
} from 'react-native-bottom-sheet-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UserProvider } from './context/UserContext';
import { HomeScreen } from './screens';
import { sharedStyles } from './styles/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={sharedStyles.root}>
        <BottomSheetManagerProvider
          id="default"
          scaleConfig={{ scale: 0.92, translateY: 0, borderRadius: 24 }}
        >
          <BottomSheetScaleView>
            <UserProvider value={{ username: 'John Doe', theme: 'dark' }}>
              <HomeScreen />
            </UserProvider>
          </BottomSheetScaleView>
          <BottomSheetHost />
        </BottomSheetManagerProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
