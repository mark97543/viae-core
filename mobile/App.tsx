import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { NavigationMapScreen } from './src/screens/NavigationMapScreen';
import { COLORS } from './src/theme/theme';

type ActiveScreen = 'dashboard' | 'qr-scanner' | 'map';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');
  const [activeMapFile, setActiveMapFile] = useState<string>('');
  const [mapVaultDir, setMapVaultDir] = useState<string>('/sdcard/IterViaeNavus/maps/');

  const handleOpenMap = (mapName: string, vaultDir: string) => {
    setActiveMapFile(mapName);
    setMapVaultDir(vaultDir);
    setCurrentScreen('map');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          onOpenScanner={() => setCurrentScreen('qr-scanner')}
          onOpenMap={handleOpenMap}
        />
      )}
      {currentScreen === 'qr-scanner' && (
        <QRScannerScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
      {currentScreen === 'map' && (
        <NavigationMapScreen
          activeMapName={activeMapFile}
          vaultDir={mapVaultDir}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
