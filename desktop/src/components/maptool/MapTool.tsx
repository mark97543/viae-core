import './MapTool.css';
import { open } from '@tauri-apps/plugin-dialog';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface MapToolProps {
    maptool_display: boolean;
    setView: (view: 'splash' | 'map' | 'maptool') => void;
}

const MapTool = ({ maptool_display, setView }: MapToolProps) => {
    const [filePath, setFilePath] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [gazetteerProgress, setGazetteerProgress] = useState('');

    useEffect(() => {
        const unlistenGazetteer = listen<string>('gazetteer-progress', (event) => {
            setGazetteerProgress(event.payload);
        });

        return () => {
            unlistenGazetteer.then(f => f());
        };
    }, []);

    const handleFileImport = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                directory: false,
                filters: [{
                    name: 'Offline Map Archives',
                    extensions: ['pbf', 'osm']
                }]
            });
            if (selectedPath) {
                setFilePath(selectedPath as string);
                const size = await invoke<string>('get_file_size', { filePath: selectedPath });
                setFileSize(size);
            }
        } catch (error) {
            console.error("File Selection Failed: ", error);
        }
    };

    const handleConfirmImport = async () => {
        if (!filePath) return;

        setIsImporting(true);
        try {
            const result = await invoke('import_map_file', { filePath: filePath });
            console.log(result);
            setView('map');
            setFilePath('');
            setFileSize('');
            setGazetteerProgress('');
        } catch (error) {
            console.error("Failed to copy map file: ", error);
            alert("Map Compilation Failed: " + error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="MapTool_Wrapper" style={{ display: maptool_display ? 'flex' : 'none' }}>
            <div className="MapTool_Card">
                <div className="MapTool_Header">
                    <h2>Import & Forge Map Archive</h2>
                    <p>Select a `.pbf` OpenStreetMap archive to compile vector tiles, routing networks, and POI index into the tactical vault.</p>
                </div>

                <div className="MapTool_Content">
                    <div className="MapTool_FileDisplay">
                        <span className="MapTool_Label">Selected Source Archive (.pbf)</span>
                        <div className="MapTool_PathBox" title={filePath}>
                            <div className="MapTool_PathText">
                                {filePath ? filePath : "No file selected"}
                            </div>
                            {fileSize && <span className='MapTool_FileSize'>{fileSize}</span>}
                        </div>
                    </div>

                    <div className="MapTool_Actions">
                        {isImporting ? (
                            <div style={{ color: '#ff4444', fontWeight: 'bold', textAlign: 'center', padding: '10px 0' }}>
                                Forging tactical assets...<br />
                                <span style={{ fontSize: '0.9em', color: '#aaaaaa' }}>This process may take several minutes depending on the map size.</span>
                                {gazetteerProgress && (
                                    <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#00ffff' }}>
                                        {gazetteerProgress}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button className='button' onClick={() => handleConfirmImport()}>Import & Compile Map</button>
                                <button className='button' onClick={handleFileImport}>
                                    {filePath ? 'Change File' : 'Browse Files'}
                                </button>
                                <button className='button' onClick={() => setView('map')}>Cancel</button>
                            </>
                        )}
                    </div>

                    <div className="MapTool_Warning">
                        <h3>Warning: importing will delete your current map</h3>
                    </div>

                    <div className="MapTool_InfoBox">
                        <div className="MapTool_InfoTitle">Expected Output (3 Files)</div>
                        <ul className="MapTool_InfoList">
                            <li>
                                <strong>Map Database (.mbtiles):</strong> Displays the tactical map.
                                {fileSize && ` (Est. ${parseFloat(fileSize).toFixed(1)} MB - ${(parseFloat(fileSize) * 1.5).toFixed(1)} MB)`}
                            </li>
                            <li><strong>Routing Data:</strong> Enables offline navigation and route calculation.{fileSize && ` (Est. ${(parseFloat(fileSize) * 3).toFixed(1)} MB - ${(parseFloat(fileSize) * 5).toFixed(1)} MB)`}</li>
                            <li><strong>POI Index:</strong> Enables location searching and waypoints.{fileSize && ` (Est. ${(parseFloat(fileSize) * .3).toFixed(1)} MB - ${(parseFloat(fileSize) * .5).toFixed(1)} MB)`}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapTool;
