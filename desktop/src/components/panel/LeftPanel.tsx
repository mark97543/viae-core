import { useState } from 'react';
import './LeftPanel.css';
import { useWaypoints, Waypoint } from '../../context/WaypointContext.tsx';
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
} from '@dnd-kit/sortable';
import { SortableWaypointCard } from './SortableWaypointCard.tsx';
import { TripStatsSummary } from './TripStatsSummary.tsx';
import { calculateTimeline, formatDuration } from '../../utils/tripCalculations.ts';

interface LeftPanelProps {
    openEdit: (data: Waypoint) => void;
    openTripSettings: () => void;
    openPrint: () => void;
    flyToWaypoint: (lat: number, lng: number) => void;
    zoomToTrip: () => void;
}

export default function LeftPanel({
    openEdit,
    openTripSettings,
    openPrint,
    flyToWaypoint,
    zoomToTrip
}: LeftPanelProps) {
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

    const timeline = calculateTimeline(waypoints, tripData, routeData);

    return (
        <div className="left-panel">
            <div className="left-panel-header">
                <div className="flex justify-between items-start mb-2">
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                        <h2 className="left-panel-title">
                            {tripData?.name || 'Tactical Plan'}
                        </h2>
                        {tripData?.description && (
                            <p className="left-panel-subtitle">
                                {tripData.description}
                            </p>
                        )}
                        {(tripData?.startDate || tripData?.startTime) && (
                            <div className="trip-datetime-badge">
                                📅 {tripData.startDate || 'Today'} {tripData.startTime && `• ⏰ ${tripData.startTime}`}
                            </div>
                        )}
                    </div>

                    <button
                        className="trip-settings-btn"
                        onClick={openTripSettings}
                        title="Edit Trip Settings"
                    >
                        ⚙️
                    </button>
                </div>

                <div className="left-panel-actions">
                    <span className="left-panel-count">
                        {waypoints.length} {waypoints.length === 1 ? 'Stop' : 'Stops'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                        {waypoints.length > 0 && (
                            <>
                                <button
                                    onClick={openPrint}
                                    title="Print / Export Roadbook (PDF)"
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
                                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                        <rect x="6" y="14" width="12" height="8"></rect>
                                    </svg>
                                </button>
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
                            </>
                        )}
                    </div>
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
                            {waypoints.map((point, index) => {
                                const isNewDay = index === 0 || (timeline[index]?.dayIndex > timeline[index - 1]?.dayIndex);
                                return (
                                    <div key={point.id}>
                                        {isNewDay && (
                                            <div className="day-divider">
                                                <span>DAY {timeline[index]?.dayIndex || 1}</span>
                                            </div>
                                        )}
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
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {routeData && <TripStatsSummary routeData={routeData} waypoints={waypoints} />}
        </div>
    );
}
