import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { confirm, save, open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { decodePolyline6 } from '../assets/Map/mapUtils';

export interface Waypoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type?: 'marker' | 'poi';
    description?: string;
}

export interface RouteData {
    geometry: any;
    distance: number;
    duration: number;
}

interface WaypointContextType {
    waypoints: Waypoint[];
    addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
    editWaypoint: (id: string, updatedData: Partial<Omit<Waypoint, 'id'>>) => void;
    removeWaypoint: (id: string) => void;
    reorderWaypoints: (startIndex: number, endIndex: number) => void;
    clearWaypoints: () => void;
    tripData: Trip | null;
    setTripData: (trip: Trip | null) => void;
    currentFilePath: string | null;
    setCurrentFilePath: (path: string | null) => void;
    routeData: RouteData | null;
}

export interface Trip {
    name: string;
    description?: string;
}

const WaypointContext = createContext<WaypointContextType | undefined>(undefined);

export const WaypointProvider = ({ children }: { children: ReactNode }) => {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [tripData, setTripData] = useState<Trip | null>({
        name: 'New Trip',
        description: ''
    });
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [routeData, setRouteData] = useState<RouteData | null>(null);

    // Keep a ref of the latest data so the event listeners always have the freshest state
    // without needing to be re-created on every single keystroke/waypoint addition!
    const latestData = useRef({ tripData, waypoints, currentFilePath });
    useEffect(() => {
        latestData.current = { tripData, waypoints, currentFilePath };
    }, [tripData, waypoints, currentFilePath]);


    const addWaypoint = (waypoint: Omit<Waypoint, 'id'>) => {
        const newWaypoint: Waypoint = {
            ...waypoint,
            id: crypto.randomUUID(),
        };
        setWaypoints((prev) => [...prev, newWaypoint]);
    };

    const editWaypoint = (id: string, updatedData: Partial<Omit<Waypoint, 'id'>>) => {
        setWaypoints((prev) =>
            prev.map((wp) => wp.id === id ? { ...wp, ...updatedData } : wp)
        );
    };

    const removeWaypoint = (id: string) => {
        setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    };

    const reorderWaypoints = (oldIndex: number, newIndex: number) => {
        setWaypoints((prev) => {
            const result = Array.from(prev);
            const [removed] = result.splice(oldIndex, 1);
            result.splice(newIndex, 0, removed);
            return result;
        });
    };

    const clearWaypoints = () => {
        setWaypoints([]);
    };

    // Auto-calculate route natively in Rust whenever waypoints change
    useEffect(() => {
        const fetchRoute = async () => {
            if (waypoints.length < 2) {
                setRouteData(null);
                return;
            }
            
            try {
                let totalDistance = 0;
                let totalDuration = 0;
                let allCoords: [number, number][] = [];

                // Calculate route leg-by-leg between each ordered waypoint
                for (let i = 0; i < waypoints.length - 1; i++) {
                    const w1 = waypoints[i];
                    const w2 = waypoints[i + 1];
                    
                    const leg: any = await invoke('calculate_route', {
                        lat1: w1.lat,
                        lng1: w1.lng,
                        lat2: w2.lat,
                        lng2: w2.lng
                    });
                    
                    totalDistance += leg.distance;
                    totalDuration += leg.duration;
                    allCoords = allCoords.concat(leg.geometry.coordinates);
                }

                setRouteData({
                    geometry: {
                        type: 'LineString',
                        coordinates: allCoords
                    },
                    distance: totalDistance, // miles
                    duration: totalDuration  // seconds
                });
            } catch (error) {
                console.error("Failed to fetch route natively:", error);
                setRouteData(null);
            }
        };

        fetchRoute();
    }, [waypoints]);

    //Listeners 
    useEffect(() => {
        const unlistenNew = listen('new-trip', async () => {
            const isConfirmed = await confirm(
                'Do you want start new trip. All unsaved data will be lost!',
                {
                    title: 'New Trip',
                    kind: 'warning',
                    okLabel: 'Yes',
                    cancelLabel: 'No',
                }
            );
            if (isConfirmed) {
                clearWaypoints();
                setTripData({ name: 'New Trip', description: '' });
                setCurrentFilePath(null);
            }
        });

        // The logic for opening a Save Dialog, saving, and storing the path
        const performSaveAs = async () => {
            const appDir = await appDataDir();
            const defaultTripsFolder = await join(appDir, 'trips', 'tactical_plan.json');

            const filePath = await save({
                defaultPath: defaultTripsFolder,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });

            if (filePath) {
                const dataToSave = {
                    tripData: latestData.current.tripData,
                    waypoints: latestData.current.waypoints
                };
                await invoke('save_trip_file', {
                    path: filePath,
                    contents: JSON.stringify(dataToSave, null, 2)
                });
                setCurrentFilePath(filePath);
            }
        };

        const unlistenSaveAs = listen('save-as-trip', async () => {
            try {
                await performSaveAs();
            } catch (err) {
                console.error("Failed to save trip as:", err);
                alert("Failed to save trip: " + err);
            }
        });

        const unlistenSave = listen('save-trip', async () => {
            try {
                const { currentFilePath: path, tripData: tData, waypoints: wData } = latestData.current;

                if (path) {
                    // Bypass Dialog!
                    const dataToSave = { tripData: tData, waypoints: wData };
                    await invoke('save_trip_file', {
                        path,
                        contents: JSON.stringify(dataToSave, null, 2)
                    });
                } else {
                    // Fall back to Save As if no file path exists yet
                    await performSaveAs();
                }
            } catch (err) {
                console.error("Failed to save trip:", err);
                alert("Failed to save trip: " + err);
            }
        });

        const unlistenLoad = listen('load-trip', async () => {
            const isConfirmed = await confirm(
                'Do you want to load a trip? All unsaved data on your current map will be lost!',
                {
                    title: 'Load Trip',
                    kind: 'warning',
                    okLabel: 'Proceed',
                    cancelLabel: 'Cancel',
                }
            );

            if (!isConfirmed) return;

            try {
                const appDir = await appDataDir();
                const defaultTripsFolder = await join(appDir, 'trips');

                const filePath = await open({
                    defaultPath: defaultTripsFolder,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (filePath && typeof filePath === 'string') {
                    const fileContents = await invoke<string>('load_trip_file', { path: filePath });
                    const parsedData = JSON.parse(fileContents);

                    if (parsedData.tripData && Array.isArray(parsedData.waypoints)) {
                        setTripData(parsedData.tripData);
                        setWaypoints(parsedData.waypoints);
                        setCurrentFilePath(filePath);
                    } else {
                        alert("Error: The selected JSON file is not a valid Trip format.");
                    }
                }
            } catch (err) {
                console.error("Failed to load trip:", err);
                alert("Failed to load trip: " + err);
            }
        });

        return () => {
            unlistenNew.then(f => f());
            unlistenSave.then(f => f());
            unlistenSaveAs.then(f => f());
            unlistenLoad.then(f => f());
        };
    }, []);


    return (
        <WaypointContext.Provider value={{
            waypoints, addWaypoint,
            editWaypoint, removeWaypoint, reorderWaypoints, clearWaypoints,
            tripData, setTripData, currentFilePath, setCurrentFilePath,
            routeData
        }}>
            {children}
        </WaypointContext.Provider>
    );
};

export const useWaypoints = () => {
    const context = useContext(WaypointContext);
    if (context === undefined) {
        throw new Error('useWaypoints must be used within a WaypointProvider');
    }
    return context;
};
