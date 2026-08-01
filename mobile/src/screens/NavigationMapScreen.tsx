import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, FONTS } from '../theme/theme';

interface NavigationMapScreenProps {
  activeMapName?: string;
  vaultDir?: string;
  onBack: () => void;
}

export const NavigationMapScreen: React.FC<NavigationMapScreenProps> = ({
  activeMapName = 'district-of-columbia-260723.mbtiles',
  vaultDir = '/sdcard/IterViaeNavus/maps/',
  onBack,
}) => {
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="file:///android_asset/maplibre-gl.css" rel="stylesheet" />
      <script src="file:///android_asset/maplibre-gl.js"></script>
      <script src="file:///android_asset/sql-wasm.js"></script>
      <style>
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #070b14; color: #f8fafc; font-family: monospace, sans-serif; overflow: hidden; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; background: #070b14; }
        .map-badge {
          position: absolute;
          bottom: 20px;
          left: 16px;
          background: rgba(10, 15, 29, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.4);
          padding: 8px 14px;
          border-radius: 8px;
          color: #38bdf8;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 1px;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .maplibre-ctrl-attrib { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="map-badge" id="mapBadge">VAULT: ${activeMapName}</div>
      <script>
        const activeMapFile = "${activeMapName}";
        let vaultPath = "${vaultDir}".replace('file://', '');
        if (!vaultPath.endsWith('/')) vaultPath += '/';

        let sqliteDb = null;
        let dbLoadedPromise = null;

        async function initMBTilesDatabase() {
          try {
            const SQL = await initSqlJs({ locateFile: file => 'file:///android_asset/' + file });
            
            let primaryPath = vaultPath;
            if (primaryPath.startsWith('/sdcard/')) {
              primaryPath = primaryPath.replace('/sdcard/', '/storage/emulated/0/');
            }

            const candidateUrls = [
              'file://' + primaryPath + activeMapFile,
              'file:///storage/emulated/0/IterViaeNavus/maps/' + activeMapFile,
              'file:///storage/emulated/0/Android/data/com.iterviae.navus/files/maps/' + activeMapFile,
              'file:///sdcard/IterViaeNavus/maps/' + activeMapFile
            ];

            let buffer = null;
            for (const fileUrl of candidateUrls) {
              try {
                const response = await fetch(fileUrl);
                if (response.ok) {
                  buffer = await response.arrayBuffer();
                  console.log('Successfully fetched MBTiles from:', fileUrl);
                  break;
                }
              } catch (err) {}
            }

            if (!buffer || buffer.byteLength === 0) {
              throw new Error('Could not load MBTiles from candidate paths');
            }

            sqliteDb = new SQL.Database(new Uint8Array(buffer));
            console.log('MBTiles loaded successfully into SQL.js!');

            // Query bounds / center metadata and flyTo
            try {
              const stmt = sqliteDb.prepare("SELECT name, value FROM metadata WHERE name IN ('center', 'bounds')");
              let centerStr = null;
              let boundsStr = null;
              while (stmt.step()) {
                const row = stmt.getAsObject();
                if (row.name === 'center') centerStr = row.value;
                if (row.name === 'bounds') boundsStr = row.value;
              }
              stmt.free();

              if (centerStr) {
                const parts = centerStr.split(',').map(Number);
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  map.flyTo({ center: [parts[0], parts[1]], zoom: parts[2] || 12, duration: 1000 });
                }
              } else if (boundsStr) {
                const parts = boundsStr.split(',').map(Number);
                if (parts.length === 4) {
                  map.flyTo({ center: [(parts[0] + parts[2]) / 2, (parts[1] + parts[3]) / 2], zoom: 12, duration: 1000 });
                }
              }
            } catch (metaErr) {
              console.warn('Metadata resolution warning:', metaErr);
            }

            return sqliteDb;
          } catch (e) {
            console.error('Error initializing MBTiles database:', e);
            throw e;
          }
        }

        dbLoadedPromise = initMBTilesDatabase();

        maplibregl.addProtocol('mbtiles', async (params, abortController) => {
          if (!sqliteDb) {
            try {
              await dbLoadedPromise;
            } catch (e) {
              throw new Error('MBTiles DB unavailable');
            }
          }

          const parts = params.url.replace('mbtiles://', '').split('/');
          if (parts.length < 3) throw new Error('Invalid mbtiles URI');

          const z = parseInt(parts[0], 10);
          const x = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          const tmsY = (1 << z) - 1 - y;

          try {
            const stmt = sqliteDb.prepare("SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?");
            stmt.bind([z, x, tmsY]);
            if (stmt.step()) {
              const row = stmt.getAsObject();
              const tileBytes = row.tile_data;
              stmt.free();
              return { data: tileBytes.buffer, contentEncoding: 'gzip' };
            }
            stmt.free();
          } catch (err) {
            console.warn('Tile query error:', err);
          }
          throw new Error('Tile empty');
        });

        const map = new maplibregl.Map({
          container: 'map',
          style: {
            version: 8,
            name: 'Tactical Dark Air-Gapped',
            sources: {
              'openmaptiles': {
                type: 'vector',
                tiles: ['mbtiles://{z}/{x}/{y}'],
                minzoom: 0,
                maxzoom: 14
              }
            },
            layers: [
              {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#0a0f1d' }
              },
              {
                id: 'water',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'water',
                paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.6 }
              },
              {
                id: 'landcover-grass',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'landcover',
                filter: ['==', 'class', 'grass'],
                paint: { 'fill-color': '#15803d', 'fill-opacity': 0.25 }
              },
              {
                id: 'transportation-roads',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#38bdf8',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 4]
                }
              },
              {
                id: 'building',
                type: 'fill-extrusion',
                source: 'openmaptiles',
                'source-layer': 'building',
                paint: {
                  'fill-extrusion-color': '#1e293b',
                  'fill-extrusion-height': ['get', 'render_height'],
                  'fill-extrusion-base': ['get', 'render_min_height'],
                  'fill-extrusion-opacity': 0.8
                }
              }
            ]
          },
          center: [-77.0369, 38.9072],
          zoom: 12,
          pitch: 35
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* HUD Telemetry Banner */}
      <View style={styles.hudOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← DASHBOARD</Text>
        </TouchableOpacity>

        <View style={styles.activeMapInfo}>
          <Text style={styles.activeMapLabel} numberOfLines={1}>
            {activeMapName}
          </Text>
        </View>

        <View style={styles.telemetryGroup}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryVal}>0</Text>
            <Text style={styles.telemetryUnit}>MPH</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryVal}>340°</Text>
            <Text style={styles.telemetryUnit}>BEARING</Text>
          </View>
        </View>
      </View>

      {/* MapLibre GL WebView Map Viewport */}
      <View style={styles.mapViewport}>
        <WebView
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
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
    backgroundColor: 'rgba(10, 15, 29, 0.95)',
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
  activeMapInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  activeMapLabel: {
    fontSize: 11,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
    fontFamily: FONTS.monospace,
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
    fontSize: 18,
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
    height: 18,
    backgroundColor: COLORS.surfaceBorder,
  },
  mapViewport: {
    flex: 1,
    backgroundColor: '#070b14',
  },
});
