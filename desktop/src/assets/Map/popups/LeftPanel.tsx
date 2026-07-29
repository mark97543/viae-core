import './LeftPanel.css'
import React, { useState } from 'react'
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

const SortableWaypointCard = ({ 
    point, 
    index, 
    openEdit, 
    flyToWaypoint, 
    handleCopy, 
    copiedId,
    removeWaypoint
}: { 
    point: Waypoint; 
    index: number;
    openEdit: (data: Waypoint) => void;
    flyToWaypoint: (lat: number, lng: number) => void;
    handleCopy: (id: string, lat: number, lng: number) => void;
    copiedId: string | null;
    removeWaypoint: (id: string) => void;
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
                style={{ cursor: 'pointer' }}
            >
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
                <button
                    className="waypoint-card-edit-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        openEdit(point);
                    }}
                    title="Edit waypoint details"
                >
                    &gt;
                </button>
            </div>
        </div>
    );
};

const LeftPanel = ({ 
    openEdit, 
    openTripSettings, 
    flyToWaypoint 
}: { 
    openEdit: (data: Waypoint) => void, 
    openTripSettings: () => void,
    flyToWaypoint: (lat: number, lng: number) => void
}) => {
    const { waypoints, removeWaypoint, tripData, reorderWaypoints } = useWaypoints();
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
                                <SortableWaypointCard 
                                    key={point.id}
                                    point={point}
                                    index={index}
                                    openEdit={openEdit}
                                    flyToWaypoint={flyToWaypoint}
                                    handleCopy={handleCopy}
                                    copiedId={copiedId}
                                    removeWaypoint={removeWaypoint}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    )
}

export default LeftPanel