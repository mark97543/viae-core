import { useEffect, useRef, useState } from 'react';
import { Map, addProtocol, setWorkerUrl, NavigationControl, Popup, Marker } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import 'maplibre-gl/dist/maplibre-gl.css';
import './TacticalMap.css';
import POIPopup from './popups/POIPopup';
import MarkerPopup from './popups/MarkerPopup';
import SearchBar from './Gui Items/SearchBar';

const THEMES = [
    'dark-matter',
    'positron',
    'osm-bright', //So Far Default 2
    'toner',
    'fiord-color',
    'klokantech-3d',
    'klokantech-basic', //So Far Default 1
    'osm-liberty',
    'maptiler-basic',
    'maptiler-3d'
];

// Register a custom protocol for mbtiles. 
// Maplibre will call this whenever it needs a tile starting with "mbtiles://"
setWorkerUrl(workerUrl);

addProtocol('mbtiles', async (params) => {
    const url = new URL(params.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const z = parseInt(parts[0]);
    const x = parseInt(parts[1]);
    const y = parseInt(parts[2]);

    try {
        const data = await invoke<number[]>('get_map_tile', { z, x, y });
        if (!data || data.length === 0) {
            return { data: new ArrayBuffer(0) };
        }

        let tileData = new Uint8Array(data);
        // Check for GZIP magic bytes (1F 8B)
        if (tileData.length >= 2 && tileData[0] === 0x1F && tileData[1] === 0x8B) {
            const stream = new Response(tileData).body?.pipeThrough(new DecompressionStream("gzip"));
            tileData = new Uint8Array(await new Response(stream).arrayBuffer());
        }

        return { data: tileData.buffer };
    } catch (err) {
        console.warn("Tile fetch error:", err);
        return { data: new ArrayBuffer(0) };
    }
});

interface TacticalMapProps {
    activeMapFile?: string;
}

export default function TacticalMap({ activeMapFile = "default.mbtiles" }: TacticalMapProps) {

    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<Map | null>(null);
    const searchMarker = useRef<Marker | null>(null);
    const [theme, setTheme] = useState('osm-bright');
    const [poiPopup, setPoiPopup] = useState(false);
    const [poiData, setPoiData] = useState('');
    const [markerPopup, setMarkerPopup] = useState(false);
    const [markerData, setMarkerData] = useState<{lat: number, lng: number} | null>(null);
    const [search, setSearch] = useState('');

    // Fly to coordinates only when requested
    const executeSearch = () => {
        if (!mapInstance.current || !search) return;

        // Parse things like "38.9, -77.03" or "38.9 -77.03"
        const parts = search.split(/[,\s]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

        if (parts.length === 2) {
            const lat = parts[0];
            const lng = parts[1];

            // Basic coordinate validation (-90 to 90 lat, -180 to 180 lng)
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                mapInstance.current.flyTo({
                    center: [lng, lat],
                    zoom: 16,
                    speed: 1.5 // Gives it a nice tactical swoop
                });

                // Drop or move the pin
                if (searchMarker.current) {
                    searchMarker.current.setLngLat([lng, lat]);
                } else {
                    searchMarker.current = new Marker({ color: '#38bdf8' }) // Tactical cyan to match the theme
                        .setLngLat([lng, lat])
                        .addTo(mapInstance.current);
                }

                //Setup the Poi panel
                setPoiPopup(false);
                setMarkerData({ lat, lng });
                setMarkerPopup(true);
            }
        }
    };

    useEffect(() => {
        const unlisten = listen<string>('change-theme', (event) => {
            setTheme(event.payload);
        });



        return () => {
            unlisten.then(f => f());
        };
    }, []);

    useEffect(() => {
        if (!mapContainer.current) return;

        let map: Map | null = null;
        let isCancelled = false;

        // Dynamically load the selected theme JSON
        import(`./themes/${theme}.json`).then((module) => {
            if (isCancelled) return;

            const themeStyle = module.default;
            // Deep clone the style to avoid mutating the imported JSON module
            const style = JSON.parse(JSON.stringify(themeStyle));

            // Override the openmaptiles source to use our offline vector tiles
            if (style.sources.openmaptiles) {
                style.sources.openmaptiles = {
                    type: 'vector',
                    tiles: [`mbtiles://${activeMapFile}/{z}/{x}/{y}`],
                    minzoom: 0,
                    maxzoom: 14
                };
            }

            // Initialize Maplibre
            map = new Map({
                container: mapContainer.current!,
                style: style,
                center: [-98.583333, 39.833333], //Fallback
                zoom: 14,
                pitch: 55,       // Tilts the camera to show off the 3D buildings
                bearing: -17.6   // Rotates the map slightly for a cinematic view
            });
            mapInstance.current = map;

            //Fetch Dynamic map Center and Bounds from the local mbt tiles container via Rust
            invoke<Record<string, string>>('get_map_metadata').then((meta) => {
                if (meta && meta.center && map) {
                    //MBtiles standard center format is lon,lat, zoom
                    const coords = meta.center.split(',').map(Number);
                    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        const [lng, lat, zoom = 10] = coords;
                        map.flyTo({
                            center: [lng, lat],
                            zoom: zoom,
                            essential: true
                        })
                    }
                }
            })

            //POIs Logic
            map.on('load', () => {
                if (!map) return;

                // Find all layer IDs that belong to the 'poi' source-layer (which handles POI labels across different themes)
                const style = map.getStyle();
                const poiLayers = style.layers?.filter(layer => (layer as any)['source-layer'] === 'poi').map(layer => layer.id) || [];

                if (poiLayers.length > 0) {
                    //Change the cursor to a pointer when hovering over a native POI
                    map.on('mouseenter', poiLayers, () => {
                        map!.getCanvas().style.cursor = 'pointer'
                    })

                    //Reset cursor back to default when leaving poi
                    map.on('mouseleave', poiLayers, () => {
                        map!.getCanvas().style.cursor = 'grab'
                    })

                    //Click POI Event
                    map.on('click', poiLayers, async (e) => {
                        if (!e.features || e.features.length === 0) return;

                        const clickedPoi = e.features[0];
                        const coordinates = (clickedPoi.geometry as any).coordinates;
                        const lng = coordinates[0];
                        const lat = coordinates[1];
                        try {
                            const details = await invoke<any>('get_poi_details', { lat, lng })
                            console.log("Details:", details);
                            setPoiData(details);
                        } catch (err) {
                            console.warn("Could not find full POI details in local DB:", err);
                        }

                        setPoiPopup(true);
                    })

                }
            })

        }).catch(err => {
            console.error("Failed to load theme:", err);
        });

        return () => {
            isCancelled = true;
            if (map) {
                map.remove();
            }
        };
    }, [activeMapFile, theme])

    return (
        <div className="tactical-map-container">
            <div ref={mapContainer} className="tactical-map" />
            <div className="absolute top-4 left-4 z-10 bg-neutral-900 bg-opacity-80 p-2 rounded border border-neutral-700">
                <select
                    className="bg-transparent text-white font-semibold outline-none cursor-pointer"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                >
                    {THEMES.map(t => <option key={t} value={t} className="bg-neutral-800 text-white">{t}</option>)}
                </select>
            </div>
            <POIPopup display={poiPopup} setDisplay={setPoiPopup} data={poiData} />
            <MarkerPopup display={markerPopup} setDisplay={setMarkerPopup} data={markerData} />
            <SearchBar search={search} setSearch={setSearch} executeSearch={executeSearch} poiOpen={poiPopup || markerPopup} />
        </div>
    )
}