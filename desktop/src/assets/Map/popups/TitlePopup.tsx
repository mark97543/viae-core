import './TitlePopup.css'
import { useState, useEffect } from 'react'
import { Trip, useWaypoints } from '../../../context/WaypointContext'

const formatDuration = (seconds: number) => {
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
};

const TitlePopup = ({ display, setDisplay, tripData, setTripData }: { display: boolean, setDisplay: (value: boolean) => void, tripData: Trip | null, setTripData: (tripData: Trip | null) => void }) => {
    
    const { routeData } = useWaypoints();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');

    useEffect(() => {
        if (tripData) {
            setName(tripData.name || '');
            setDescription(tripData.description || '');
            setStartDate(tripData.startDate || '');
            setStartTime(tripData.startTime || '');
        }
    }, [tripData, display]);

    const handleSave = () => {
        setTripData({ name, description, startDate, startTime });
        setDisplay(false);
    };

    return (
        <div className={`poi-popup ${display ? 'open' : ''}`}>
            <h2>Trip Settings</h2>
            
            <div className="poi-popup-scrollable">
                <div className="poi-section">
                    <label className="edit-form-label">Trip Name</label>
                    <input
                        className="edit-form-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name your trip..."
                    />
                </div>

                <div className="poi-section" style={{ marginTop: '16px' }}>
                    <label className="edit-form-label">Trip Summary</label>
                    <textarea
                        className="edit-form-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a brief summary or notes about this trip..."
                        rows={4}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <div className="poi-section" style={{ flex: 1 }}>
                        <label className="edit-form-label">Start Date</label>
                        <input
                            className="edit-form-input"
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                e.target.blur();
                            }}
                        />
                    </div>
                    <div className="poi-section" style={{ flex: 1 }}>
                        <label className="edit-form-label">Start Time</label>
                        <input
                            className="edit-form-input"
                            type="time"
                            value={startTime}
                            onChange={(e) => {
                                setStartTime(e.target.value);
                                e.target.blur();
                            }}
                        />
                    </div>
                </div>
                
                {routeData && (
                    <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', fontWeight: 600 }}>Trip Statistics</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Distance</span>
                            <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 500 }}>{routeData.distance.toFixed(1)} miles</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Driving Time</span>
                            <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 500 }}>{formatDuration(routeData.duration)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="poi-footer">
                <button className="poi-close-btn" onClick={() => setDisplay(false)}>Cancel</button>
                <button className="poi-add-btn" onClick={handleSave} style={{ margin: 0, width: 'auto', flex: 1, marginLeft: '12px' }}>Save Changes</button>
            </div>
        </div>
    )
}

export default TitlePopup;