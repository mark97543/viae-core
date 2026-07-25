import './MapTool.css'
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Size } from '@tauri-apps/api/dpi';

const MapTool = ({ maptool_display, setView }: { maptool_display: boolean, setView: (view: 'splash' | 'map' | 'maptool') => void }) => {

    const [filePath, setFilePath] = useState('');
    const [fileSize, setFileSize] = useState('')
    const [isImporting, setIsImporting] = useState(false);

    //function to open file picker
    const handleFileImport = async () => {
        try {
            //open native os file picker
            const selectedPath = await open({
                multiple: false,
                directory: false,
                filters: [{
                    name: 'Offline Map Archives',
                    extensions: ['pbf']
                }]
            });
            if (selectedPath) {
                console.log("Selected map File Path: ", selectedPath);
                setFilePath(selectedPath as string);
                //Get File Size From Rust
                const size = await invoke<string>('get_file_size', { filePath: selectedPath });
                setFileSize(size);
                console.log("File Size: ", fileSize)
            }
        } catch (error) {
            console.error("File Selection Failed: ", error)
        }
    }

    //Function to start import 
    const handleConfirmImport = async () => {
        if (!filePath) return;

        setIsImporting(true);
        try {
            const result = await invoke('import_map_file', { filePath: filePath });
            console.log(result);
            // Navigate back to the map view when completed successfully
            setView('map');
            // Reset for next time
            setFilePath('');
            setFileSize('');
        } catch (error) {
            console.error("Failed to copy map file: ", error);
            alert("Map Compilation Failed: " + error);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="MapTool_Wrapper" style={{ display: maptool_display ? 'flex' : 'none' }}>
            <div className="MapTool_Card">
                <div className="MapTool_Header">
                    <h2>Import Offline Map</h2>
                    <p>Select a `.pbf` map archive to load into the tactical vault.</p>
                </div>

                <div className="MapTool_Content">
                    <div className="MapTool_FileDisplay">
                        <span className="MapTool_Label">Selected Source</span>
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
                                Forging tactical assets...<br/>
                                <span style={{fontSize: '0.9em', color: '#aaaaaa'}}>This process may take several minutes depending on the map size.</span>
                            </div>
                        ) : (
                            <>
                                <button className='button' onClick={() => handleConfirmImport()}>Import Map</button>
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
    )
}

export default MapTool;