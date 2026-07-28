import './MarkerPopup.css'
import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useWaypoints } from '../../../context/WaypointContext';

const MarkerPopup = ({ display, setDisplay, data }: { display: boolean, setDisplay: (value: boolean) => void, data: { lat: number, lng: number } | null }) => {
    const [copied, setCopied] = useState(false);
    const { addWaypoint } = useWaypoints();

    const handleAddWaypoint = () => {
        if (!data?.lat || !data?.lng) return;
        addWaypoint({
            name: 'Custom Location',
            lat: data.lat,
            lng: data.lng,
            type: 'marker',
            description: 'A user-defined marker on the map.',
        });
    };

    const handleCopy = () => {
        if (!data?.lat || !data?.lng) return;
        navigator.clipboard.writeText(`${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`poi-popup ${display ? 'open' : ''}`}>
            <h2>Dropped Pin</h2>
            
            <div className="poi-popup-scrollable">
                <div className="poi-section">
                    <h4>Custom Location</h4>
                    <h4>A user-defined marker on the map.</h4>
                </div>
            </div>
            
            <button className="poi-add-btn" onClick={handleAddWaypoint}>
                <span>+</span> Add to Trip
            </button>

            <div className="poi-footer">
                {data?.lat && data?.lng ? (
                    <div className="poi-coords">
                        <div className="poi-coords-row">
                            <div className="poi-coords-text" title="Latitude, Longitude">
                                {data.lat.toFixed(6)}, {data.lng.toFixed(6)}
                            </div>
                            <button className="poi-copy-btn" onClick={handleCopy}>
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <a href="#" onClick={(e) => {
                            e.preventDefault();
                            openUrl(`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`);
                        }} className="poi-gmaps-link">Open in Google Maps</a>
                    </div>
                ) : <div />}
                
                <button className="poi-close-btn" onClick={() => setDisplay(false)}>Close</button>
            </div>
        </div>
    )
}

export default MarkerPopup