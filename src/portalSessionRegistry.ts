/**
 * Registry for portal session counters per sheet.
 * This persists across sheet deletions to ensure unique Portal/PortalHost names
 * and work around react-native-teleport connection issues after replace flows.
 */
const portalSessionRegistry = new Map<string, number>();

export function getNextPortalSession(sheetId: string): number {
  const current = portalSessionRegistry.get(sheetId) ?? 0;
  const next = current + 1;
  portalSessionRegistry.set(sheetId, next);
  return next;
}

export function getCurrentPortalSession(sheetId: string): number | undefined {
  return portalSessionRegistry.get(sheetId);
}

/**
 * Reset all portal sessions. Useful for testing.
 * @internal
 */
export function __resetPortalSessions(): void {
  portalSessionRegistry.clear();
}
