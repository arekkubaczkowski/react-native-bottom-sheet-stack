import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceLight: '#2d2d44',
  surfaceDark: '#1a1a3a',
  border: '#3f3f5a',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  primary: '#6366f1',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',

  // Nested sheet backgrounds
  nested1: '#1e1e3f',
  nested2: '#252552',
  nested3: '#2d2d6d',
} as const;

export const sharedStyles = StyleSheet.create({
  // Layout
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Buttons
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Typography
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    marginVertical: 16,
    lineHeight: 24,
  },

  // Sheet
  sheetContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // Badges
  levelBadge: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Context box
  contextBox: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  contextValue: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },

  // Scale info
  scaleInfo: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  scaleInfoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  scaleInfoItem: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },

  // Stats
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Loading
  loadingBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: colors.warning,
    textAlign: 'center',
    fontSize: 14,
  },
});
