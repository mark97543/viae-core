import React from 'react';
import { RouteData, Waypoint } from '../../context/WaypointContext.tsx';
import { formatDuration } from '../../utils/tripCalculations.ts';

interface TripStatsSummaryProps {
    routeData: RouteData;
    waypoints: Waypoint[];
}

export const TripStatsSummary: React.FC<TripStatsSummaryProps> = ({ routeData, waypoints }) => {
    const totalBudget = waypoints.reduce((total, wp) => total + (wp.budget || 0), 0);

    return (
        <div className="left-panel-footer">
            <div className="trip-stats">
                <span title="Total Distance">
                    {routeData.distance.toFixed(1)} mi
                </span>
                <span className="trip-stats-divider">•</span>
                <span title="Estimated Time">
                    {formatDuration(routeData.duration)}
                </span>
                <span className="trip-stats-divider">•</span>
                <span title="Route Budget" style={{ color: '#10b981' }}>
                    ${totalBudget.toFixed(2)}
                </span>
            </div>
        </div>
    );
};
