import './EditPopUp.css'

const EditPopup = ({ display, setDisplay, data }: { display: boolean, setDisplay: (value: boolean) => void, data: any }) => {
    return (
        <div className={`poi-popup ${display ? 'open' : ''}`}>
            <h2>Edit Waypoint</h2>
            
            <div className="poi-popup-scrollable">
                <div className="poi-section">
                    <h4>Editing: {data?.name || 'Unknown Location'}</h4>
                </div>
            </div>

            <div className="poi-footer">
                <button className="poi-close-btn" onClick={() => setDisplay(false)}>Cancel</button>
                <button className="poi-add-btn" style={{ margin: 0, width: 'auto', flex: 1, marginLeft: '12px' }}>Save</button>
            </div>
        </div>
    )
}

export default EditPopup; 