import { useEffect, useRef, useState } from 'react';
import { Marker } from 'maplibre-gl';
import { listen } from '@tauri-apps/api/event';
import 'maplibre-gl/dist/maplibre-gl.css';
import './TacticalMap.css';
import POIPopup from './popups/POIPopup';
import MarkerPopup from './popups/MarkerPopup';
import SearchBar from './Gui Items/SearchBar';
import { THEMES, setupMapLibre } from './mapConfig';
import { parseCoordinates } from './mapUtils';
import { useTacticalMap } from './hooks/useTacticalMap';

// Initialize the map worker and custom mbtiles protocol globally
setupMapLibre();
interface TacticalMapProps {
    activeMapFile?: string;
}

export default function TacticalMap({ activeMapFile = "default.mbtiles" }: TacticalMapProps) {

    const mapContainer = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState('osm-bright');
    const [search, setSearch] = useState('');

    const {
        mapInstance,
        searchMarker,
        poiPopup, setPoiPopup,
        poiData,
        markerPopup, setMarkerPopup,
        markerData, setMarkerData
    } = useTacticalMap(mapContainer, activeMapFile, theme);

    // Fly to coordinates only when requested
    const executeSearch = () => {
        if (!mapInstance.current || !search) return;

        const coords = parseCoordinates(search);

        if (coords) {
            mapInstance.current.flyTo({
                center: [coords.lng, coords.lat],
                zoom: 16,
                speed: 1.5 // Gives it a nice tactical swoop
            });

            // Drop or move the pin
            if (searchMarker.current) {
                searchMarker.current.setLngLat([coords.lng, coords.lat]);
            } else {
                searchMarker.current = new Marker({ color: '#38bdf8' }) // Tactical cyan to match the theme
                    .setLngLat([coords.lng, coords.lat])
                    .addTo(mapInstance.current);
            }

            //Setup the Poi panel
            setPoiPopup(false);
            setMarkerData(coords);
            setMarkerPopup(true);
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
            <SearchBar search={search} setSearch={setSearch} onSearch={executeSearch} poiOpen={poiPopup || markerPopup} />
        </div>
    )
}