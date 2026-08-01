import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { confirm } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import * as turf from '@turf/turf';
import { saveTripToFile, saveTripAsFileDialog, loadTripFromFileDialog } from '../services/tripStorage';

export interface Waypoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type?: 'default' | 'fuel' | 'food' | 'lodging' | 'attraction' | 'shaping' | 'marker' | 'poi';
    description?: string;
    breakHours?: number;
    breakMinutes?: number;
    budget?: number;
    isOvernight?: boolean;
    nextDayStartTime?: string;
}

export interface RouteLeg {
    distance: number;
    duration: number;
}

export interface RouteData {
    geometry: any;
    distance: number;
    duration: number;
    legs: RouteLeg[];
}

interface WaypointContextType {
    waypoints: Waypoint[];
    setWaypoints: (waypoints: Waypoint[]) => void;
    addWaypoint: (waypoint: Omit<Waypoint, 'id'>, targetIndex?: number) => void;
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
    startDate?: string;
    startTime?: string;
}

const WaypointContext = createContext<WaypointContextType | undefined>(undefined);

export const WaypointProvider = ({ children }: { children: ReactNode }) => {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [tripData, setTripData] = useState<Trip | null>({
        name: 'New Trip',
        description: '',
        startDate: '',
        startTime: ''
    });
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [routeData, setRouteData] = useState<RouteData | null>(null);

    // Keep a ref of the latest data so the event listeners always have the freshest state
    // without needing to be re-created on every single keystroke/waypoint addition!
    const latestData = useRef({ tripData, waypoints, currentFilePath });
    useEffect(() => {
        latestData.current = { tripData, waypoints, currentFilePath };
    }, [tripData, waypoints, currentFilePath]);


    const addWaypoint = useCallback((waypoint: Omit<Waypoint, 'id'>, targetIndex?: number) => {
        const newWaypoint: Waypoint = {
            ...waypoint,
            id: crypto.randomUUID(),
        };
        setWaypoints((prev) => {
            if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= prev.length) {
                const next = [...prev];
                next.splice(targetIndex, 0, newWaypoint);
                return next;
            }

            if (prev.length < 2) {
                return [...prev, newWaypoint];
            }

            // Smart insertion: find which leg segment the new point is closest to
            const newPt = turf.point([newWaypoint.lng, newWaypoint.lat]);
            let bestIndex = prev.length - 1;
            let minDistance = Infinity;

            for (let i = 0; i < prev.length - 1; i++) {
                const seg = turf.lineString([
                    [prev[i].lng, prev[i].lat],
                    [prev[i + 1].lng, prev[i + 1].lat]
                ]);
                const dist = turf.pointToLineDistance(newPt, seg, { units: 'miles' });
                if (dist < minDistance) {
                    minDistance = dist;
                    bestIndex = i + 1;
                }
            }

            const next = [...prev];
            next.splice(bestIndex, 0, newWaypoint);
            return next;
        });
    }, []);

    const editWaypoint = useCallback((id: string, updatedData: Partial<Omit<Waypoint, 'id'>>) => {
        setWaypoints((prev) =>
            prev.map((wp) => wp.id === id ? { ...wp, ...updatedData } : wp)
        );
    }, []);

    const removeWaypoint = useCallback((id: string) => {
        setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    }, []);

    const reorderWaypoints = useCallback((startIndex: number, endIndex: number) => {
        setWaypoints((prev) => {
            const result = Array.from(prev);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        });
    }, []);

    const clearWaypoints = useCallback(() => {
        setWaypoints([]);
    }, []);

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
                const legs: RouteLeg[] = [];
                const features: any[] = [];
                let currentDayIndex = 1;

                // Calculate route leg-by-leg between each ordered waypoint
                for (let i = 0; i < waypoints.length - 1; i++) {
                    const w1 = waypoints[i];
                    const w2 = waypoints[i + 1];
                    
                    if (w1.isOvernight) {
                        currentDayIndex++;
                    }
                    
                    const leg: any = await invoke('calculate_route', {
                        lat1: w1.lat,
                        lng1: w1.lng,
                        lat2: w2.lat,
                        lng2: w2.lng
                    });
                    
                    legs.push({ distance: leg.distance, duration: leg.duration });
                    totalDistance += leg.distance;
                    totalDuration += leg.duration;
                    
                    features.push({
                        type: 'Feature',
                        properties: { day: currentDayIndex },
                        geometry: leg.geometry
                    });
                }

                setRouteData({
                    geometry: {
                        type: 'FeatureCollection',
                        features: features
                    },
                    distance: totalDistance, // miles
                    duration: totalDuration, // seconds
                    legs
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

        const performSaveAs = async () => {
            const savedPath = await saveTripAsFileDialog(latestData.current.tripData, latestData.current.waypoints);
            if (savedPath) {
                setCurrentFilePath(savedPath);
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
                    await saveTripToFile(path, tData, wData);
                } else {
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
                const result = await loadTripFromFileDialog();
                if (result) {
                    setTripData(result.data.tripData);
                    setWaypoints(result.data.waypoints);
                    setCurrentFilePath(result.filePath);
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('trip-loaded', { detail: result.data.waypoints }));
                    }, 100);
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
            waypoints, setWaypoints, addWaypoint,
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
