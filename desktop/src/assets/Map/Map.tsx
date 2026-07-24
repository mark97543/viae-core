
const Map = ({ map_display }: { map_display: boolean }) => {

    return (
        <div style={{ display: map_display ? 'block' : 'none' }}>
            Map
        </div>
    )
}

export default Map;