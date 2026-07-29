import './EditPopUp.css'
import { useState, useEffect } from 'react'
import { Waypoint, useWaypoints } from '../../../context/WaypointContext'

const EditPopup = ({ display, setDisplay, data }: { display: boolean, setDisplay: (value: boolean) => void, data: Waypoint | null }) => {
    const { editWaypoint } = useWaypoints();
    
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

            <div className="poi-footer">
                <button className="poi-close-btn" onClick={() => setDisplay(false)}>Cancel</button>
                <button className="poi-add-btn" onClick={handleSave} style={{ margin: 0, width: 'auto', flex: 1, marginLeft: '12px' }}>Save Changes</button>
            </div>
        </div>
    )
}

export default EditPopup; 