import { useEffect, useRef, useState } from 'react';
import { Map, Marker } from 'maplibre-gl';
import { invoke } from '@tauri-apps/api/core';
import { useWaypoints } from '../context/WaypointContext';

export function useTacticalMap(
    mapContainer: React.RefObject<HTMLDivElement | null>,
    activeMapFile: string | undefined,
    theme: string
) {
    const mapInstance = useRef<Map | null>(null);
    const searchMarker = useRef<Marker | null>(null);
    const geoJsonRef = useRef<any>(null);
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

        // Dynamically load selected theme JSON
        import(`../assets/Map/themes/${theme}.json`).then((module) => {
            if (isCancelled) return;

            const themeStyle = module.default;
            const style = JSON.parse(JSON.stringify(themeStyle));

            if (style.sources.openmaptiles) {
                style.sources.openmaptiles = {
                    type: 'vector',
                    tiles: [`mbtiles://${activeMapFile}/{z}/{x}/{y}`],
                    minzoom: 0,
                    maxzoom: 14
                };
            }

            // Remove external online sprite/glyph dependencies for air-gapped operation
            delete style.sprite;
            delete style.glyphs;

            map = new Map({
                container: mapContainer.current!,
                style: style,
                center: [-77.0369, 38.9072],
                zoom: 12.5,
                pitch: 0,
                bearing: 0
            });
            mapInstance.current = map;
            setIsMapReady(true);

            setTimeout(() => {
                map?.resize();
            }, 300);

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

            invoke<Record<string, string>>('get_map_metadata').then((meta) => {
                console.log("Map metadata received:", meta);
                if (meta && map) {
                    if (meta.bounds) {
                        const b = meta.bounds.split(',').map(Number);
                        if (b.length === 4 && !b.some(isNaN)) {
                            console.log("Fitting bounds to:", b);
                            map.fitBounds([[b[0], b[1]], [b[2], b[3]]], {
                                padding: 20,
                                maxZoom: 14,
                                essential: true
                            });
                            return;
                        }
                    }
                    if (meta.center) {
                        const coords = meta.center.split(',').map(Number);
                        if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                            const [lng, lat, zoom = 10] = coords;
                            console.log("Flying to center:", lng, lat, zoom);
                            map.flyTo({
                                center: [lng, lat],
                                zoom: zoom,
                                essential: true
                            });
                        }
                    }
                }
            }).catch(err => console.error("Metadata fetch error:", err));

            invoke<string>('load_routing_graph').then((res) => {
                console.log(res);
            }).catch(err => console.error(err));

            let poiLayers: string[] = [];
            map.on('load', () => {
                if (!map) return;

                const style = map.getStyle();
                poiLayers = style.layers?.filter(layer => (layer as any)['source-layer'] === 'poi').map(layer => layer.id) || [];

                if (poiLayers.length > 0) {
                    map.on('mouseenter', poiLayers, () => {
                        map!.getCanvas().style.cursor = 'pointer';
                    });

                    map.on('mouseleave', poiLayers, () => {
                        map!.getCanvas().style.cursor = 'grab';
                    });

                    map.on('click', poiLayers, async (e) => {
                        if (!e.features || e.features.length === 0) return;

                        const clickedPoi = e.features[0];
                        const coordinates = (clickedPoi.geometry as any).coordinates;
                        const lng = coordinates[0];
                        const lat = coordinates[1];
                        try {
                            const details = await invoke<any>('get_poi_details', { lat, lng });
                            console.log("Details:", details);
                            if (searchMarker.current) {
                                searchMarker.current.setLngLat([lng, lat]);
                            } else {
                                searchMarker.current = new Marker({ color: '#38bdf8' })
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
                    });
                }
            });

            map.on('contextmenu', (e) => {
                const { lng, lat } = e.lngLat;
                setPoiPopup(false);
                setEditPopup(false);
                setMarkerData({ lng, lat });
                setMarkerPopup(true);

                if (searchMarker.current) {
                    searchMarker.current.setLngLat([lng, lat]);
                } else {
                    searchMarker.current = new Marker({ color: '#38bdf8' })
                        .setLngLat([lng, lat])
                        .addTo(map!);
                }
            });

            map.on('click', (e) => {
                if (poiLayers && poiLayers.length > 0) {
                    const features = map!.queryRenderedFeatures(e.point, { layers: poiLayers });
                    if (features.length > 0) return;
                }

                if (searchMarker.current) {
                    searchMarker.current.remove();
                    searchMarker.current = null;
                    setMarkerPopup(false);
                    setPoiPopup(false);
                    setEditPopup(false);
                }
            });

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

    const generateWaypointImageData = (index: number, type?: string) => {
        const color = getMarkerColor(type);
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;

        ctx.scale(2, 2);

        ctx.beginPath();
        ctx.moveTo(15, 38.5);
        ctx.bezierCurveTo(15, 38.5, 2.5, 24, 2.5, 13.5);
        ctx.bezierCurveTo(2.5, 6.6, 8.1, 1, 15, 1);
        ctx.bezierCurveTo(21.9, 1, 27.5, 6.6, 27.5, 13.5);
        ctx.bezierCurveTo(27.5, 24, 15, 38.5, 15, 38.5);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(15, 13.5, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), 15, 14);

        return ctx.getImageData(0, 0, 60, 80);
    };

    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        const sourceId = 'tactical-waypoints-source';
        const layerId = 'tactical-waypoints-layer';

        waypoints.forEach((wp, index) => {
            const iconId = `wp-icon-${wp.id}-${index}-${wp.type || 'default'}`;
            if (!map.hasImage(iconId)) {
                const imgData = generateWaypointImageData(index, wp.type);
                map.addImage(iconId, imgData as any, { pixelRatio: 2 } as any);
            }
        });

        const geojson: any = {
            type: 'FeatureCollection',
            features: waypoints.map((wp, index) => ({
                type: 'Feature',
                id: index + 1,
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
        geoJsonRef.current = geojson;

        const existingSource = map.getSource(sourceId) as any;
        if (existingSource) {
            existingSource.setData(geojson);
        } else {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojson
            });

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

            map.moveLayer(layerId);

            map.on('mouseenter', layerId, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
                map.getCanvas().style.cursor = '';
            });

            map.on('mousedown', layerId, (e: any) => {
                if (!e.features || e.features.length === 0) return;
                e.preventDefault();

                const feature = e.features[0];
                const wpId = feature.properties?.id;
                const featureId = feature.id;
                if (!wpId) return;

                map.getCanvas().style.cursor = 'grabbing';
                map.dragPan.disable();

                if (featureId) {
                    map.setFeatureState({ source: sourceId, id: featureId }, { dragging: true });
                }

                const onMouseMove = (moveEvent: any) => {
                    const { lng, lat } = moveEvent.lngLat;
                    const currentGeoJson = geoJsonRef.current;
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
                        const newGeoJson = {
                            ...currentGeoJson,
                            features: updatedFeatures
                        };
                        geoJsonRef.current = newGeoJson;
                        (map.getSource(sourceId) as any).setData(newGeoJson);
                    }
                };

                const onMouseUp = (upEvent: any) => {
                    const { lng, lat } = upEvent.lngLat;
                    map.getCanvas().style.cursor = '';
                    map.dragPan.enable();

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

    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        const map = mapInstance.current;

        const sourceId = 'tactical-route-source';
        const layerId = 'tactical-route-layer';
        const glowLayerId = 'tactical-route-glow';

        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            map.addLayer({
                id: glowLayerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': [
                        'match',
                        ['%', ['get', 'day'], 5],
                        1, '#38bdf8',
                        2, '#c084fc',
                        3, '#4ade80',
                        4, '#fbbf24',
                        0, '#f87171',
                        '#38bdf8'
                    ],
                    'line-width': 8,
                    'line-opacity': 0.3
                }
            });

            map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': [
                        'match',
                        ['%', ['get', 'day'], 5],
                        1, '#00b4d8',
                        2, '#a855f7',
                        3, '#22c55e',
                        4, '#f59e0b',
                        0, '#ef4444',
                        '#00b4d8'
                    ],
                    'line-width': 4,
                    'line-opacity': 0.95
                }
            });
        }

        const source: any = map.getSource(sourceId);
        if (routeData && routeData.geometry) {
            source.setData(routeData.geometry);
        } else {
            source.setData({
                type: 'FeatureCollection',
                features: []
            });
        }

        if (map.getLayer('tactical-waypoints-layer')) {
            map.moveLayer('tactical-waypoints-layer');
        }
    }, [routeData, isMapReady]);

    const clearSearchMarker = () => {
        if (searchMarker.current) {
            searchMarker.current.remove();
            searchMarker.current = null;
        }
        setPoiPopup(false);
        setMarkerPopup(false);
        setEditPopup(false);
    };

    return {
        mapInstance,
        searchMarker,
        clearSearchMarker,
        poiPopup, setPoiPopup,
        poiData, setPoiData,
        markerPopup, setMarkerPopup,
        markerData, setMarkerData,
        editPopup, setEditPopup,
        editData, setEditData
    };
}
