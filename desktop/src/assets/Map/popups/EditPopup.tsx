import './EditPopUp.css'
import { useState, useEffect } from 'react'
import { Waypoint, useWaypoints } from '../../../context/WaypointContext'

const EditPopup = ({ display, setDisplay, data }: { display: boolean, setDisplay: (value: boolean) => void, data: Waypoint | null }) => {
    const { editWaypoint, removeWaypoint } = useWaypoints();
    
    // Local state for the form fields so we can Cancel without saving
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [breakHours, setBreakHours] = useState(0);
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [budget, setBudget] = useState(0);
    const [isOvernight, setIsOvernight] = useState(false);
    const [nextDayStartTime, setNextDayStartTime] = useState('08:00');
    const [type, setType] = useState<'default' | 'fuel' | 'food' | 'lodging' | 'attraction' | 'shaping' | 'marker' | 'poi'>('default');

    // Sync local state when a new waypoint is opened
    useEffect(() => {
        if (data) {
            setName(data.name || '');
            setDescription(data.description || '');
            setBreakHours(data.breakHours || 0);
            setBreakMinutes(data.breakMinutes || 0);
            setBudget(data.budget || 0);
            setIsOvernight(data.isOvernight || false);
            setNextDayStartTime(data.nextDayStartTime || '08:00');
            setType(data.type || 'default');
        }
    }, [data, display]);

    const handleSave = () => {
        setDisplay(false);
        if (data) {
            // Defer the heavy route calculation to allow the CSS close animation to play smoothly
            setTimeout(() => {
                editWaypoint(data.id, { 
                    name, 
                    description, 
                    breakHours: isOvernight ? 0 : breakHours, 
                    breakMinutes: isOvernight ? 0 : breakMinutes, 
                    budget,
                    isOvernight,
                    nextDayStartTime: isOvernight ? nextDayStartTime : undefined,
                    type
                });
            }, 300);
        }
    };

    const handleDelete = () => {
        if (data && confirm('Are you sure you want to remove this waypoint?')) {
            setDisplay(false);
            setTimeout(() => {
                removeWaypoint(data.id);
            }, 300);
        }
    };

    return (
        <div className={`poi-popup ${display ? 'open' : ''}`}>
            <h2>Edit Waypoint</h2>

            <div className="poi-popup-scrollable">
                <div className="poi-section">
                    <label className="edit-form-label">Waypoint Name</label>
                    <input
                        className="edit-form-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter a custom name..."
                    />
                </div>

                <div className="poi-section" style={{ marginTop: '16px' }}>
                    <label className="edit-form-label">Waypoint Type</label>
                    <select 
                        className="edit-form-input" 
                        value={type} 
                        onChange={(e) => setType(e.target.value as any)}
                        style={{ width: '100%', cursor: 'pointer' }}
                    >
                        <option value="default">Default</option>
                        <option value="shaping">Shaping Point (Pass-through)</option>
                        <option value="lodging">Lodging</option>
                        <option value="fuel">Fuel</option>
                        <option value="food">Food</option>
                        <option value="attraction">Attraction</option>
                    </select>
                </div>

                <div className="poi-section" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id="overnightToggle"
                            checked={isOvernight}
                            onChange={(e) => setIsOvernight(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: '#38bdf8', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="overnightToggle" className="edit-form-label" style={{ margin: 0, cursor: 'pointer', color: isOvernight ? '#38bdf8' : '#e2e8f0' }}>
                            Overnight Layover (End of Day)
                        </label>
                    </div>
                </div>

                {!isOvernight ? (
                    <div className="poi-section" style={{ marginTop: '16px' }}>
                        <label className="edit-form-label">Break Duration</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    className="edit-form-input"
                                    type="number"
                                    min="0"
                                    max="72"
                                    value={breakHours}
                                    onChange={(e) => setBreakHours(parseInt(e.target.value) || 0)}
                                    style={{ width: '100%' }}
                                />
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>hr</span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    className="edit-form-input"
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={breakMinutes}
                                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                                    style={{ width: '100%' }}
                                />
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>min</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="poi-section" style={{ marginTop: '16px' }}>
                        <label className="edit-form-label" style={{ color: '#38bdf8' }}>Next Day Start Time</label>
                        <input
                            className="edit-form-input"
                            type="time"
                            value={nextDayStartTime}
                            onChange={(e) => {
                                setNextDayStartTime(e.target.value);
                                e.target.blur();
                            }}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}

                <div className="poi-section" style={{ marginTop: '16px' }}>
                    <label className="edit-form-label">Route Budget ($)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>$</span>
                            <input
                                className="edit-form-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={budget}
                                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="poi-section" style={{ marginTop: '16px' }}>
                    <label className="edit-form-label">Description / Notes</label>
                    <textarea
                        className="edit-form-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add tactical notes or instructions..."
                        rows={4}
                    />
                </div>
            </div>

            <div className="poi-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <button className="poi-close-btn" onClick={() => setDisplay(false)} style={{ flex: 1, margin: 0 }}>Cancel</button>
                <button className="poi-add-btn" onClick={handleSave} style={{ flex: 1, margin: 0 }}>Save</button>
                <div style={{ flexBasis: '100%', height: '4px' }}></div>
                <button 
                    className="poi-close-btn" 
                    onClick={handleDelete} 
                    style={{ 
                        flex: 1, 
                        margin: 0, 
                        borderColor: 'rgba(239, 68, 68, 0.3)', 
                        color: '#ef4444' 
                    }}
                >
                    Remove Waypoint
                </button>
            </div>
        </div>
    )
}

export default EditPopup; 