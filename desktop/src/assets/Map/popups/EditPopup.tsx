import './EditPopUp.css'
import { useState, useEffect } from 'react'
import { Waypoint, useWaypoints } from '../../../context/WaypointContext'

const EditPopup = ({ display, setDisplay, data }: { display: boolean, setDisplay: (value: boolean) => void, data: Waypoint | null }) => {
    const { editWaypoint, removeWaypoint } = useWaypoints();
    
    // Local state for the form fields so we can Cancel without saving
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Sync local state when a new waypoint is opened
    useEffect(() => {
        if (data) {
            setName(data.name || '');
            setDescription(data.description || '');
        }
    }, [data, display]);

    const handleSave = () => {
        if (data) {
            editWaypoint(data.id, { name, description });
        }
        setDisplay(false);
    };

    const handleDelete = () => {
        if (data && confirm('Are you sure you want to remove this waypoint?')) {
            removeWaypoint(data.id);
            setDisplay(false);
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