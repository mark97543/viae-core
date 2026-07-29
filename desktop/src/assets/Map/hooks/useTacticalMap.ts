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
    const waypointMarkers = useRef<Marker[]>([]);
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

    // Sync waypoints to map markers
    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        // Clean up old markers
        waypointMarkers.current.forEach(marker => marker.remove());
        waypointMarkers.current = [];

        // Draw new red markers for waypoints
        waypoints.forEach(wp => {
            const el = new Marker({ color: '#ef4444', draggable: true }) // Red marker, draggable!
                .setLngLat([wp.lng, wp.lat])
                .addTo(map);
                
            el.on('dragend', () => {
                const lngLat = el.getLngLat();
                editWaypoint(wp.id, { lat: lngLat.lat, lng: lngLat.lng });
            });

            waypointMarkers.current.push(el);
        });
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
                    'line-color': '#38bdf8', // Tactical cyan
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
                    'line-color': '#38bdf8',
                    'line-width': 3,
                    'line-opacity': 1.0
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
