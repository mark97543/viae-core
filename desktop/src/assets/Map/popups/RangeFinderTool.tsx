import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWaypoints } from '../../../context/WaypointContext';
import * as turf from '@turf/turf';
import * as maplibregl from 'maplibre-gl';
import './RangeFinder.css';

interface RangeFinderToolProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    mapInstance: React.RefObject<maplibregl.Map | null>;
}

export default function RangeFinderTool({ display, setDisplay, mapInstance }: RangeFinderToolProps) {
    const { waypoints, routeData } = useWaypoints();
    const [fuelRange, setFuelRange] = useState<number>(200); // Default 200 miles
    const markersRef = useRef<maplibregl.Marker[]>([]);

    const clearMap = () => {
        const map = mapInstance.current;
        if (!map) return;

        // Clear markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Clear layers/sources
        if (map.getLayer('range-finder-buffer')) map.removeLayer('range-finder-buffer');
        if (map.getSource('range-finder-source')) map.removeSource('range-finder-source');
        if (map.getLayer('range-finder-green-buffer')) map.removeLayer('range-finder-green-buffer');
        if (map.getSource('range-finder-green-buffer-source')) map.removeSource('range-finder-green-buffer-source');
        if (map.getLayer('range-finder-green-circles')) map.removeLayer('range-finder-green-circles');
        if (map.getSource('range-finder-green-source')) map.removeSource('range-finder-green-source');
    };

    // Auto-clear when closed
    useEffect(() => {
        if (!display) {
            clearMap();
        }
    }, [display]);

    const calculateRange = () => {
        const map = mapInstance.current;
        if (!map || !routeData || !routeData.geometry) return;

        clearMap();

        const fullRouteFeatures = routeData.geometry.features;
        if (!fullRouteFeatures || fullRouteFeatures.length === 0) return;

        // Merge all legs into one single continuous LineString for turf distance calculations
        let allCoords: [number, number][] = [];
        fullRouteFeatures.forEach((f: any) => {
            if (f.geometry && f.geometry.coordinates) {
                // If appending a new leg, drop the first coordinate if it matches the last of the previous leg to avoid duplicates, 
                // but turf handles multiple segments fine if we just concat.
                if (allCoords.length > 0) {
                    allCoords = allCoords.concat(f.geometry.coordinates.slice(1));
                } else {
                    allCoords = allCoords.concat(f.geometry.coordinates);
                }
            }
        });

        if (allCoords.length < 2) return;
        const mainLine = turf.lineString(allCoords);

        // Find fuel waypoints
        let fuelWaypoints = waypoints.filter(wp => wp.type === 'fuel');
        if (waypoints.length > 0 && waypoints[0].type !== 'fuel') {
            fuelWaypoints = [waypoints[0], ...fuelWaypoints];
        }
        
        const greenCircles: any[] = [];

        // We need to calculate distance of each fuel waypoint along the route
        // We can do this by snapping each fuel waypoint to the route line.
        const fuelStopDistances = fuelWaypoints.map(wp => {
            const pt = turf.point([wp.lng, wp.lat]);
            const snapped = turf.nearestPointOnLine(mainLine, pt);
            return snapped.properties.location || 0; // distance in kilometers
        });

        // We will sort fuel stops by distance along route to process sequentially
        fuelStopDistances.sort((a, b) => a - b);
        
        const rangeMiles = fuelRange;
        
        let redSearchAreas: any[] = [];
        let greenSearchAreas: any[] = [];
        
        let currentRefDistance = 0; // Starting point (0 miles)

        // Add the end of the route as a pseudo-fuel stop for the final stretch calculation
        const totalLengthMiles = turf.length(mainLine, { units: 'miles' });
        const allDistances = [...fuelStopDistances.map(d => turf.convertLength(d, 'kilometers', 'miles')), totalLengthMiles];

        allDistances.forEach((dist, index) => {
            const legDistance = dist - currentRefDistance;
            
            // If it's an actual fuel stop (not the end of route) and it's within 110%
            if (index < fuelStopDistances.length && legDistance <= rangeMiles * 1.1) {
                const wp = fuelWaypoints[index];
                greenCircles.push(turf.point([wp.lng, wp.lat]));
            }
            
            let startSlice = currentRefDistance + (rangeMiles * 0.2);
            let endSlice = dist; // default to the stop distance
            
            if (legDistance > rangeMiles * 1.1) {
                // Gap is too large: red oval up to 110%
                endSlice = currentRefDistance + (rangeMiles * 1.1);
                if (endSlice > dist) endSlice = dist;
                if (startSlice > dist) startSlice = dist;
                
                if (startSlice < endSlice) {
                    const slicedLine = turf.lineSliceAlong(mainLine, startSlice, endSlice, { units: 'miles' });
                    const buffer = turf.buffer(slicedLine, rangeMiles * 0.1, { units: 'miles' });
                    if (buffer) redSearchAreas.push(buffer);
                }
            } else {
                // Gap is safe: green oval up to the stop
                if (startSlice > dist) startSlice = dist;
                
                if (startSlice < endSlice) {
                    const slicedLine = turf.lineSliceAlong(mainLine, startSlice, endSlice, { units: 'miles' });
                    const buffer = turf.buffer(slicedLine, rangeMiles * 0.1, { units: 'miles' });
                    if (buffer) greenSearchAreas.push(buffer);
                }
            }
            
            currentRefDistance = dist;
        });

        // 1. Draw Green Circles
        if (greenCircles.length > 0) {
            map.addSource('range-finder-green-source', {
                type: 'geojson',
                data: turf.featureCollection(greenCircles)
            });
            map.addLayer({
                id: 'range-finder-green-circles',
                type: 'circle',
                source: 'range-finder-green-source',
                paint: {
                    'circle-radius': 12,
                    'circle-color': '#22c55e',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        // 2. Draw Red & Green Oval Search Areas
        if (greenSearchAreas.length > 0) {
            map.addSource('range-finder-green-buffer-source', {
                type: 'geojson',
                data: turf.featureCollection(greenSearchAreas)
            });
            map.addLayer({
                id: 'range-finder-green-buffer',
                type: 'fill',
                source: 'range-finder-green-buffer-source',
                paint: {
                    'fill-color': '#22c55e',
                    'fill-opacity': 0.2,
                    'fill-outline-color': '#22c55e'
                }
            }, 'tactical-waypoints-layer');
        }

        if (redSearchAreas.length > 0) {
            map.addSource('range-finder-source', {
                type: 'geojson',
                data: turf.featureCollection(redSearchAreas)
            });
            
            map.addLayer({
                id: 'range-finder-buffer',
                type: 'fill',
                source: 'range-finder-source',
                paint: {
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.3,
                    'fill-outline-color': '#ef4444'
                }
            }, 'tactical-waypoints-layer'); // Render just below waypoints
            
            // To query POIs, we query the native backend gazetteer instead of relying on frontend tiles
            invoke('search_pois_by_category', { category: 'fuel' }).then((fuelPois: any) => {
                const uniquePois = new Map();
                
                fuelPois.forEach((poi: any) => {
                    const pt = turf.point([poi.lng, poi.lat]);
                    // Check if it falls inside any of our RED search areas
                    for (const area of redSearchAreas) {
                        if (turf.booleanPointInPolygon(pt, area)) {
                            uniquePois.set(poi.id, poi);
                            break;
                        }
                    }
                });

                // Draw yellow markers for found POIs
                uniquePois.forEach(poi => {
                    const el = document.createElement('div');
                    el.className = 'range-finder-yellow-marker';
                    
                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat([poi.lng, poi.lat])
                        .addTo(map);
                    
                    markersRef.current.push(marker);
                });
            }).catch(console.error);
            
            // Zoom to fit all search areas
            const allAreas = [...redSearchAreas, ...greenSearchAreas];
            if (allAreas.length > 0) {
                const bbox = turf.bbox(turf.featureCollection(allAreas));
                map.fitBounds(bbox as [number, number, number, number], { padding: 50, duration: 1000 });
            }
        }
    };

    return (
        <div className={`range-finder-popup ${display ? 'open' : ''}`}>
            <h2>Range Finder</h2>
            <div className="range-finder-content">
                <label className="edit-form-label">Vehicle Fuel Range (miles)</label>
                <input 
                    type="number" 
                    className="edit-form-input" 
                    value={fuelRange} 
                    onChange={e => setFuelRange(Number(e.target.value))}
                />
                
                <div className="range-finder-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                    <button className="poi-close-btn" style={{ flex: 1, margin: 0 }} onClick={clearMap}>Reset</button>
                    <button className="poi-add-btn" style={{ flex: 1, margin: 0 }} onClick={calculateRange}>Calculate</button>
                    <div style={{ flexBasis: '100%', height: '4px' }}></div>
                    <button className="poi-close-btn" style={{ flex: 1, margin: 0 }} onClick={() => setDisplay(false)}>Close</button>
                </div>
            </div>
        </div>
    );
}
