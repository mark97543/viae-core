import './LeftPanel.css'
import { useState } from 'react'
import { useWaypoints, Waypoint } from '../../../context/WaypointContext'

const LeftPanel = ({ openEdit, openTripSettings }: { openEdit: (data: Waypoint) => void, openTripSettings: () => void }) => {
    const { waypoints, removeWaypoint, clearWaypoints, tripData, setTripData } = useWaypoints();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (id: string, lat: number, lng: number) => {
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="left-panel">
            <div className="left-panel-header">
                <h1 className="trip-title-clickable" title="Edit Trip Settings" onClick={openTripSettings}>
                    {tripData?.name}
                </h1>
            </div>

            <div className="left-panel-content">
                {waypoints.length === 0 ? (
                    <div className="left-panel-empty">
                        Your tactical plan is empty.<br /><br />Right-click the map or click a POI to add waypoints.
                    </div>
                ) : (
                    waypoints.map((point, index) => (
                        <div key={point.id} className="waypoint-card">
                            <div className="waypoint-drag-handle">
                                {index + 1}
                            </div>
                            <div className="waypoint-card-content">
                                <div className="waypoint-card-header">
                                    <h3 className="waypoint-card-title">
                                        {point.name || 'Custom Location'}
                                    </h3>
                                </div>
                                <div className="waypoint-card-coords-row">
                                    <p
                                        className="waypoint-card-coords"
                                        onClick={() => handleCopy(point.id, point.lat, point.lng)}
                                        title="Click to copy coordinates"
                                    >
                                        {copiedId === point.id ? "Copied!" : `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`}
                                    </p>
                                </div>
                                <div className="waypoint-card-actions">
                                    <button
                                        className="waypoint-card-edit-btn"
                                        onClick={() => openEdit(point)}
                                        title="Edit waypoint"
                                    >
                                        Edit
                                    </button>
                                    <div style={{ flex: 1 }}></div>
                                    <button
                                        className="waypoint-card-remove"
                                        onClick={() => removeWaypoint(point.id)}
                                        title="Remove waypoint"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default LeftPanel