import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'context-portal-sheet': {
      greeting: string;
    };
  }
}
