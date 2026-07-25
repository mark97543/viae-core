/**
 * Parses a search string into latitude and longitude coordinates.
 * Accepts formats like "38.9, -77.03" or "38.9 -77.03".
 * Returns null if the string cannot be parsed or if coordinates are invalid.
 */
export function parseCoordinates(searchString: string): { lat: number, lng: number } | null {
    if (!searchString) return null;

    const parts = searchString.split(/[,\s]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    
    if (parts.length === 2) {
        const lat = parts[0];
        const lng = parts[1];
        
        // Basic coordinate validation (-90 to 90 lat, -180 to 180 lng)
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }
    
    return null;
}
