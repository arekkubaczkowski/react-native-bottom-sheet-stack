import { isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SurfaceStyle } from '@swmansion/react-native-bottom-sheet';

import type { SwmansionSheetAdapterProps } from './SwmansionSheetAdapter';

const HANDLE_TOP = 12;
const HANDLE_BOTTOM = 8;
const HANDLE_GAP = 8;

export function renderSurface(
  surface: ReactNode,
  handle: SwmansionSheetAdapterProps['handle'],
  preventDismiss: boolean
) {
  const baseSurface = surface ?? (
    <View style={[StyleSheet.absoluteFill, styles.surface]} />
  );

  if (isValidElement(handle)) {
    return {
      surface: baseSurface,
      // Render over the content so interactive handles receive touches.
      contentHandle: (
        <View pointerEvents="box-none" style={styles.handleOverlay}>
          {handle}
        </View>
      ),
      handlePadding: 32,
    };
  }

  if (!handle || preventDismiss) return { surface: baseSurface };

  const config = typeof handle === 'object' ? handle : {};
  const width = config.width ?? 40;
  const height = config.height ?? 4;
  const color = config.color ?? 'rgba(255, 255, 255, 0.25)';
  return {
    surface: (
      <View style={StyleSheet.absoluteFill}>
        {baseSurface}
        <View pointerEvents="none" style={styles.pillOverlay}>
          <View
            style={[styles.pill, { width, height, backgroundColor: color }]}
          />
        </View>
      </View>
    ),
    contentHandle: null,
    handlePadding: HANDLE_TOP + height + HANDLE_BOTTOM + HANDLE_GAP,
  };
}

export function resolveSurfaceRadius(
  radius: number,
  detached: boolean | undefined,
  surfaceStyle: SwmansionSheetAdapterProps['surfaceStyle']
): SurfaceStyle | null {
  const flatStyle = StyleSheet.flatten(surfaceStyle);
  // Upstream gives specific corners priority over a general borderRadius.
  const hasRadius = Object.entries(flatStyle ?? {}).some(
    ([key, value]) =>
      key.startsWith('border') && key.endsWith('Radius') && value != null
  );
  if (hasRadius || radius <= 0) return null;

  return detached
    ? { borderRadius: radius }
    : { borderTopLeftRadius: radius, borderTopRightRadius: radius };
}

const handleOverlay = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
} as const;

const styles = StyleSheet.create({
  surface: { backgroundColor: '#151521' },
  handleOverlay,
  pillOverlay: {
    ...handleOverlay,
    alignItems: 'center',
    paddingTop: HANDLE_TOP,
    paddingBottom: HANDLE_BOTTOM,
  },
  pill: { borderRadius: 999 },
});
