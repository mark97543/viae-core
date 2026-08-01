import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, PermissionsAndroid, Platform, Linking } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';
import * as FileSystem from 'expo-file-system/legacy';

interface DashboardScreenProps {
  onOpenScanner: () => void;
  onOpenMap: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onOpenScanner, onOpenMap }) => {
  const [mapFiles, setMapFiles] = useState<string[]>([]);
  const [activeMap, setActiveMap] = useState<string>('Scanning Vault...');
  const [resolvedPath, setResolvedPath] = useState<string>('/sdcard/IterViaeNavus/maps/');

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
        return true;
      }
      const permissions: (typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS])[] = [];
      if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      if (PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE) {
        permissions.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      }
      if (permissions.length > 0) {
        await PermissionsAndroid.requestMultiple(permissions);
      }
      return true;
    } catch (err) {
      console.warn("Storage permission request warning:", err);
      return true;
    }
  };

  const scanMapVault = useCallback(async () => {
    setActiveMap('Scanning Vault...');
    try {
      await requestStoragePermission();

      const appPrivateDir = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}maps/` : null;
      const androidAppDataDir = 'file:///storage/emulated/0/Android/data/com.iterviae.navus/files/maps/';

      const candidatePaths = [
        '/sdcard/IterViaeNavus/maps/',
        '/sdcard/IterViaeNavus/maps',
        'file:///sdcard/IterViaeNavus/maps/',
        'file:///sdcard/IterViaeNavus/maps',
        '/storage/emulated/0/IterViaeNavus/maps/',
        '/storage/emulated/0/IterViaeNavus/maps',
        'file:///storage/emulated/0/IterViaeNavus/maps/',
        'file:///storage/emulated/0/IterViaeNavus/maps',
        androidAppDataDir,
        appPrivateDir,
      ].filter((p): p is string => Boolean(p));

      let foundDir: string | null = null;
      let filesInDir: string[] = [];

      for (const candidate of candidatePaths) {
        try {
          const files = await FileSystem.readDirectoryAsync(candidate);
          if (files && files.length > 0) {
            foundDir = candidate;
            filesInDir = files;
            break;
          } else if (files && foundDir === null) {
            foundDir = candidate;
            filesInDir = [];
          }
        } catch (e) {
          try {
            const info = await FileSystem.getInfoAsync(candidate);
            if (info.exists) {
              foundDir = candidate;
              filesInDir = await FileSystem.readDirectoryAsync(candidate);
              if (filesInDir.length > 0) break;
            }
          } catch {
            // Continue scanning candidate paths
          }
        }
      }

      if (foundDir) {
        setResolvedPath(foundDir.replace('file://', ''));
        setMapFiles(filesInDir);
        const mbtiles = filesInDir.filter(f => f.endsWith('.mbtiles'));
        if (mbtiles.length > 0) {
          setActiveMap(mbtiles[0]);
        } else {
          setActiveMap('No .mbtiles Archives Found');
        }
      } else {
        // Attempt to create vault directory at accessible locations
        let createdDir: string | null = null;
        const fallbackCreateDirs = [
          'file:///sdcard/IterViaeNavus/maps/',
          androidAppDataDir,
          appPrivateDir,
        ].filter((p): p is string => Boolean(p));

        for (const targetDir of fallbackCreateDirs) {
          try {
            await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
            createdDir = targetDir;
            break;
          } catch {
            // Check next directory to create
          }
        }

        if (createdDir) {
          setResolvedPath(createdDir.replace('file://', ''));
          setActiveMap('No .mbtiles Archives Found (Created Vault)');
          setMapFiles([]);
        } else {
          setResolvedPath('/sdcard/IterViaeNavus/maps/');
          setActiveMap('No .mbtiles Archives Found');
        }
      }
    } catch (err) {
      console.log("Error scanning map vault:", err);
      setActiveMap('No .mbtiles Archives Found');
    }
  }, []);

  useEffect(() => {
    scanMapVault();
  }, [scanMapVault]);

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.cardTitle, { marginBottom: 0 }]}>MAP VAULT & STORAGE</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={() => Linking.openSettings()} activeOpacity={0.7} style={styles.scanBtn}>
              <Text style={styles.scanBtnText}>⚙️ SETTINGS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={scanMapVault} activeOpacity={0.7} style={styles.scanBtn}>
              <Text style={styles.scanBtnText}>🔄 RESCAN</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.infoText}>Vault Path: <Text style={styles.highlight}>{resolvedPath}</Text></Text>
        <Text style={styles.infoText}>Active Vector Archive: <Text style={styles.highlight}>{activeMap}</Text></Text>
        {mapFiles.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.cardTitle, { marginBottom: 4 }]}>DETECTED VAULT FILES ({mapFiles.length}):</Text>
            {mapFiles.map(f => (
              <Text key={f} style={[styles.infoText, { fontSize: 11, color: COLORS.textPrimary }]}>• {f}</Text>
            ))}
          </View>
        )}
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
  scanBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  scanBtnText: {
    fontSize: 9,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
