import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface NavigationMapScreenProps {
  onBack: () => void;
}

export const NavigationMapScreen: React.FC<NavigationMapScreenProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      {/* HUD Telemetry Banner */}
      <View style={styles.hudOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← DASHBOARD</Text>
        </TouchableOpacity>

        <View style={styles.telemetryGroup}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryVal}>--</Text>
            <Text style={styles.telemetryUnit}>MPH</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryVal}>--°</Text>
            <Text style={styles.telemetryUnit}>BEARING</Text>
          </View>
        </View>
      </View>

      {/* Offline Map Viewport Placeholder */}
      <View style={styles.mapViewport}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderTitle}>OFFLINE VECTOR ENGINE</Text>
        <Text style={styles.mapPlaceholderDesc}>
          MapLibre Native Viewport (.mbtiles) + Fused Location GPS Engine
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hudOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'rgba(10, 15, 29, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    zIndex: 10,
  },
  backBtn: {
    paddingVertical: SPACING.xs,
  },
  backText: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    fontSize: 12,
  },
  telemetryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryVal: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    fontFamily: FONTS.monospace,
  },
  telemetryUnit: {
    fontSize: 8,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.surfaceBorder,
  },
  mapViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070b14',
    padding: SPACING.lg,
  },
  mapPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  mapPlaceholderDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
