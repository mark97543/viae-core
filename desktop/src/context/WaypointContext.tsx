import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { confirm } from '@tauri-apps/plugin-dialog';

export interface Waypoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type?: 'marker' | 'poi';
    description?: string;
}

interface WaypointContextType {
    waypoints: Waypoint[];
    addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
    editWaypoint: (id: string, updatedData: Partial<Omit<Waypoint, 'id'>>) => void;
    removeWaypoint: (id: string) => void;
    clearWaypoints: () => void;
    tripData: Trip | null;
    setTripData: (trip: Trip | null) => void;
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
    })



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

    const clearWaypoints = () => {
        setWaypoints([]);
    };

    //Listeners 
    useEffect(() => {
        const unlisten = listen('new-trip', async () => {
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
            }
        });
        return () => {
            unlisten.then(f => f());
        };


    }, []);


    return (
        <WaypointContext.Provider value={{
            waypoints, addWaypoint,
            editWaypoint, removeWaypoint, clearWaypoints,
            tripData, setTripData
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
