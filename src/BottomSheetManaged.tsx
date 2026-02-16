/**
 * Backward-compatible re-export of GorhomSheetAdapter.
 *
 * Existing users can continue importing `BottomSheetManaged` and `BottomSheetRef`
 * without any changes. For new code, prefer importing `GorhomSheetAdapter` directly
 * from 'react-native-bottom-sheet-stack/adapters/gorhom' or use the `ModalAdapter`
 * for modal-based sheets.
 */
export {
  GorhomSheetAdapter as BottomSheetManaged,
  type GorhomSheetAdapterProps as BottomSheetManagedProps,
} from './adapters/gorhom';

export type { SheetAdapterRef as BottomSheetRef } from './adapter.types';
