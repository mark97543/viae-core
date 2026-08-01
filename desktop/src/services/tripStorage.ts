import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Waypoint, Trip } from '../context/WaypointContext';

export interface TripFileData {
    tripData: Trip | null;
    waypoints: Waypoint[];
}

export async function saveTripToFile(path: string, tripData: Trip | null, waypoints: Waypoint[]): Promise<void> {
    const dataToSave: TripFileData = { tripData, waypoints };
    await invoke('save_trip_file', {
        path,
        contents: JSON.stringify(dataToSave, null, 2)
    });
}

export async function saveTripAsFileDialog(tripData: Trip | null, waypoints: Waypoint[]): Promise<string | null> {
    const appDir = await appDataDir();
    const defaultTripsFolder = await join(appDir, 'trips');

    const defaultName = (tripData?.name || 'My_Tactical_Trip')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase() + '.json';

    const filePath = await save({
        defaultPath: await join(defaultTripsFolder, defaultName),
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (filePath) {
        await saveTripToFile(filePath, tripData, waypoints);
        return filePath;
    }
    return null;
}

export async function loadTripFromFileDialog(): Promise<{ filePath: string; data: TripFileData } | null> {
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
            return { filePath, data: parsedData };
        } else {
            throw new Error("The selected JSON file is not a valid Trip format.");
        }
    }
    return null;
}
