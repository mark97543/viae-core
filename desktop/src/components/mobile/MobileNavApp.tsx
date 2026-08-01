import React, { useState, useEffect } from 'react';
import './MobileNavApp.css';
import TacticalMap from '../map/TacticalMap';
import { invoke } from '@tauri-apps/api/core';

type ScreenView = 'dashboard' | 'navigation' | 'qrscanner';

interface SavedTrip {
  name: string;
  filename: string;
  path: string;
  waypoint_count: number;
}

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

  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [activeTripName, setActiveTripName] = useState<string>('No Active Trip');
  const [activeWaypointCount, setActiveWaypointCount] = useState<number>(0);

  const fetchTrips = async () => {
    try {
      const trips = await invoke<SavedTrip[]>('list_saved_trips');
      if (trips && Array.isArray(trips)) {
        setSavedTrips(trips);
      }
    } catch (err) {
      console.warn("No saved trips found or scanner error:", err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleLoadTrip = async (trip: SavedTrip) => {
    try {
      const content = await invoke<string>('load_trip_file', { path: trip.path });
      const parsed = JSON.parse(content);
      
      const waypoints = parsed.waypoints || [];
      const tripData = parsed.tripData || {};
      
      setActiveTripName(tripData.name || trip.name);
      setActiveWaypointCount(waypoints.length);

      // Dispatch custom trip-loaded event so TacticalMap zooms to trip
      window.dispatchEvent(new CustomEvent('trip-loaded', { detail: waypoints }));
      
      // Launch map view immediately
      setCurrentScreen('navigation');
    } catch (err) {
      alert("Failed to load trip file: " + err);
    }
  };

  return (
    <div className="mobile-nav-container">
      {currentScreen === 'dashboard' && (
        /* Landscape Optimized Mobile Dashboard Screen */
        <div className="mobile-dashboard-scroll">
          {/* Top Header Banner */}
          <div className="mobile-dashboard-header">
            <div className="mobile-header-left">
              <h1 className="mobile-dashboard-title">NAVUS</h1>
              <span className="mobile-dashboard-subtitle">AIR-GAPPED LANDSCAPE HEAD UNIT</span>
            </div>
            <div className="mobile-status-badge">
              <div className="mobile-status-dot" />
              <span className="mobile-status-text">GPS ACTIVE • LANDSCAPE MOUNT</span>
            </div>
          </div>

          {/* Landscape 2-Column Dashboard Grid */}
          <div className="mobile-dashboard-grid-landscape">
            {/* Left Column: Quick Actions & Trip Selector */}
            <div className="mobile-column">
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

              {/* Trip Selector & Route Loader Card */}
              <div className="mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="mobile-card-title" style={{ marginBottom: 0 }}>SAVED TRIPS & ROUTE LOADER</span>
                  <button className="mobile-scan-btn" onClick={fetchTrips}>
                    🔄 REFRESH TRIPS
                  </button>
                </div>

                {savedTrips.length === 0 ? (
                  <div className="mobile-info-text">
                    No saved trip itinerary files found on storage. Sync trips from desktop or save routes to <span className="mobile-highlight">/sdcard/IterViaeNavus/trips/</span>.
                  </div>
                ) : (
                  <div className="mobile-trip-list">
                    {savedTrips.map((t) => (
                      <div key={t.path} className="mobile-trip-item">
                        <div className="mobile-trip-info">
                          <div className="mobile-trip-name">📍 {t.name}</div>
                          <div className="mobile-trip-meta">
                            {t.waypoint_count} Waypoints • {t.filename}
                          </div>
                        </div>
                        <button
                          className="mobile-load-trip-btn"
                          onClick={() => handleLoadTrip(t)}
                        >
                          LOAD & LAUNCH
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Head Unit Config, Active Telemetry, Map Vault */}
            <div className="mobile-column">
              {/* Active Trip Telemetry Card */}
              <div className="mobile-card">
                <div className="mobile-card-title">ACTIVE TRIP TELEMETRY</div>
                <div className="mobile-info-text" style={{ marginBottom: 8 }}>
                  Active Route: <span className="mobile-highlight">{activeTripName}</span>
                </div>
                <div className="mobile-stats-row">
                  <div className="mobile-stat-box">
                    <span className="mobile-stat-label">DISTANCE</span>
                    <span className="mobile-stat-value">-- mi</span>
                  </div>
                  <div className="mobile-stat-box">
                    <span className="mobile-stat-label">WAYPOINTS</span>
                    <span className="mobile-stat-value">{activeWaypointCount}</span>
                  </div>
                  <div className="mobile-stat-box">
                    <span className="mobile-stat-label">EST. TIME</span>
                    <span className="mobile-stat-value">-- hr</span>
                  </div>
                </div>
              </div>

              {/* Head Unit Configuration Card */}
              <div className="mobile-card">
                <div className="mobile-card-title">HANDLEBAR HEAD UNIT CONFIGURATION</div>
                <div className="mobile-config-row">
                  <span className="mobile-config-label">ORIENTATION:</span>
                  <span className="mobile-config-val-success">LANDSCAPE LOCKED</span>
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
          </div>
        </div>
      )}

      {currentScreen === 'navigation' && (
        /* Full-Screen Mobile Map Viewport using TacticalMap */
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* HUD Telemetry Top Bar */}
          <div className="mobile-hud-overlay">
            <button className="mobile-back-btn" onClick={() => setCurrentScreen('dashboard')}>
              ← DASHBOARD
            </button>

            <div className="mobile-active-map-info">
              <span className="mobile-active-map-label">{activeTripName !== 'No Active Trip' ? `${activeTripName} • ` : ''}{activeMap}</span>
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

          {/* Full Tactical Map Engine (Read-Only View) */}
          <div className="mobile-map-viewport">
            <TacticalMap activeMapFile={activeMap} readOnly={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavApp;
