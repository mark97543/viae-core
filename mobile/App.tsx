import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { NavigationMapScreen } from './src/screens/NavigationMapScreen';
import { COLORS } from './src/theme/theme';

type ActiveScreen = 'dashboard' | 'qr-scanner' | 'map';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          onOpenScanner={() => setCurrentScreen('qr-scanner')}
          onOpenMap={() => setCurrentScreen('map')}
        />
      )}
      {currentScreen === 'qr-scanner' && (
        <QRScannerScreen onBack={() => setCurrentScreen('dashboard')} />
      )}
      {currentScreen === 'map' && (
        <NavigationMapScreen onBack={() => setCurrentScreen('dashboard')} />
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
