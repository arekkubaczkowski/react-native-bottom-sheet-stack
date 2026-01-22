import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'context-portal-sheet': {
      greeting: string;
    };
    'portal-mode-sheet-a': true;
    'portal-mode-sheet-b': true;
    'scanner-sheet': {
      source: 'home' | 'navigation';
      title?: string;
    };
    'persistent-with-portal': true;
    'nested-portal-in-persistent': {
      message: string;
    };
  }
}
