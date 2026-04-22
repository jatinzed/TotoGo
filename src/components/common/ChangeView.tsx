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
    
    map.setView(center, zoom || 15);
    
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  
  return null;
}
