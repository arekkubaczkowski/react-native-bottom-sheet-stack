import { StyleSheet } from 'react-native';

export const colors = {
  // Base
  background: '#0a0a12',
  surface: '#151521',
  surfaceLight: '#1f1f2e',
  surfaceDark: '#0d0d16',
  surfaceElevated: '#1a1a28',

  // Borders
  border: '#2a2a3d',
  borderLight: '#3d3d52',

  // Text
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',

  // Accent colors
  primary: '#818cf8',
  primaryDark: '#6366f1',
  success: '#34d399',
  successDark: '#10b981',
  error: '#f87171',
  errorDark: '#ef4444',
  warning: '#fbbf24',
  warningDark: '#f59e0b',
  purple: '#a78bfa',
  purpleDark: '#8b5cf6',
  pink: '#f472b6',
  pinkDark: '#ec4899',
  cyan: '#22d3ee',

  // Nested sheet backgrounds (progressive depth)
  nested1: '#16162a',
  nested2: '#1c1c38',
  nested3: '#232347',
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
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  smallButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  smallButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Typography
  h1: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    marginVertical: 16,
    lineHeight: 23,
  },

  // Sheet
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    flexGrow: 1,
  },

  // Badges
  levelBadge: {
    alignSelf: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Context box
  contextBox: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextValue: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    fontFamily: 'monospace',
  },

  // Scale info
  scaleInfo: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scaleInfoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scaleInfoItem: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },

  // Stats
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Loading
  loadingBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warningDark,
  },
  loadingText: {
    color: colors.warning,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
