import React, { useState, useEffect } from 'react';
import './MobileSyncModal.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface MobileSyncModalProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    initialTab?: 'sync' | 'push_trips' | 'provision';
}

interface UsbDevice {
    id: string;
    model: string;
    status: string;
}

interface UsbProgress {
    progress_percent: number;
    status_message: string;
}

interface SavedTrip {
    name: string;
    filename: string;
    path: string;
    waypoint_count: number;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
    display,
    setDisplay,
    initialTab = 'sync'
}) => {
    const [activeTab, setActiveTab] = useState<'sync' | 'push_trips' | 'provision'>(initialTab);
    const [usbDevices, setUsbDevices] = useState<UsbDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferStatus, setTransferStatus] = useState('');

    const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
    const [selectedTripPaths, setSelectedTripPaths] = useState<string[]>([]);

    const scanUsbDevices = async () => {
        try {
            const devices = await invoke<UsbDevice[]>('detect_usb_devices');
            setUsbDevices(devices);
            if (devices.length > 0 && !selectedDevice) {
                setSelectedDevice(devices[0].id);
            }
        } catch (e) {
            console.error("Failed to detect USB devices:", e);
        }
    };

    const fetchDesktopTrips = async () => {
        try {
            const trips = await invoke<SavedTrip[]>('list_saved_trips');
            if (trips && Array.isArray(trips)) {
                setSavedTrips(trips);
                setSelectedTripPaths(trips.map(t => t.path));
            }
        } catch (err) {
            console.warn("Failed to list saved trips:", err);
        }
    };

    useEffect(() => {
        if (display) {
            scanUsbDevices();
            fetchDesktopTrips();
            setActiveTab(initialTab);
        }
    }, [display, initialTab]);

    useEffect(() => {
        const unlistenUsb = listen<UsbProgress>('usb-transfer-progress', (event) => {
            setTransferStatus(`${event.payload.status_message}`);
        });

        return () => {
            unlistenUsb.then(f => f());
        };
    }, []);

    const toggleTripSelection = (path: string) => {
        setSelectedTripPaths(prev => 
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const toggleSelectAllTrips = () => {
        if (selectedTripPaths.length === savedTrips.length) {
            setSelectedTripPaths([]);
        } else {
            setSelectedTripPaths(savedTrips.map(t => t.path));
        }
    };

    const handleSyncAllMaps = async () => {
        if (!selectedDevice) {
            alert("Please select a connected USB device first.");
            return;
        }

        setIsTransferring(true);
        setTransferStatus('Copying entire desktop map vault to phone...');
        try {
            const result = await invoke<string>('push_all_maps_to_device', {
                deviceId: selectedDevice
            });
            alert(result);
        } catch (error) {
            console.error("Map Vault Sync Failed:", error);
            alert("Vault Sync Failed: " + error);
        } finally {
            setIsTransferring(false);
        }
    };

    const handlePushTripsToPhone = async () => {
        if (!selectedDevice) {
            alert("Please select a connected USB device first.");
            return;
        }

        if (selectedTripPaths.length === 0) {
            alert("Please select at least one trip to push.");
            return;
        }

        setIsTransferring(true);
        setTransferStatus('Pushing selected trips to phone over USB...');
        try {
            const result = await invoke<string>('push_trips_to_device', {
                deviceId: selectedDevice,
                filePaths: selectedTripPaths
            });
            alert(result);
        } catch (error) {
            console.error("Trip Push Failed:", error);
            alert("Trip Push Failed: " + error);
        } finally {
            setIsTransferring(false);
        }
    };

    const handleProvisionHeadUnit = async () => {
        if (!selectedDevice) {
            alert("Please select a connected USB device first.");
            return;
        }

        const confirmed = confirm(
            "⚠️ DEDICATED HANDLEBAR HEAD UNIT PROVISIONING WARNING:\n\n" +
            "This will provision the target phone into a dedicated off-grid handlebar navigation head unit:\n\n" +
            "• Install / update Iter Viae Navus APK\n" +
            "• Lock Navus as primary System Home Launcher (Kiosk Mode)\n" +
            "• Deactivate cellular radios (Airplane Mode ON • GPS & Wi-Fi Active)\n" +
            "• Override battery throttling to prevent background GPS kills\n" +
            "• Create vault path /sdcard/IterViaeNavus/maps/\n\n" +
            "Proceed with provisioning?"
        );

        if (!confirmed) return;

        setIsTransferring(true);
        setTransferStatus('Provisioning Head Unit...');
        try {
            const result = await invoke<string>('provision_head_unit', {
                deviceId: selectedDevice
            });
            alert(result);
        } catch (error) {
            console.error("Head Unit Provisioning Failed:", error);
            alert("Provisioning Failed: " + error);
        } finally {
            setIsTransferring(false);
        }
    };

    if (!display) return null;

    return (
        <div className="mobile-modal-overlay">
            <div className="mobile-modal-container">
                <div className="mobile-modal-header">
                    <div className="mobile-header-title">
                        <span>📱 MOBILE & HANDLEBAR HEAD UNIT VAULT</span>
                    </div>
                    <button className="mobile-close-btn" onClick={() => setDisplay(false)}>✕</button>
                </div>

                {/* Tab Switcher */}
                <div className="mobile-tab-bar">
                    <button 
                        className={`mobile-tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sync')}
                    >
                        📁 MAP VAULT USB SYNC
                    </button>
                    <button 
                        className={`mobile-tab-btn ${activeTab === 'push_trips' ? 'active' : ''}`}
                        onClick={() => setActiveTab('push_trips')}
                    >
                        📍 PUSH TRIPS TO PHONE
                    </button>
                    <button 
                        className={`mobile-tab-btn ${activeTab === 'provision' ? 'active' : ''}`}
                        onClick={() => setActiveTab('provision')}
                    >
                        🛠️ HEAD UNIT PROVISIONING
                    </button>
                </div>

                <div className="mobile-modal-body">
                    {/* Connected USB Devices Status */}
                    <div className="mobile-usb-card">
                        <div className="mobile-usb-header">
                            <span className="mobile-label">CONNECTED USB / ADB DEVICES</span>
                            <button className="mobile-refresh-btn" onClick={scanUsbDevices}>🔄 Scan USB</button>
                        </div>
                        {usbDevices.length > 0 ? (
                            <div className="mobile-device-list">
                                {usbDevices.map((dev) => (
                                    <div 
                                        key={dev.id} 
                                        className={`mobile-device-card ${selectedDevice === dev.id ? 'active' : ''}`}
                                        onClick={() => setSelectedDevice(dev.id)}
                                    >
                                        <span className="mobile-device-icon">📱</span>
                                        <div className="mobile-device-info">
                                            <div className="mobile-device-name">{dev.model}</div>
                                            <div className="mobile-device-id">{dev.id} ({dev.status})</div>
                                        </div>
                                        {selectedDevice === dev.id && <span className="mobile-checkmark">✓</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mobile-no-device">
                                No connected USB devices found. Connect your phone via USB (File Transfer or ADB enabled).
                            </div>
                        )}
                    </div>

                    {/* Active Tab Panel */}
                    {activeTab === 'sync' && (
                        <div className="mobile-panel">
                            <div className="mobile-panel-title">Copy Offline Map Vault to Phone over USB</div>
                            <p className="mobile-panel-desc">
                                Copies your entire desktop vector map vault (`.mbtiles`), POI search index, and routing graph directly into the phone's internal storage (`/sdcard/IterViaeNavus/maps/`).
                            </p>
                            <button 
                                className="mobile-action-btn primary"
                                onClick={handleSyncAllMaps}
                                disabled={isTransferring || !selectedDevice}
                            >
                                {isTransferring ? transferStatus || 'Syncing Map Vault...' : '📁 COPY ENTIRE MAP VAULT TO PHONE (USB)'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'push_trips' && (
                        <div className="mobile-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div className="mobile-panel-title">Push Saved Trips to Phone over USB</div>
                                <button className="mobile-refresh-btn" onClick={toggleSelectAllTrips}>
                                    {selectedTripPaths.length === savedTrips.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <p className="mobile-panel-desc">
                                Select desktop route itinerary files (`.json`) to push directly into the phone's trip storage (`/sdcard/IterViaeNavus/trips/`).
                            </p>

                            {savedTrips.length === 0 ? (
                                <div className="mobile-no-device" style={{ marginBottom: 12 }}>
                                    No saved trip itinerary files found on desktop. Save routes first using File &gt; Save Trip.
                                </div>
                            ) : (
                                <div className="mobile-trip-selection-list" style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: 12 }}>
                                    {savedTrips.map((t) => (
                                        <div 
                                            key={t.path}
                                            className={`mobile-device-card ${selectedTripPaths.includes(t.path) ? 'active' : ''}`}
                                            onClick={() => toggleTripSelection(t.path)}
                                            style={{ cursor: 'pointer', padding: '8px 12px', marginBottom: '6px' }}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={selectedTripPaths.includes(t.path)} 
                                                onChange={() => {}} 
                                                style={{ marginRight: 10 }}
                                            />
                                            <div className="mobile-device-info">
                                                <div className="mobile-device-name">📍 {t.name}</div>
                                                <div className="mobile-device-id">{t.waypoint_count} Waypoints • {t.filename}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button 
                                className="mobile-action-btn primary"
                                onClick={handlePushTripsToPhone}
                                disabled={isTransferring || !selectedDevice || selectedTripPaths.length === 0}
                            >
                                {isTransferring ? transferStatus || 'Pushing Trips...' : `📍 PUSH ${selectedTripPaths.length} SELECTED TRIPS TO PHONE (USB)`}
                            </button>
                        </div>
                    )}

                    {activeTab === 'provision' && (
                        <div className="mobile-panel">
                            <div className="mobile-panel-title">Dedicated Handlebar Head Unit Provisioning</div>
                            <p className="mobile-panel-desc">
                                Configures your connected phone into an off-grid handlebar navigation head unit:
                            </p>
                            <ul className="mobile-feature-list">
                                <li>⚡ <strong>APK Install & Auto-launch:</strong> Installs Iter Viae Navus and opens it live on screen.</li>
                                <li>🔒 <strong>System Home Kiosk Launcher:</strong> Locks Navus as default Home app.</li>
                                <li>📡 <strong>Cellular Radio Shutdown:</strong> Forces Airplane Mode ON with active GPS & Wi-Fi.</li>
                                <li>🔋 <strong>Battery Throttling Bypass:</strong> Whitelists Navus from Android device idle kills.</li>
                            </ul>
                            <button 
                                className="mobile-action-btn warning"
                                onClick={handleProvisionHeadUnit}
                                disabled={isTransferring || !selectedDevice}
                            >
                                {isTransferring ? transferStatus || 'Provisioning Head Unit...' : '🛠️ PROVISION HANDLEBAR HEAD UNIT'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
