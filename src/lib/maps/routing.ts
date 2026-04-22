import { useState, useCallback } from 'react';

export interface RouteData {
  distance: number;
  duration: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

export const useRouting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRoute = useCallback(async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
    setLoading(true);
    setError(null);
    try {
      const startStr = `${start.lng},${start.lat}`;
      const endStr = `${end.lng},${end.lat}`;
      const response = await fetch(`/api/route?start=${startStr}&end=${endStr}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch route');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getRoute, loading, error };
};
