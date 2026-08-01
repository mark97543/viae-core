import { Waypoint, RouteData, Trip } from '../context/WaypointContext';

export const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
};

export interface TimelineEntry {
    arrival?: Date;
    departure: Date;
    dayIndex: number;
}

export const calculateTimeline = (
    waypoints: Waypoint[],
    tripData: Trip | null,
    routeData: RouteData | null
): TimelineEntry[] => {
    const timeline: TimelineEntry[] = [];
    
    let currentTime = new Date();
    if (tripData?.startDate && tripData?.startTime) {
        currentTime = new Date(`${tripData.startDate}T${tripData.startTime}`);
    } else if (tripData?.startDate) {
        currentTime = new Date(`${tripData.startDate}T08:00`);
    } else if (tripData?.startTime) {
        const today = new Date().toISOString().split('T')[0];
        currentTime = new Date(`${today}T${tripData.startTime}`);
    } else {
        currentTime.setHours(8, 0, 0, 0); // Default to 8:00 AM today
    }

    let currentDayIndex = 1;

    for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        let arrival: Date | undefined = undefined;
        
        // If not the first point, add travel time from PREVIOUS leg
        if (i > 0 && routeData?.legs && routeData.legs[i - 1]) {
            currentTime = new Date(currentTime.getTime() + routeData.legs[i - 1].duration * 1000);
            arrival = new Date(currentTime);
        }

        if (wp.isOvernight && i > 0) {
            currentDayIndex += 1;
            const nextStart = wp.nextDayStartTime || '08:00';
            const year = currentTime.getFullYear();
            const month = String(currentTime.getMonth() + 1).padStart(2, '0');
            const day = String(currentTime.getDate() + 1).padStart(2, '0');
            currentTime = new Date(`${year}-${month}-${day}T${nextStart}`);
        } else {
            const layoverMinutes = (wp.breakHours || 0) * 60 + (wp.breakMinutes || 0);
            if (layoverMinutes > 0) {
                currentTime = new Date(currentTime.getTime() + layoverMinutes * 60 * 1000);
            }
        }

        timeline.push({
            arrival,
            departure: new Date(currentTime),
            dayIndex: currentDayIndex
        });
    }

    return timeline;
};
