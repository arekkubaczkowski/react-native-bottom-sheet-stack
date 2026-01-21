import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'context-portal-sheet': {
      greeting: string;
    };
    'portal-mode-sheet-a': true;
    'portal-mode-sheet-b': true;
    'scanner-sheet': true;
  }
}
