import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Car, RefreshCw, Navigation } from 'lucide-react';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { cn } from '../../../utils/format';
import L from 'leaflet';

// Custom driver icon
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export default function LiveDriverMap() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();

    // Subscribe to real-time changes in driver_profiles
    const channel = supabase
      .channel('live-drivers')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'driver_profiles' 
      }, () => {
        fetchDrivers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*, user:users(full_name, email)')
      .eq('online_status', true);
    
    setDrivers(data || []);
    setLoading(false);
  };

  const center = [22.5726, 88.3639] as [number, number]; // Default to Kolkata or a sensible city center

  return (
    <div className="h-[700px] bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-6 left-6 z-[1000] space-y-2">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-xl">
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <h3 className="font-black text-sm uppercase tracking-widest text-black">Live Fleet</h3>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{drivers.length} Drivers Online</p>
        </div>
        <button 
          onClick={fetchDrivers}
          className="bg-black text-white p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="text-[10px] font-black uppercase tracking-widest">Refresh</span>
        </button>
      </div>

      <MapContainer {...({ center, zoom: 12, className: "w-full h-full" } as any)}>
        <TileLayer {...({ url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" } as any)} />
        {drivers.map(driver => {
          const coords = parsePoint(driver.location);
          if (!coords) return null;
          return (
            <Marker 
              key={driver.id} 
              {...({
                position: toLatLngTuple(coords),
                icon: driverIcon
              } as any)}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <p className="font-black text-xs mb-1">{driver.user?.full_name}</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                      {driver.vehicle_model} • {driver.vehicle_number}
                    </p>
                    <div className="flex items-center space-x-1 mt-2">
                       <span className={cn(
                         "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                         driver.is_busy ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                       )}>
                         {driver.is_busy ? 'On Trip' : 'Available'}
                       </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
