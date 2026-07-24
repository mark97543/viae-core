import './MapTool.css'

const MapTool = ({ maptool_display }: { maptool_display: boolean }) => {

    return (
        <div className="MapTool_Wrapper" style={{ display: maptool_display ? 'flex' : 'none' }}>
            <button className='button'>Load Map</button>
        </div>
    )
}

export default MapTool;