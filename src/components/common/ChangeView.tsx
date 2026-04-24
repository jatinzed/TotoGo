import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface ChangeViewProps {
  center: [number, number];
  zoom?: number;
}

export function ChangeView({ center, zoom }: ChangeViewProps) {
  const map = useMap();
  
  useEffect(() => {
    if (!center || isNaN(center[0]) || isNaN(center[1])) return;
    
    // Only set view if the center is significantly different (to avoid jitter) or specifically requested
    const currentCenter = map.getCenter();
    const dist = Math.sqrt(Math.pow(currentCenter.lat - center[0], 2) + Math.pow(currentCenter.lng - center[1], 2));
    
    if (dist > 0.0001) {
      map.setView(center, zoom || map.getZoom());
    }
    
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  
  return null;
}
