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
        
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }
    
    return null;
}

/**
 * Decodes a polyline6 string into an array of [longitude, latitude] coordinates for GeoJSON.
 */
export function decodePolyline6(str: string, precision: number = 6): [number, number][] {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates: [number, number][] = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
}
