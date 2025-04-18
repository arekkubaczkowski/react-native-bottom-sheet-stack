import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

export const sheetRefs: Record<
  string,
  React.RefObject<BottomSheetMethods | null>
> = {};
