import './LeftPanel.css'
import { useState } from 'react'
import { useWaypoints, Waypoint } from '../../../context/WaypointContext'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formatDuration = (seconds: number) => {
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
};

const SortableWaypointCard = ({ 
    point, 
    index, 
    openEdit, 
    flyToWaypoint, 
    handleCopy, 
    copiedId,
    timelineData
}: { 
    point: Waypoint; 
    index: number;
    openEdit: (data: Waypoint) => void;
    flyToWaypoint: (lat: number, lng: number) => void;
    handleCopy: (id: string, lat: number, lng: number) => void;
    copiedId: string | null;
    timelineData?: { arrival?: Date, departure: Date };
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

const LeftPanel = ({ 
    openEdit, 
    openTripSettings, 
    flyToWaypoint,
    zoomToTrip
}: { 
    openEdit: (data: Waypoint) => void;
    openTripSettings: () => void;
    flyToWaypoint: (lat: number, lng: number) => void;
    zoomToTrip: () => void;
}) => {
    const { waypoints, tripData, reorderWaypoints, routeData } = useWaypoints();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = waypoints.findIndex((wp) => wp.id === active.id);
            const newIndex = waypoints.findIndex((wp) => wp.id === over.id);
            reorderWaypoints(oldIndex, newIndex);
        }
    };

    const handleCopy = (id: string, lat: number, lng: number) => {
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Calculate arrival and departure times based on routeData and break times
    const calculateTimeline = () => {
        const timeline: { arrival?: Date, departure: Date }[] = [];
        
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

        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            
            let arrival: Date | undefined = undefined;
            
            // If not the first point, we add the travel time from the PREVIOUS leg
            if (i > 0 && routeData?.legs && routeData.legs[i - 1]) {
                currentTime = new Date(currentTime.getTime() + routeData.legs[i - 1].duration * 1000);
                arrival = new Date(currentTime);
            }

            // Add break time
            const breakMins = (wp.breakHours || 0) * 60 + (wp.breakMinutes || 0);
            if (breakMins > 0 || i === 0) {
                // Point 0 departure is also shifted if it has a break time 
                currentTime = new Date(currentTime.getTime() + breakMins * 60000);
            }
            
            const departure = new Date(currentTime);
            timeline.push({ arrival, departure });
        }
        
        return timeline;
    };

    const timeline = calculateTimeline();

    return (
        <div className="left-panel">
            <div className="left-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <h1 className="trip-title-clickable" title="Edit Trip Settings" onClick={openTripSettings}>
                        {tripData?.name}
                    </h1>
                    {waypoints.length > 0 && (
                        <button 
                            onClick={zoomToTrip}
                            title="Zoom to fit entire trip"
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: '#38bdf8', 
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6"></path>
                                <path d="M9 21H3v-6"></path>
                                <path d="M21 3l-7 7"></path>
                                <path d="M3 21l7-7"></path>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="left-panel-content">
                {waypoints.length === 0 ? (
                    <div className="left-panel-empty">
                        Your tactical plan is empty.<br /><br />Right-click the map or click a POI to add waypoints.
                    </div>
                ) : (
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={waypoints.map(wp => wp.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {waypoints.map((point, index) => (
                                <div key={point.id}>
                                    <SortableWaypointCard 
                                        point={point}
                                        index={index}
                                        openEdit={openEdit}
                                        flyToWaypoint={flyToWaypoint}
                                        handleCopy={handleCopy}
                                        copiedId={copiedId}
                                        timelineData={timeline[index]}
                                    />
                                    {routeData?.legs && routeData.legs[index] && index < waypoints.length - 1 && (
                                        <div className="waypoint-leg-connector">
                                            <div className="leg-line"></div>
                                            <div className="leg-stats">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                <span>{formatDuration(routeData.legs[index].duration)}</span>
                                                <span className="leg-stats-divider">•</span>
                                                <span>{routeData.legs[index].distance.toFixed(1)} mi</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {routeData && (
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
                            ${waypoints.reduce((total, wp) => total + (wp.budget || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LeftPanel