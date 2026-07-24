import './MapTool.css'
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const MapTool = ({ maptool_display, setView }: { maptool_display: boolean, setView: (view: 'splash' | 'map' | 'maptool') => void }) => {

    const [filePath, setFilePath] = useState('');
    const [fileSize, setFileSize] = useState('')

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
                        <button className='button'>Import Map</button>
                        <button className='button' onClick={handleFileImport}>
                            {filePath ? 'Change File' : 'Browse Files'}
                        </button>
                        <button className='button' onClick={() => setView('map')}>Cancel</button>
                    </div>

                    <div>
                        <h3>Warning importing will delete your current map</h3>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MapTool;