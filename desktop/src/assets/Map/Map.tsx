import TacticalMap from "./TacticalMap";

const Map = ({ map_display }: { map_display: boolean }) => {



    return (
        <div style={{ display: map_display ? 'block' : 'none' }}>
            <TacticalMap />
        </div>
    )
}

export default Map;