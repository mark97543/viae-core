import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface QRScannerScreenProps {
  onBack: () => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>QR ROUTE HANDSHAKE</Text>
      </View>

      {/* Camera Viewfinder Overlay Stub */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinderBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Text style={styles.viewfinderText}>ALIGN DESKTOP QR CODE HERE</Text>
        </View>
      </View>

      {/* Instruction Footer */}
      <View style={styles.footer}>
        <Text style={styles.instructionTitle}>AIR-GAPPED DATA INGEST</Text>
        <Text style={styles.instructionDesc}>
          Scan the QR manifest from the Iter Viae desktop application or printed Field Notes sheet to ingest the active trip route without internet access.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  backBtn: {
    paddingRight: SPACING.md,
  },
  backText: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  viewfinderBox: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewfinderText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: FONTS.semiBold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  instructionTitle: {
    fontSize: 11,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  instructionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
