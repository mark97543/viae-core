import TacticalMap from "./TacticalMap.tsx";

const MapContainer = ({ map_display }: { map_display: boolean }) => {
    return (
        <div style={{ display: map_display ? 'block' : 'none' }}>
            <TacticalMap />
        </div>
    );
};

export default MapContainer;
