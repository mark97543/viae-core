import './TitlePopup.css'
import { useState, useEffect } from 'react'
import { Trip } from '../../../context/WaypointContext'


const TitlePopup = ({ display, setDisplay, tripData, setTripData }: { display: boolean, setDisplay: (value: boolean) => void, tripData: Trip | null, setTripData: (tripData: Trip | null) => void }) => {
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (tripData) {
            setName(tripData.name || '');
            setDescription(tripData.description || '');
        }
    }, [tripData, display]);

    const handleSave = () => {
        setTripData({ name, description });
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
            </div>

            <div className="poi-footer">
                <button className="poi-close-btn" onClick={() => setDisplay(false)}>Cancel</button>
                <button className="poi-add-btn" onClick={handleSave} style={{ margin: 0, width: 'auto', flex: 1, marginLeft: '12px' }}>Save Changes</button>
            </div>
        </div>
    )
}

export default TitlePopup;