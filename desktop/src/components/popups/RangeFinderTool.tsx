import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWaypoints } from '../../context/WaypointContext.tsx';
import * as turf from '@turf/turf';
import * as maplibregl from 'maplibre-gl';
import './RangeFinder.css';

interface RangeFinderToolProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    mapInstance: React.RefObject<maplibregl.Map | null>;
}

export default function RangeFinderTool({ display, setDisplay, mapInstance }: RangeFinderToolProps) {
    const { waypoints, routeData, addWaypoint } = useWaypoints();
    const [fuelRange, setFuelRange] = useState<number>(200);

    const clearMap = () => {
        const map = mapInstance.current;
        if (!map) return;

        if (map.getLayer('range-finder-buffer')) map.removeLayer('range-finder-buffer');
        if (map.getSource('range-finder-source')) map.removeSource('range-finder-source');
        if (map.getLayer('range-finder-green-buffer')) map.removeLayer('range-finder-green-buffer');
        if (map.getSource('range-finder-green-buffer-source')) map.removeSource('range-finder-green-buffer-source');
        if (map.getLayer('range-finder-green-circles')) map.removeLayer('range-finder-green-circles');
        if (map.getSource('range-finder-green-source')) map.removeSource('range-finder-green-source');
        
        if (map.getLayer('range-finder-pois-layer')) map.removeLayer('range-finder-pois-layer');
        if (map.getSource('range-finder-pois-source')) map.removeSource('range-finder-pois-source');
        
        if ((map as any)._rangeFinderPoiClick) {
            map.off('click', 'range-finder-pois-layer', (map as any)._rangeFinderPoiClick);
            (map as any)._rangeFinderPoiClick = null;
        }
    };

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

        let allCoords: [number, number][] = [];
        fullRouteFeatures.forEach((f: any) => {
            if (f.geometry && f.geometry.coordinates) {
                if (allCoords.length > 0) {
                    allCoords = allCoords.concat(f.geometry.coordinates.slice(1));
                } else {
                    allCoords = allCoords.concat(f.geometry.coordinates);
                }
            }
        });

        if (allCoords.length < 2) return;
        const mainLine = turf.lineString(allCoords);

        let fuelWaypoints = waypoints.filter(wp => wp.type === 'fuel');
        if (waypoints.length > 0 && waypoints[0].type !== 'fuel') {
            fuelWaypoints = [waypoints[0], ...fuelWaypoints];
        }
        
        const greenCircles: any[] = [];

        const fuelStopDistances = fuelWaypoints.map(wp => {
            const pt = turf.point([wp.lng, wp.lat]);
            const snapped = turf.nearestPointOnLine(mainLine, pt);
            return snapped.properties.location || 0;
        });

        fuelStopDistances.sort((a, b) => a - b);
        
        const rangeMiles = fuelRange;
        
        let redSearchAreas: any[] = [];
        let greenSearchAreas: any[] = [];
        
        let currentRefDistance = 0;

        const totalLengthMiles = turf.length(mainLine, { units: 'miles' });
        const allDistances = [...fuelStopDistances.map(d => turf.convertLength(d, 'kilometers', 'miles')), totalLengthMiles];

        allDistances.forEach((dist, index) => {
            const legDistance = dist - currentRefDistance;
            
            if (index < fuelStopDistances.length && legDistance <= rangeMiles * 1.1) {
                const wp = fuelWaypoints[index];
                greenCircles.push(turf.point([wp.lng, wp.lat]));
            }
            
            let startSlice = currentRefDistance + (rangeMiles * 0.2);
            let endSlice = dist;
            
            if (legDistance > rangeMiles * 1.1) {
                endSlice = currentRefDistance + (rangeMiles * 1.1);
                if (endSlice > dist) endSlice = dist;
                if (startSlice > dist) startSlice = dist;
                
                if (startSlice < endSlice) {
                    const slicedLine = turf.lineSliceAlong(mainLine, startSlice, endSlice, { units: 'miles' });
                    const buffer = turf.buffer(slicedLine, rangeMiles * 0.1, { units: 'miles' });
                    if (buffer) redSearchAreas.push(buffer);
                }
            } else {
                if (startSlice > dist) startSlice = dist;
                
                if (startSlice < endSlice) {
                    const slicedLine = turf.lineSliceAlong(mainLine, startSlice, endSlice, { units: 'miles' });
                    const buffer = turf.buffer(slicedLine, rangeMiles * 0.1, { units: 'miles' });
                    if (buffer) greenSearchAreas.push(buffer);
                }
            }
            
            currentRefDistance = dist;
        });

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
            }, 'tactical-waypoints-layer');
            
            invoke('search_pois_by_category', { category: 'fuel' }).then((fuelPois: any) => {
                const uniquePois = new Map();
                
                fuelPois.forEach((poi: any) => {
                    const pt = turf.point([poi.lng, poi.lat]);
                    for (const area of redSearchAreas) {
                        if (turf.booleanPointInPolygon(pt, area)) {
                            uniquePois.set(poi.id, poi);
                            break;
                        }
                    }
                });

                const poiFeatures = Array.from(uniquePois.values()).map(poi => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [poi.lng, poi.lat] },
                    properties: {
                        id: poi.id,
                        name: poi.name || 'Gas Station',
                        lat: poi.lat,
                        lng: poi.lng,
                    }
                }));

                map.addSource('range-finder-pois-source', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: poiFeatures as any }
                });

                if (!map.hasImage('range-finder-fuel-icon')) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 40;
                    canvas.height = 40;
                    const ctx = canvas.getContext('2d')!;
                    ctx.scale(2, 2);
                    ctx.beginPath();
                    ctx.arc(10, 10, 8, 0, Math.PI * 2);
                    ctx.fillStyle = '#eab308';
                    ctx.fill();
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#ffffff';
                    ctx.stroke();
                    map.addImage('range-finder-fuel-icon', ctx.getImageData(0, 0, 40, 40) as any, { pixelRatio: 2 } as any);
                }

                map.addLayer({
                    id: 'range-finder-pois-layer',
                    type: 'symbol',
                    source: 'range-finder-pois-source',
                    layout: {
                        'icon-image': 'range-finder-fuel-icon',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true
                    }
                });

                map.on('mouseenter', 'range-finder-pois-layer', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'range-finder-pois-layer', () => {
                    map.getCanvas().style.cursor = '';
                });

                const onPoiClick = (e: any) => {
                    if (!e.features || e.features.length === 0) return;
                    e.preventDefault();
                    const f = e.features[0];
                    const props = f.properties;
                    addWaypoint({
                        name: props.name,
                        lat: props.lat,
                        lng: props.lng,
                        type: 'fuel',
                        description: 'Added via Range Finder'
                    });
                };

                map.on('click', 'range-finder-pois-layer', onPoiClick);
                (map as any)._rangeFinderPoiClick = onPoiClick;

            }).catch(console.error);
            
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
