import './MapTool.css'
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const MapTool = ({ maptool_display }: { maptool_display: boolean }) => {

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
            }
        } catch (error) {
            console.error("File Selection Failed: ", error)
        }
    }

    return (
        <div className="MapTool_Wrapper" style={{ display: maptool_display ? 'flex' : 'none' }}>
            <button className='button' onClick={handleFileImport}>Load Map</button>
        </div>
    )
}

export default MapTool;