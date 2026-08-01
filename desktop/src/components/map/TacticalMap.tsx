import { useEffect, useRef, useState } from 'react';
import { Marker, LngLatBounds } from 'maplibre-gl';
import { listen } from '@tauri-apps/api/event';
import 'maplibre-gl/dist/maplibre-gl.css';
import './TacticalMap.css';
import POIPopup from '../popups/POIPopup.tsx';
import MarkerPopup from '../popups/MarkerPopup.tsx';
import SearchBar from './SearchBar.tsx';
import { THEMES, setupMapLibre } from '../../utils/mapConfig.ts';
import { parseCoordinates } from '../../utils/mapUtils.ts';
import { useTacticalMap } from '../../hooks/useTacticalMap.ts';
import { useWaypoints } from '../../context/WaypointContext.tsx';
import LeftPanel from '../panel/LeftPanel.tsx';
import PrintModal from '../popups/PrintModal.tsx';
import EditPopup from '../popups/EditPopup.tsx';
import TitlePopup from '../popups/TitlePopup.tsx';
import RangeFinderTool from '../popups/RangeFinderTool.tsx';
import HelpWikiModal from '../wiki/HelpWikiModal.tsx';

setupMapLibre();

interface TacticalMapProps {
    activeMapFile?: string;
}

export default function TacticalMap({ activeMapFile = "default.mbtiles" }: TacticalMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState('osm-bright');
    const [search, setSearch] = useState('');
    const [titlePopup, setTitlePopup] = useState(false);
    const [rangeFinderOpen, setRangeFinderOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpModalTab, setHelpModalTab] = useState<'guide' | 'hotkeys' | 'about'>('guide');

    const { tripData, setTripData, waypoints } = useWaypoints();

    const {
        mapInstance,
        searchMarker,
        poiPopup, setPoiPopup,
        poiData,
        markerPopup, setMarkerPopup,
        markerData, setMarkerData,
        editPopup, setEditPopup,
        editData, setEditData,
        clearSearchMarker
    } = useTacticalMap(mapContainer, activeMapFile, theme);

    const flyToWaypoint = (lat: number, lng: number) => {
        if (mapInstance.current) {
            mapInstance.current.flyTo({
                center: [lng, lat],
                zoom: 16,
                speed: 1.5
            });
        }
    };

    const zoomToTrip = (points = waypoints) => {
        if (mapInstance.current && points && points.length > 0) {
            const bounds = new LngLatBounds();
            if (points.length > 0) {
                bounds.extend([points[0].lng, points[0].lat]);
            }
            points.forEach((wp: any) => {
                bounds.extend([wp.lng, wp.lat]);
            });
            
            mapInstance.current.fitBounds(bounds, {
                padding: { top: 80, bottom: 80, left: 400, right: 80 },
                maxZoom: 15,
                speed: 1.2
            });
        }
    };

    const executeSearch = () => {
        if (!mapInstance.current || !search) return;

        const coords = parseCoordinates(search);

        if (coords) {
            mapInstance.current.flyTo({
                center: [coords.lng, coords.lat],
                zoom: 16,
                speed: 1.5
            });

            if (searchMarker.current) {
                searchMarker.current.setLngLat([coords.lng, coords.lat]);
            } else {
                searchMarker.current = new Marker({ color: '#38bdf8' })
                    .setLngLat([coords.lng, coords.lat])
                    .addTo(mapInstance.current);
            }

            setPoiPopup(false);
            setEditPopup(false);
            setMarkerData(coords);
            setMarkerPopup(true);
        }
    };

    useEffect(() => {
        const unlisten = listen<string>('change-theme', (event) => {
            setTheme(event.payload);
        });

        const handleTripLoaded = (e: Event) => {
            const customEvent = e as CustomEvent;
            const loadedWaypoints = customEvent.detail;
            
            if (mapInstance.current && loadedWaypoints && loadedWaypoints.length > 0) {
                zoomToTrip(loadedWaypoints);
            }
        };

        const unlistenRangeFinder = listen('toggle-range-finder', () => {
            setRangeFinderOpen(prev => !prev);
        });

        const unlistenHelp = listen<string>('open-help-wiki', (event) => {
            const targetTab = (event.payload as 'guide' | 'hotkeys' | 'about') || 'guide';
            setHelpModalTab(targetTab);
            setHelpModalOpen(true);
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setHelpModalTab('guide');
                setHelpModalOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setHelpModalOpen(false);
            }
        };

        window.addEventListener('trip-loaded', handleTripLoaded);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            unlisten.then(f => f());
            unlistenRangeFinder.then(f => f());
            unlistenHelp.then(f => f());
            window.removeEventListener('trip-loaded', handleTripLoaded);
            window.removeEventListener('keydown', handleKeyDown);
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
            <POIPopup display={poiPopup} setDisplay={setPoiPopup} data={poiData} onAdd={clearSearchMarker} />
            <MarkerPopup display={markerPopup} setDisplay={setMarkerPopup} data={markerData} onAdd={clearSearchMarker} />
            <EditPopup display={editPopup} setDisplay={setEditPopup} data={editData} />
            <RangeFinderTool display={rangeFinderOpen} setDisplay={setRangeFinderOpen} mapInstance={mapInstance} />
            <SearchBar search={search} setSearch={setSearch} onSearch={executeSearch} poiOpen={poiPopup || markerPopup || editPopup || titlePopup} />
            <LeftPanel
                openEdit={(data) => {
                    setEditData(data);
                    setEditPopup(true);
                    setPoiPopup(false);
                    setMarkerPopup(false);
                    setTitlePopup(false);
                    flyToWaypoint(data.lat, data.lng);
                }}
                openTripSettings={() => {
                    setTitlePopup(true);
                    setPoiPopup(false);
                    setMarkerPopup(false);
                    setEditPopup(false);
                }}
                openPrint={() => setPrintModalOpen(true)}
                flyToWaypoint={flyToWaypoint}
                zoomToTrip={() => zoomToTrip(waypoints)}
            />
            <TitlePopup display={titlePopup} setDisplay={setTitlePopup} tripData={tripData} setTripData={setTripData} />
            <PrintModal display={printModalOpen} setDisplay={setPrintModalOpen} />
            <HelpWikiModal display={helpModalOpen} setDisplay={setHelpModalOpen} initialTab={helpModalTab} />
        </div>
    );
}
