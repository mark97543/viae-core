import React, { createContext, useContext, useState, ReactNode } from 'react';

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
    removeWaypoint: (id: string) => void;
    clearWaypoints: () => void;
}

const WaypointContext = createContext<WaypointContextType | undefined>(undefined);

export const WaypointProvider = ({ children }: { children: ReactNode }) => {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

    const addWaypoint = (waypoint: Omit<Waypoint, 'id'>) => {
        const newWaypoint: Waypoint = {
            ...waypoint,
            id: crypto.randomUUID(),
        };
        setWaypoints((prev) => [...prev, newWaypoint]);
    };

    const removeWaypoint = (id: string) => {
        setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    };

    const clearWaypoints = () => {
        setWaypoints([]);
    };

    return (
        <WaypointContext.Provider value={{ waypoints, addWaypoint, removeWaypoint, clearWaypoints }}>
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
