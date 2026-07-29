import './LeftPanel.css'
import { useState } from 'react'
import { useWaypoints } from '../../../context/WaypointContext'

const LeftPanel = ({ openEdit }: { openEdit: (data: any) => void }) => {
    const { waypoints, removeWaypoint, clearWaypoints } = useWaypoints();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (id: string, lat: number, lng: number) => {
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="left-panel">
            <div className="left-panel-header">
                <h1>Tactical Plan</h1>
            </div>

            <div className="left-panel-content">
                {waypoints.length === 0 ? (
                    <div className="left-panel-empty">
                        Your tactical plan is empty.<br /><br />Right-click the map or click a POI to add waypoints.
                    </div>
                ) : (
                    waypoints.map((point, index) => (
                        <div key={point.id} className="waypoint-card">
                            <div className="waypoint-card-header">
                                <h3 className="waypoint-card-title">
                                    {index + 1}. {point.name || 'Custom Location'}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        className="waypoint-card-edit-btn"
                                        onClick={() => openEdit(point)}
                                        title="Edit waypoint"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="waypoint-card-remove"
                                        onClick={() => removeWaypoint(point.id)}
                                        title="Remove waypoint"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                            <div className="waypoint-card-coords-row">
                                <p className="waypoint-card-coords">
                                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                </p>
                                <button className="left-panel-copy-btn" onClick={() => handleCopy(point.id, point.lat, point.lng)}>
                                    {copiedId === point.id ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            {point.type && (
                                <span className="waypoint-card-type">{point.type}</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default LeftPanel