import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { BackdropComponentProps, BackdropConfig } from './backdrop.types';

/**
 * What a sheet's own record says about its backdrop, as a stable primitive.
 *
 * `QueueItem` is memoized because every host render rebuilds its children, so
 * it must not subscribe to the config object — this tri-state lets it re-render
 * only when the backdrop is switched on or off, never when it is restyled.
 */
export type SheetBackdropOverride = 'off' | 'own' | 'inherit';

export function backdropOverrideOf(
  backdrop: BackdropConfig | false | undefined
): SheetBackdropOverride {
  if (backdrop === false) return 'off';
  return backdrop === undefined ? 'inherit' : 'own';
}

/** Whether the manager should render a backdrop for this sheet at all. */
export function isBackdropEnabled(
  override: SheetBackdropOverride,
  groupBackdrop: BackdropConfig | false | undefined
): boolean {
  if (override !== 'inherit') return override === 'own';
  return groupBackdrop !== false;
}

export type ResolvedBackdrop = { pressToDismiss: boolean } & (
  | { kind: 'custom'; component: ComponentType<BackdropComponentProps> }
  | { kind: 'styled'; styles: StyleProp<ViewStyle>[] }
);

/**
 * Folds the group default and the sheet's override into what to render.
 *
 * The visual choice is atomic — a sheet-level config replaces the group's
 * rendering entirely, so a group's custom component never bleeds under a sheet
 * that asked for a styled scrim. Only `pressToDismiss` resolves per field, and
 * styles compose only where both levels are `styled`.
 */
export function resolveBackdrop(
  stored: BackdropConfig | false | undefined,
  groupBackdrop: BackdropConfig | false | undefined
): ResolvedBackdrop {
  // `false` at either level means "no backdrop", which `QueueItem` already
  // gates on. Treating it as "no config" here keeps this resolver total.
  const sheet = stored === false ? undefined : stored;
  const group = groupBackdrop === false ? undefined : groupBackdrop;

  const pressToDismiss = sheet?.pressToDismiss ?? group?.pressToDismiss ?? true;
  const visual = sheet ?? group;

  if (visual?.kind === 'custom') {
    return { kind: 'custom', component: visual.component, pressToDismiss };
  }

  return {
    kind: 'styled',
    styles: [
      group?.kind === 'styled' ? group.style : undefined,
      sheet?.kind === 'styled' ? sheet.style : undefined,
    ],
    pressToDismiss,
  };
}
