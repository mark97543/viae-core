import React, { useEffect, useRef, useState } from 'react';
import './MobileNavApp.css';
import { setupMapLibre } from '../../utils/mapConfig';
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl';

setupMapLibre();

type ScreenView = 'dashboard' | 'navigation' | 'qrscanner';

interface MobileNavAppProps {
  initialMapName?: string;
}

export const MobileNavApp: React.FC<MobileNavAppProps> = ({
  initialMapName = 'district-of-columbia-260723.mbtiles',
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenView>('dashboard');
  const [activeMap, setActiveMap] = useState<string>(initialMapName);
  const [vaultPath] = useState<string>('/sdcard/IterViaeNavus/maps/');
  const [mapFiles] = useState<string[]>([
    'district-of-columbia-260723.mbtiles',
    'virginia-260723.mbtiles',
    'maryland-260723.mbtiles',
  ]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (currentScreen !== 'navigation' || !mapContainerRef.current) return;

    // Use air-gapped local mbtiles:// protocol from Rust SQLite engine
    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'Air-Gapped Tactical Mobile',
        sources: {
          'local-mbtiles': {
            type: 'vector',
            tiles: ['mbtiles://{z}/{x}/{y}'],
            minzoom: 0,
            maxzoom: 14,
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0f172a' },
          },
          {
            id: 'water-layer',
            type: 'fill',
            source: 'local-mbtiles',
            'source-layer': 'water',
            paint: { 'fill-color': '#0284c7' },
          },
          {
            id: 'roads-layer',
            type: 'line',
            source: 'local-mbtiles',
            'source-layer': 'transportation',
            paint: { 'line-color': '#94a3b8', 'line-width': 1.5 },
          },
        ],
      },
      center: [-77.0369, 38.9072],
      zoom: 12,
      pitch: 20,
    });

    map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, [currentScreen]);

  return (
    <div className="mobile-nav-container">
      {currentScreen === 'dashboard' && (
        /* Original Mobile Dashboard Screen */
        <div className="mobile-dashboard-scroll">
          {/* Header Banner */}
          <div className="mobile-dashboard-header">
            <h1 className="mobile-dashboard-title">NAVUS</h1>
            <div className="mobile-dashboard-subtitle">AIR-GAPPED HANDLEBAR HEAD UNIT</div>
            <div className="mobile-status-badge">
              <div className="mobile-status-dot" />
              <span className="mobile-status-text">GPS ACTIVE • OFFLINE VAULT</span>
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="mobile-action-grid">
            <div
              className="mobile-action-card"
              onClick={() => alert('QR Camera Scanner active for route payload.')}
            >
              <div className="mobile-action-icon">📷</div>
              <div className="mobile-action-title">SCAN QR ROUTE</div>
              <div className="mobile-action-desc">Handshake route payload from desktop or paper</div>
            </div>

            <div
              className="mobile-action-card primary"
              onClick={() => setCurrentScreen('navigation')}
            >
              <div className="mobile-action-icon">🗺️</div>
              <div className="mobile-action-title">LAUNCH MAP</div>
              <div className="mobile-action-desc">Open offline vector map & live GPS HUD</div>
            </div>
          </div>

          {/* Head Unit Configuration Card */}
          <div className="mobile-card">
            <div className="mobile-card-title">HANDLEBAR HEAD UNIT CONFIGURATION</div>
            <div className="mobile-config-row">
              <span className="mobile-config-label">SERVICE AUTOSTART:</span>
              <span className="mobile-config-val-success">BOOT_COMPLETED ACTIVE</span>
            </div>
            <div className="mobile-config-row">
              <span className="mobile-config-label">RADIO MODE:</span>
              <span className="mobile-config-val-success">AIR-GAPPED (GPS & WI-FI ONLY)</span>
            </div>
            <div className="mobile-config-row">
              <span className="mobile-config-label">POWER / IDLE OVERRIDE:</span>
              <span className="mobile-config-val-success">BATTERY WHITELISTED</span>
            </div>
            <div className="mobile-config-row">
              <span className="mobile-config-label">STANDALONE MOUNT:</span>
              <span className="mobile-config-val">UNPLUGGED HANDLEBAR READY</span>
            </div>
          </div>

          {/* Active Trip Telemetry Card */}
          <div className="mobile-card">
            <div className="mobile-card-title">ACTIVE TRIP TELEMETRY</div>
            <div className="mobile-stats-row">
              <div className="mobile-stat-box">
                <span className="mobile-stat-label">DISTANCE</span>
                <span className="mobile-stat-value">-- mi</span>
              </div>
              <div className="mobile-stat-box">
                <span className="mobile-stat-label">WAYPOINTS</span>
                <span className="mobile-stat-value">0</span>
              </div>
              <div className="mobile-stat-box">
                <span className="mobile-stat-label">EST. TIME</span>
                <span className="mobile-stat-value">-- hr</span>
              </div>
            </div>
          </div>

          {/* Vault Info Card */}
          <div className="mobile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="mobile-card-title" style={{ marginBottom: 0 }}>MAP VAULT & STORAGE</span>
              <button className="mobile-scan-btn" onClick={() => alert('Map Vault rescanned successfully.')}>
                🔄 RESCAN
              </button>
            </div>
            <div className="mobile-info-text">
              Vault Path: <span className="mobile-highlight">{vaultPath}</span>
            </div>
            <div className="mobile-info-text">
              Active Vector Archive: <span className="mobile-highlight">{activeMap}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="mobile-card-title" style={{ marginBottom: 6 }}>
                DETECTED VAULT FILES ({mapFiles.length}):
              </div>
              {mapFiles.map((file) => (
                <div
                  key={file}
                  className="mobile-info-text"
                  style={{
                    color: file === activeMap ? '#38bdf8' : '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: file === activeMap ? 700 : 400,
                  }}
                  onClick={() => setActiveMap(file)}
                >
                  • {file} {file === activeMap ? '(ACTIVE)' : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'navigation' && (
        /* Full-Screen Mobile Map Viewport */
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* HUD Telemetry Top Bar */}
          <div className="mobile-hud-overlay">
            <button className="mobile-back-btn" onClick={() => setCurrentScreen('dashboard')}>
              ← DASHBOARD
            </button>

            <div className="mobile-active-map-info">
              <span className="mobile-active-map-label">{activeMap}</span>
            </div>

            <div className="mobile-telemetry-group">
              <div className="mobile-telemetry-item">
                <span className="mobile-telemetry-val">0</span>
                <span className="mobile-telemetry-unit">MPH</span>
              </div>
              <div className="mobile-divider" />
              <div className="mobile-telemetry-item">
                <span className="mobile-telemetry-val">340°</span>
                <span className="mobile-telemetry-unit">BEARING</span>
              </div>
            </div>
          </div>

          {/* Air-Gapped Map Viewport */}
          <div ref={mapContainerRef} className="mobile-map-viewport" />

          {/* Bottom Vault Badge */}
          <div className="mobile-vault-badge">
            VAULT: {activeMap} (AIR-GAPPED)
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavApp;
