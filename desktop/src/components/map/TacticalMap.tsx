import { useRef, useState, useEffect } from 'react';
import './TacticalMap.css';
import { useTacticalMap } from '../../hooks/useTacticalMap';
import POIPopup from '../popups/POIPopup';
import MarkerPopup from '../popups/MarkerPopup';
import TitlePopup from '../popups/TitlePopup';
import RangeFinderTool from '../popups/RangeFinderTool';
import SearchBar from './SearchBar';
import LeftPanel from '../panel/LeftPanel';
import PrintModal from '../popups/PrintModal';
import EditPopup from '../popups/EditPopup';
import HelpWikiModal from '../wiki/HelpWikiModal';
import { MobileSyncModal } from '../popups/MobileSyncModal';
import { useWaypoints } from '../../context/WaypointContext';
import { LngLatBounds, Marker } from 'maplibre-gl';
import { listen } from '@tauri-apps/api/event';
import { setupMapLibre } from '../../utils/mapConfig';

const THEMES = [
    'osm-bright', 'klokantech-basic', 'klokantech-3d', 'osm-liberty', 
    'maptiler-basic', 'maptiler-3d', 'toner', 'fiord-color', 'dark-matter', 'positron'
];

setupMapLibre();

function parseCoordinates(input: string): { lat: number; lng: number } | null {
    const clean = input.trim();
    const parts = clean.split(/[\s,]+/);
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }
    return null;
}

interface TacticalMapProps {
    activeMapFile?: string;
    readOnly?: boolean;
}

export default function TacticalMap({ activeMapFile = "default.mbtiles", readOnly = false }: TacticalMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState('osm-bright');
    const [search, setSearch] = useState('');
    const [titlePopup, setTitlePopup] = useState(false);
    const [rangeFinderOpen, setRangeFinderOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpModalTab, setHelpModalTab] = useState<'guide' | 'hotkeys' | 'about'>('guide');

    const [mobileSyncOpen, setMobileSyncOpen] = useState(false);
    const [mobileSyncTab, setMobileSyncTab] = useState<'sync' | 'provision'>('sync');

    const { tripData, setTripData, waypoints } = useWaypoints();

    const {
        mapInstance,
        searchMarker,
        poiPopup, setPoiPopup,
        poiData,
        markerPopup, setMarkerPopup,
        markerData,
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
                searchMarker.current = new Marker({ color: '#ff0000' })
                    .setLngLat([coords.lng, coords.lat])
                    .addTo(mapInstance.current);
            }
        }
    };

    useEffect(() => {
        if (rangeFinderOpen) {
            setPoiPopup(false);
            setMarkerPopup(false);
            setEditPopup(false);
            setTitlePopup(false);
        }
    }, [rangeFinderOpen]);

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

        const unlistenMobile = listen<string>('open-mobile-sync', (event) => {
            const tab = (event.payload as 'sync' | 'provision') || 'sync';
            setMobileSyncTab(tab);
            setMobileSyncOpen(true);
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setHelpModalTab('guide');
                setHelpModalOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setHelpModalOpen(false);
                setMobileSyncOpen(false);
            }
        };

        window.addEventListener('trip-loaded', handleTripLoaded);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            unlisten.then(f => f());
            unlistenRangeFinder.then(f => f());
            unlistenHelp.then(f => f());
            unlistenMobile.then(f => f());
            window.removeEventListener('trip-loaded', handleTripLoaded);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    if (readOnly) {
        return (
            <div className="tactical-map-container">
                <div ref={mapContainer} className="tactical-map" />
            </div>
        );
    }

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
            <MobileSyncModal display={mobileSyncOpen} setDisplay={setMobileSyncOpen} initialTab={mobileSyncTab} />
        </div>
    );
}
