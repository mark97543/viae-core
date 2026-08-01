import { useEffect, useState } from 'react';
import { useWaypoints } from '../../context/WaypointContext.tsx';
import './PrintLayout.css';

interface PrintLayoutProps {
    paperSize: string;
}

export default function PrintLayout({ paperSize }: PrintLayoutProps) {
    const { waypoints, routeData, tripData } = useWaypoints();
    const [totalDistance, setTotalDistance] = useState("0.0");
    const [totalTime, setTotalTime] = useState("0h 0m");

    useEffect(() => {
        if (routeData) {
            const distance = routeData.distance;
            const duration = routeData.duration;

            const distMiles = distance.toFixed(1);
            setTotalDistance(distMiles);

            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            setTotalTime(`${hours}h ${minutes}m`);
        }
    }, [routeData]);

    const segments = [];
    if (routeData) {
        const legs = routeData.legs || [];
        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            let segmentDistance = "";
            let segmentDuration = "";
            
            if (i < legs.length) {
                const legDist = (legs[i].distance).toFixed(1);
                const hrs = Math.floor(legs[i].duration / 3600);
                const mins = Math.floor((legs[i].duration % 3600) / 60);
                segmentDistance = `${legDist} mi`;
                segmentDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            }

            segments.push({
                waypoint: wp,
                distanceToNext: segmentDistance,
                durationToNext: segmentDuration,
                index: i + 1
            });
        }
    } else {
        waypoints.forEach((wp, i) => {
            segments.push({
                waypoint: wp,
                distanceToNext: "",
                durationToNext: "",
                index: i + 1
            });
        });
    }

    const days = [];
    let currentDaySegments = [];
    let dayCounter = 1;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        currentDaySegments.push(seg);
        if (seg.waypoint.isOvernight || i === segments.length - 1) {
            days.push({
                day: dayCounter++,
                segments: currentDaySegments
            });
            currentDaySegments = [];
        }
    }

    const ITEMS_PER_PAGE = paperSize === 'field-notes' ? 3 : (paperSize === 'custom-journal' ? 5 : 8);

    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    return (
        <div className={`print-layout paper-${paperSize}`}>
            <div className="print-day-page title-cover-page">
                <div className="print-header">
                    <div className="print-title">
                        <h1>{tripData?.name ? tripData.name.toUpperCase() : 'ITER VIAE ROUTE PLAN'}</h1>
                    </div>
                    
                    {tripData?.description && (
                        <div className="print-description">
                            <p>{tripData.description}</p>
                        </div>
                    )}

                    <div className="print-summary-table">
                        <div className="summary-row summary-header">
                            <div className="summary-col">DISTANCE</div>
                            <div className="summary-col">DURATION</div>
                        </div>
                        <div className="summary-row summary-data">
                            <div className="summary-col">{totalDistance} mi</div>
                            <div className="summary-col">{totalTime.replace('h', 'hr').replace('m', 'min')}</div>
                        </div>
                        <div className="summary-row summary-header" style={{marginTop: '10px'}}>
                            <div className="summary-col">START</div>
                            <div className="summary-col">END</div>
                            <div className="summary-col">BUDGET</div>
                        </div>
                        <div className="summary-row summary-data">
                            <div className="summary-col">{tripData?.startDate || 'TBD'}</div>
                            <div className="summary-col">
                                {tripData?.startDate ? (() => {
                                    const start = new Date(tripData.startDate);
                                    start.setDate(start.getDate() + (days.length - 1));
                                    const mm = (start.getMonth() + 1).toString().padStart(2, '0');
                                    const dd = start.getDate().toString().padStart(2, '0');
                                    const yy = start.getFullYear().toString().slice(-2);
                                    return `${mm}/${dd}/${yy}`;
                                })() : `Day ${days.length}`}
                            </div>
                            <div className="summary-col">${waypoints.reduce((acc, wp) => acc + (wp.budget || 0), 0).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {days.map((dayData, dayIdx) => {
                const chunks = chunkArray(dayData.segments, ITEMS_PER_PAGE);

                return chunks.map((chunkSegments, chunkIdx) => {
                    return (
                        <div key={`${dayIdx}-${chunkIdx}`} className="print-day-page">
                            <div className="print-itinerary">
                                <h2>DAY {dayData.day} {chunkIdx > 0 ? '(CONT.)' : ''}</h2>
                                
                                <div className="itinerary-list">
                                    {chunkSegments.map((seg: any) => {
                                        const isLastInDay = seg.index === dayData.segments[dayData.segments.length - 1].index;
                                        const isLastTotal = seg.index === segments.length;
                                        
                                        return (
                                            <div key={seg.waypoint.id} className="itinerary-item">
                                                <div className="itinerary-wp">
                                                    <div className="itinerary-wp-left">
                                                        <div className="itinerary-wp-name">{seg.waypoint.name || 'WAYPOINT'}</div>
                                                        {seg.waypoint.description && (
                                                            <div className="itinerary-wp-note">Note: {seg.waypoint.description}</div>
                                                        )}
                                                    </div>
                                                    <div className="itinerary-wp-right">
                                                        <div className="itinerary-wp-coords">
                                                            {seg.waypoint.lat.toFixed(4)}, {seg.waypoint.lng.toFixed(4)} | BUDGET: ${(seg.waypoint.budget || 0).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {!isLastTotal && seg.distanceToNext && (
                                                    <div className="itinerary-leg">
                                                        <div className="itinerary-leg-line"></div>
                                                        <div className="itinerary-leg-stats">
                                                            {isLastInDay && seg.waypoint.isOvernight ? (
                                                                <span>OVERNIGHT STOP • NEXT: {seg.distanceToNext.toUpperCase()} | {seg.durationToNext.toUpperCase().replace('H', 'HR ').replace('M', 'MIN')}</span>
                                                            ) : (
                                                                <span>{seg.distanceToNext.toUpperCase()} | {seg.durationToNext.toUpperCase().replace('H', 'HR ').replace('M', 'MIN')}</span>
                                                            )}
                                                        </div>
                                                        <div className="itinerary-leg-line"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                });
            })}
        </div>
    );
}
