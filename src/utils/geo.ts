export function parsePoint(pt: any): { lat: number, lng: number } | null {
  if (!pt) return null;
  
  try {
    // Handle PostGIS object from Supabase (standard behavior)
    if (typeof pt === 'object' && pt.coordinates) {
      return { lng: pt.coordinates[0], lat: pt.coordinates[1] };
    }
    
    // Handle PostGIS string
    if (typeof pt === 'string') {
      const match = pt.match(/POINT\((.+) (.+)\)/);
      if (match) {
        return { 
          lng: parseFloat(match[1]), 
          lat: parseFloat(match[2]) 
        };
      }
    }
    
    // Handle simple object {lat, lng} or [lat, lng]
    if (typeof pt === 'object') {
      if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
        return { lat: pt.lat, lng: pt.lng };
      }
      if (Array.isArray(pt) && pt.length === 2) {
        return { lat: pt[0], lng: pt[1] };
      }
    }
  } catch (e) {
    console.error('Error parsing point:', e);
  }

  return null;
}

export function toLatLngTuple(pt: any, fallback: [number, number] = [22.5726, 88.3639]): [number, number] {
  const parsed = parsePoint(pt);
  return parsed ? [parsed.lat, parsed.lng] : fallback;
}
