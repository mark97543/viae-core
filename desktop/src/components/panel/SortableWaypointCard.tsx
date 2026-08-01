import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Waypoint } from '../../context/WaypointContext.tsx';

interface SortableWaypointCardProps {
    point: Waypoint;
    index: number;
    openEdit: (data: Waypoint) => void;
    flyToWaypoint: (lat: number, lng: number) => void;
    handleCopy: (id: string, lat: number, lng: number) => void;
    copiedId: string | null;
    timelineData?: { arrival?: Date; departure: Date; dayIndex: number };
}

export const SortableWaypointCard: React.FC<SortableWaypointCardProps> = ({
    point,
    index,
    openEdit,
    flyToWaypoint,
    handleCopy,
    copiedId,
    timelineData
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: point.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 1,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div
                className={`waypoint-card ${isDragging ? 'dragging' : ''}`}
                onClick={() => flyToWaypoint(point.lat, point.lng)}
            >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="waypoint-card-top-row">
                        <div
                            className="waypoint-drag-handle"
                            {...attributes}
                            {...listeners}
                        >
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(point.id, point.lat, point.lng);
                                    }}
                                    title="Click to copy coordinates"
                                >
                                    {copiedId === point.id ? "Copied!" : `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {timelineData && (
                        <div className="waypoint-card-times-footer">
                            {timelineData.arrival && (
                                <span title="Arrival Time" className="waypoint-time arrival">
                                    ARR: {timelineData.arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                            {timelineData.arrival && <span className="waypoint-time-divider">•</span>}
                            <span title="Departure Time" className="waypoint-time departure">
                                DEP: {timelineData.departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>

                <button
                    className="waypoint-card-edit-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        openEdit(point);
                    }}
                    title="Edit waypoint details"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    );
};
