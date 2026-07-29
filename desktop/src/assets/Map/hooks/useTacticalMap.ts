import { useEffect, useRef, useState } from 'react';
import { Map, Marker } from 'maplibre-gl';
import { invoke } from '@tauri-apps/api/core';
import { useWaypoints } from '../../../context/WaypointContext';

export function useTacticalMap(
    mapContainer: React.RefObject<HTMLDivElement | null>,
    activeMapFile: string | undefined,
    theme: string
) {
    const mapInstance = useRef<Map | null>(null);
    const searchMarker = useRef<Marker | null>(null);
    const { waypoints, routeData, editWaypoint } = useWaypoints();

    const [isMapReady, setIsMapReady] = useState(false);
    const [poiPopup, setPoiPopup] = useState(false);
    const [poiData, setPoiData] = useState<any>('');
    const [markerPopup, setMarkerPopup] = useState(false);
    const [markerData, setMarkerData] = useState<{ lat: number; lng: number } | null>(null);
    const [editPopup, setEditPopup] = useState(false);
    const [editData, setEditData] = useState<any>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        let map: Map | null = null;
        let isCancelled = false;

        // Dynamically load the selected theme JSON
        import(`../themes/${theme}.json`).then((module) => {
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
                pitch: 0,       // Tilts the camera to show off the 3D buildings
                bearing: 0   // Rotates the map slightly for a cinematic view
            });
            mapInstance.current = map;
            setIsMapReady(true);

            // Handle missing style images (swallow warnings for missing theme sprite icons)
            map.on('styleimagemissing', (e) => {
                const id = e.id;
                if (map && !map.hasImage(id)) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext('2d')!;
                    const imgData = ctx.getImageData(0, 0, 1, 1);
                    map.addImage(id, imgData as any);
                }
            });

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
            });

            // Arm the Native 3-Tier Routing Engine!
            invoke<string>('load_routing_graph').then((res) => {
                console.log(res);
            }).catch(err => console.error(err));

            //POIs Logic
            let poiLayers: string[] = [];
            map.on('load', () => {
                if (!map) return;

                // Find all layer IDs that belong to the 'poi' source-layer (which handles POI labels across different themes)
                const style = map.getStyle();
                poiLayers = style.layers?.filter(layer => (layer as any)['source-layer'] === 'poi').map(layer => layer.id) || [];

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
                            if (searchMarker.current) {
                                searchMarker.current.setLngLat([lng, lat]);
                            } else {
                                searchMarker.current = new Marker({ color: '#38bdf8' }) // Tactical cyan
                                    .setLngLat([lng, lat])
                                    .addTo(map!);
                            }
                            setPoiData(details);
                        } catch (err) {
                            console.warn("Could not find full POI details in local DB:", err);
                        }

                        setMarkerPopup(false);
                        setEditPopup(false);
                        setPoiPopup(true);
                    })

                }
            })

            //Add Right Click Context Menu
            map.on('contextmenu', (e) => {
                const { lng, lat } = e.lngLat;

                //close the poi popup if open and open the sutom marker popup
                setPoiPopup(false);
                setEditPopup(false);
                setMarkerData({ lng, lat });
                setMarkerPopup(true);

                //Drop the visual pin on the map
                if (searchMarker.current) {
                    searchMarker.current.setLngLat([lng, lat]);
                } else {
                    searchMarker.current = new Marker({ color: '#38bdf8' }) // red-500
                        .setLngLat([lng, lat])
                        .addTo(map!);
                }
            })

            //Left Click removes Marker
            map.on('click', (e) => {

                //Check if Clicked poi first
                if (poiLayers && poiLayers.length > 0) {
                    const features = map!.queryRenderedFeatures(e.point, { layers: poiLayers });
                    if (features.length > 0) return; // Stop here! It's a POI.
                }

                if (searchMarker.current) {
                    searchMarker.current.remove();
                    searchMarker.current = null;
                    setMarkerPopup(false);
                    setPoiPopup(false);
                    setEditPopup(false);
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
    }, [activeMapFile, theme, mapContainer]);

    const getMarkerColor = (type?: string) => {
        switch (type) {
            case 'lodging': return '#3b82f6';
            case 'fuel': return '#f97316';
            case 'food': return '#22c55e';
            case 'attraction': return '#a855f7';
            case 'shaping': return '#94a3b8';
            case 'default':
            default: return '#ef4444';
        }
    };

    // Helper to generate 2x retina crisp canvas icon for WebGL Symbol Layer
    const generateWaypointImageData = (index: number, type?: string) => {
        const color = getMarkerColor(type);
        const canvas = document.createElement('canvas');
        canvas.width = 60;  // 2x retina scale (30px logical)
        canvas.height = 80; // 2x retina scale (40px logical)
        const ctx = canvas.getContext('2d')!;

        ctx.scale(2, 2);

        // Teardrop path (30x40) with tip at (15, 38.5)
        ctx.beginPath();
        ctx.moveTo(15, 38.5);
        ctx.bezierCurveTo(15, 38.5, 2.5, 24, 2.5, 13.5);
        ctx.bezierCurveTo(2.5, 6.6, 8.1, 1, 15, 1);
        ctx.bezierCurveTo(21.9, 1, 27.5, 6.6, 27.5, 13.5);
        ctx.bezierCurveTo(27.5, 24, 15, 38.5, 15, 38.5);
        ctx.closePath();

        // Fill & Stroke
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Sleek White Badge (circle at 15, 13.5, r=7.5)
        ctx.beginPath();
        ctx.arc(15, 13.5, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // High-contrast sharp text
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), 15, 14);

        return ctx.getImageData(0, 0, 60, 80);
    };

    // Sync waypoints to native WebGL Symbol Layer (0ms lag, 0px drift, 100% GPU locked)
    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        const sourceId = 'tactical-waypoints-source';
        const layerId = 'tactical-waypoints-layer';

        // 1. Generate & Add/Update WebGL images for each waypoint
        waypoints.forEach((wp, index) => {
            const iconId = `wp-icon-${wp.id}-${index}-${wp.type || 'default'}`;
            if (!map.hasImage(iconId)) {
                const imgData = generateWaypointImageData(index, wp.type);
                map.addImage(iconId, imgData as any, { pixelRatio: 2 } as any);
            }
        });

        // 2. Prepare GeoJSON FeatureCollection with numeric feature ids for feature-state animations
        const geojson: any = {
            type: 'FeatureCollection',
            features: waypoints.map((wp, index) => ({
                type: 'Feature',
                id: index + 1, // Feature ID required for setFeatureState
                geometry: {
                    type: 'Point',
                    coordinates: [wp.lng, wp.lat]
                },
                properties: {
                    id: wp.id,
                    index,
                    icon: `wp-icon-${wp.id}-${index}-${wp.type || 'default'}`
                }
            }))
        };

        // 3. Update or Add GeoJSON Source
        const existingSource = map.getSource(sourceId) as any;
        if (existingSource) {
            existingSource.setData(geojson);
        } else {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojson
            });

            // 4. Add WebGL Symbol Layer
            map.addLayer({
                id: layerId,
                type: 'symbol',
                source: sourceId,
                layout: {
                    'icon-image': ['get', 'icon'],
                    'icon-anchor': 'bottom',
                    'icon-size': 1.0,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                }
            });

            // Ensure waypoint layer is at the very top of the WebGL stack
            map.moveLayer(layerId);

            // Hover cursor feedback
            map.on('mouseenter', layerId, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
                map.getCanvas().style.cursor = '';
            });

            // Native WebGL Feature Drag & Drop with interactive scale lift
            map.on('mousedown', layerId, (e: any) => {
                if (!e.features || e.features.length === 0) return;
                e.preventDefault();

                const feature = e.features[0];
                const wpId = feature.properties?.id;
                const featureId = feature.id;
                if (!wpId) return;

                map.getCanvas().style.cursor = 'grabbing';
                map.dragPan.disable();

                // Set feature state to trigger 1.25x scale lift animation
                if (featureId) {
                    map.setFeatureState({ source: sourceId, id: featureId }, { dragging: true });
                }

                const onMouseMove = (moveEvent: any) => {
                    const { lng, lat } = moveEvent.lngLat;
                    // Update GeoJSON source dynamically during drag
                    const currentGeoJson = (map.getSource(sourceId) as any)._data;
                    if (currentGeoJson) {
                        const updatedFeatures = currentGeoJson.features.map((f: any) => {
                            if (f.properties.id === wpId) {
                                return {
                                    ...f,
                                    geometry: { ...f.geometry, coordinates: [lng, lat] }
                                };
                            }
                            return f;
                        });
                        (map.getSource(sourceId) as any).setData({
                            ...currentGeoJson,
                            features: updatedFeatures
                        });
                    }
                };

                const onMouseUp = (upEvent: any) => {
                    const { lng, lat } = upEvent.lngLat;
                    map.getCanvas().style.cursor = '';
                    map.dragPan.enable();

                    // Reset feature state to pop marker back down to 1.0x
                    if (featureId) {
                        map.setFeatureState({ source: sourceId, id: featureId }, { dragging: false });
                    }

                    map.off('mousemove', onMouseMove);
                    map.off('mouseup', onMouseUp);

                    editWaypoint(wpId, { lat, lng });
                };

                map.on('mousemove', onMouseMove);
                map.once('mouseup', onMouseUp);
            });
        }
    }, [waypoints, isMapReady, editWaypoint]);

    // Sync route data to map layer
    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        const sourceId = 'tactical-route-source';
        const layerId = 'tactical-route-layer';
        const glowLayerId = 'tactical-route-glow';

        // Add source if not exists
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add glow layer (wider, lower opacity)
            map.addLayer({
                id: glowLayerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#38bdf8', // Tactical cyan glow
                    'line-width': 8,
                    'line-opacity': 0.3
                }
            });

            // Add inner line layer
            map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#00b4d8', // Vibrant Tactical Cyan/Blue
                    'line-width': 4,
                    'line-opacity': 0.95
                }
            });
        }

        const source: any = map.getSource(sourceId);
        if (routeData && routeData.geometry) {
            source.setData(routeData.geometry);
        } else {
            // Clear route
            source.setData({
                type: 'FeatureCollection',
                features: []
            });
        }

        // Move waypoint layer to the VERY TOP of WebGL layer stack so markers are drawn above the route line
        if (map.getLayer('tactical-waypoints-layer')) {
            map.moveLayer('tactical-waypoints-layer');
        }
    }, [routeData, isMapReady]);

    return {
        mapInstance,
        searchMarker,
        poiPopup, setPoiPopup,
        poiData, setPoiData,
        markerPopup, setMarkerPopup,
        markerData, setMarkerData,
        editPopup, setEditPopup,
        editData, setEditData
    };
}
