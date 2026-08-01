import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface DashboardScreenProps {
  onOpenScanner: () => void;
  onOpenMap: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onOpenScanner, onOpenMap }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NAVUS</Text>
        <Text style={styles.headerSubtitle}>AIR-GAPPED HANDLEBAR HEAD UNIT</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>GPS ACTIVE • OFFLINE VAULT</Text>
        </View>
      </View>

      {/* Quick Action Cards */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={onOpenScanner} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionTitle}>SCAN QR ROUTE</Text>
          <Text style={styles.actionDesc}>Handshake route payload from desktop or paper</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, styles.actionCardPrimary]} onPress={onOpenMap} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionTitle}>LAUNCH MAP</Text>
          <Text style={styles.actionDesc}>Open offline vector map & live GPS HUD</Text>
        </TouchableOpacity>
      </View>

      {/* Head Unit Provisioning & Service Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>HANDLEBAR HEAD UNIT CONFIGURATION</Text>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>SERVICE AUTOSTART:</Text>
          <Text style={styles.configValueSuccess}>BOOT_COMPLETED ACTIVE</Text>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>RADIO MODE:</Text>
          <Text style={styles.configValueSuccess}>AIR-GAPPED (GPS & WI-FI ONLY)</Text>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>POWER / IDLE OVERRIDE:</Text>
          <Text style={styles.configValueSuccess}>BATTERY WHITELISTED</Text>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>STANDALONE MOUNT:</Text>
          <Text style={styles.configValue}>UNPLUGGED HANDLEBAR READY</Text>
        </View>
      </View>

      {/* Active Trip Telemetry Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ACTIVE TRIP TELEMETRY</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>-- mi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WAYPOINTS</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>EST. TIME</Text>
            <Text style={styles.statValue}>-- hr</Text>
          </View>
        </View>
      </View>

      {/* Vault Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MAP VAULT & STORAGE</Text>
        <Text style={styles.infoText}>Vault Path: <Text style={styles.highlight}>/sdcard/IterViaeNavus/maps/</Text></Text>
        <Text style={styles.infoText}>Active Vector Archive: <Text style={styles.highlight}>None Loaded</Text></Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FONTS.bold,
    color: COLORS.success,
    letterSpacing: 1,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  actionCardPrimary: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  configLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  configValue: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
    fontFamily: FONTS.monospace,
  },
  configValueSuccess: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: FONTS.bold,
    fontFamily: FONTS.monospace,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  statValue: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  highlight: {
    color: COLORS.primary,
    fontFamily: FONTS.monospace,
  },
});
