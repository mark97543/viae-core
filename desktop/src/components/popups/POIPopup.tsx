import './POIPopup.css';
import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useWaypoints } from '../../context/WaypointContext.tsx';

interface POIPopupProps {
    display: boolean;
    setDisplay: (value: boolean) => void;
    data: any;
    onAdd?: () => void;
}

const POIPopup = ({ display, setDisplay, data, onAdd }: POIPopupProps) => {
    const [copied, setCopied] = useState(false);
    const { addWaypoint } = useWaypoints();

    const handleAddWaypoint = () => {
        if (!data?.lat || !data?.lng) return;
        addWaypoint({
            name: data.name || 'Unknown Location',
            lat: data.lat,
            lng: data.lng,
            type: 'poi',
            description: data.description,
        });
        if (onAdd) onAdd();
    };

    const handleCopy = () => {
        if (!data?.lat || !data?.lng) return;
        navigator.clipboard.writeText(`${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    let tags: any = {};
    if (data?.tags) {
        try {
            tags = JSON.parse(data.tags);
        } catch (e) {
            console.error("Failed to parse tags JSON", e);
        }
    }

    const street = tags['addr:street'] || '';
    const houseNumber = tags['addr:housenumber'] || '';
    const fullAddress = `${houseNumber} ${street}`.trim();

    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
    const state = tags['addr:state'] || tags['addr:province'] || '';
    const postcode = tags['addr:postcode'] || '';

    const fullAddress2 = [city, state, postcode].filter(Boolean).join(', ').trim();

    const phoneNumber = tags['phone'] || '';
    const website = tags['website'] || '';
    const rawHours = tags['opening_hours'] || '';
    const hoursList = rawHours.split(';').map((h: string) => h.trim()).filter((h: string) => h.length > 0);

    return (
        <div className={`poi-popup ${display ? 'open' : ''}`}>
            <h2>{data?.name || 'Unknown Location'}</h2>

            <div className="poi-popup-scrollable">
                {(fullAddress || fullAddress2) && (
                    <div className="poi-section">
                        {fullAddress && <h4>{fullAddress}</h4>}
                        {fullAddress2 && <h4>{fullAddress2}</h4>}
                    </div>
                )}

                {(phoneNumber || website) && (
                    <div className="poi-section poi-contact">
                        {phoneNumber && <div className="poi-contact-item"><strong>Phone:</strong> {phoneNumber}</div>}
                        {website && (
                            <div className="poi-contact-item">
                                <strong>Web:</strong> <a href="#" onClick={(e) => { e.preventDefault(); openUrl(website); }}>{website}</a>
                            </div>
                        )}
                    </div>
                )}

                {hoursList.length > 0 && (
                    <div className="poi-hours">
                        <div className="poi-hours-title">Hours</div>
                        <table className="poi-hours-table">
                            <tbody>
                                {hoursList.map((hourRow: string, idx: number) => {
                                    const firstSpace = hourRow.indexOf(' ');
                                    if (firstSpace === -1) return <tr key={idx}><td colSpan={2}>{hourRow}</td></tr>;
                                    const day = hourRow.substring(0, firstSpace);
                                    const time = hourRow.substring(firstSpace + 1);
                                    return (
                                        <tr key={idx}>
                                            <td className="poi-day">{day}</td>
                                            <td className="poi-time">{time}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
    );
};

export default POIPopup;
