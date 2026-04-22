import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { Ride, DriverProfile } from '../../common/types';
import { formatCurrency, cn } from '../../../utils/format';
import { useRouting, RouteData } from '../../../lib/maps/routing';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { ChangeView } from '../../../components/common/ChangeView';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Power, MapPin, Navigation, CheckCircle2, ChevronRight, Loader2, ArrowRight } from 'lucide-react';

export default function DriverHome() {
  const { profile } = useAuthStore();
  const { getRoute } = useRouting();

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      fetchDriverStatus();
      subscribeToRideAssignments();
    }
  }, [profile]);

  const fetchDriverStatus = async () => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', profile!.id)
      .single();
    
    if (data) {
      setDriverProfile(data);
      setOnline(data.online_status);
      if (data.online_status) startWatchingLocation();
    }
    setLoading(false);
  };

  const subscribeToRideAssignments = () => {
    const requestsSub = supabase
      .channel('new-ride-requests')
      .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'rides', 
         filter: 'status=eq.requested' 
      }, (payload) => {
        if (!currentRide) setCurrentRide(payload.new as Ride);
      })
      .subscribe();

    const assignedSub = supabase
      .channel(`driver-rides-${profile!.id}`)
      .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'rides', 
         filter: `driver_id=eq.${profile!.id}` 
      }, (payload) => {
        const newRide = payload.new as Ride;
        if (['accepted', 'arrived', 'started'].includes(newRide.status)) {
           setCurrentRide(newRide);
        } else if (['completed', 'cancelled_by_rider', 'cancelled_by_driver'].includes(newRide.status)) {
           setCurrentRide(null);
        }
      })
      .subscribe();

    return () => {
      requestsSub.unsubscribe();
      assignedSub.unsubscribe();
    }
  };

  useEffect(() => {
      const checkExisting = async () => {
          const { data } = await supabase
              .from('rides')
              .select('*')
              .eq('driver_id', profile!.id)
              .in('status', ['accepted', 'arrived', 'started'])
              .order('requested_at', { ascending: false })
              .limit(1);
          if (data && data.length > 0) setCurrentRide(data[0]);
      };
      if (profile) checkExisting();
  }, [profile]);

  const toggleOnline = async () => {
    const newStatus = !online;
    setOnline(newStatus);
    
    await supabase
      .from('driver_profiles')
      .update({ online_status: newStatus })
      .eq('user_id', profile!.id);

    if (newStatus) {
      startWatchingLocation();
    } else {
      stopWatchingLocation();
    }
  };

  const startWatchingLocation = () => {
    if (watchId) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        await supabase
          .from('driver_profiles')
          .update({ 
            location: `POINT(${longitude} ${latitude})`,
            last_location_update: new Date().toISOString()
          })
          .eq('user_id', profile!.id);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    setWatchId(id);
  };

  const stopWatchingLocation = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    supabase.from('driver_profiles').update({ online_status: false }).eq('user_id', profile!.id);
  };

  const handleRideAction = async (newStatus: 'accepted' | 'arrived' | 'started' | 'completed') => {
    if (!currentRide) return;
    const update: any = { status: newStatus };
    if (newStatus === 'accepted') {
      update.driver_id = profile!.id;
      update.accepted_at = new Date().toISOString();
    }
    if (newStatus === 'started') update.started_at = new Date().toISOString();
    if (newStatus === 'completed') update.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('rides')
      .update(update)
      .eq('id', currentRide.id)
      .select()
      .single();
    
    if (data) setCurrentRide(newStatus === 'completed' ? null : data);
    if (error) alert(error.message);
  };

  const handleDecline = async () => {
    setCurrentRide(null);
  };

  useEffect(() => {
    if (currentRide) {
       const p = parsePoint(currentRide.pickup_geometry);
       const d = parsePoint(currentRide.dropoff_geometry);
       if (p && d) {
         getRoute(p, d).then(res => {
            if (res) setRoute(res.primary);
         });
       }
    } else {
       setRoute(null);
    }
  }, [currentRide?.id]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-xs">Loading Status...</div>;

  return (
    <div className="h-screen flex flex-col pt-4">
      <div className="flex-grow relative">
        <MapContainer 
          center={[22.5726, 88.3639]} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <ChangeView 
            center={toLatLngTuple(driverProfile?.location)} 
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {driverProfile?.location && parsePoint(driverProfile.location) && (
            <Marker 
              position={toLatLngTuple(driverProfile.location)} 
              icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [32, 32] })} 
            />
          )}

          {currentRide && (
            <>
              {parsePoint(currentRide.pickup_geometry) && <Marker position={toLatLngTuple(currentRide.pickup_geometry)} />}
              {parsePoint(currentRide.dropoff_geometry) && <Marker position={toLatLngTuple(currentRide.dropoff_geometry)} />}
            </>
          )}

          {route && (
            <Polyline 
              positions={route.geometry.coordinates.map(c => [c[1], c[0]])} 
              color="#000000" 
              weight={4} 
              opacity={0.6} 
            />
          )}
        </MapContainer>

        {!currentRide && (
           <div className="absolute top-4 left-0 right-0 px-6 z-[1000]">
              <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center justify-between">
                 <div>
                    <p className="font-black text-xl">{online ? 'You are Online' : 'You are Offline'}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                      {online ? 'Listening for rides' : 'Go online to receive jobs'}
                    </p>
                 </div>
                 <button 
                  onClick={toggleOnline}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-lg active:scale-95",
                    online ? "bg-black text-white" : "bg-white border-2 border-black text-black"
                  )}
                 >
                    <Power size={24} />
                 </button>
              </div>
           </div>
        )}
      </div>

      <AnimatePresence>
        {currentRide && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="bg-white p-6 rounded-t-[40px] shadow-[0_-10px_50px_rgba(0,0,0,0.1)] relative z-20"
          >
             {currentRide.status === 'requested' && (
                <div className="space-y-6">
                   <div className="flex justify-between items-start">
                      <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                         <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />
                         Ride Request Nearby
                      </div>
                      <p className="text-2xl font-black">{formatCurrency(currentRide.fare)}</p>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                         <div className="w-2 h-2 bg-black rounded-full" />
                         <p className="font-bold text-sm truncate">{currentRide.pickup_address}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                         <div className="w-2 h-2 bg-white border border-black rounded-full" />
                         <p className="font-bold text-sm truncate text-gray-400">{currentRide.dropoff_address}</p>
                      </div>
                   </div>

                   <div className="flex space-x-3">
                      <button 
                        onClick={() => handleRideAction('accepted')}
                        className="flex-grow py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
                      >
                         <CheckCircle2 size={18} />
                         <span>Accept Job</span>
                      </button>
                      <button 
                        onClick={handleDecline}
                        className="px-6 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all active:scale-95"
                      >
                        Decline
                      </button>
                   </div>
                </div>
             )}

             {currentRide.status === 'accepted' && (
                <div className="space-y-6">
                   <div className="flex justify-between items-start">
                      <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                         <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />
                         Head to Pickup
                      </div>
                      <p className="text-2xl font-black">{formatCurrency(currentRide.fare)}</p>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                         <div className="w-2 h-2 bg-black rounded-full" />
                         <p className="font-bold text-sm truncate">{currentRide.pickup_address}</p>
                      </div>
                   </div>

                   <div className="flex space-x-3">
                      <button 
                        onClick={() => handleRideAction('arrived')}
                        className="flex-grow py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
                      >
                         <Navigation size={18} />
                         <span>I have Arrived</span>
                      </button>
                   </div>
                </div>
             )}

             {currentRide.status === 'arrived' && (
                <div className="space-y-6 text-center py-4">
                   <div className="w-20 h-20 bg-black rounded-[32px] mx-auto flex items-center justify-center mb-4">
                      <MapPin size={32} className="text-white animate-bounce" />
                   </div>
                   <h3 className="text-2xl font-black">Pickup the Rider</h3>
                   <p className="text-gray-400 text-sm font-medium">Verify the rider name and destination before starting the trip.</p>
                   <button 
                    onClick={() => handleRideAction('started')}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-all"
                   >
                      Start Trip
                   </button>
                </div>
             )}

             {currentRide.status === 'started' && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black">Trip in Progress</h3>
                        <p className="font-black text-xl text-black">{formatCurrency(currentRide.fare)}</p>
                   </div>
                   <div className="bg-gray-50 p-5 rounded-3xl space-y-4">
                      <div className="flex items-start space-x-4">
                         <MapPin size={18} className="text-black mt-1 shrink-0" />
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                            <p className="font-bold text-sm leading-tight">{currentRide.dropoff_address}</p>
                         </div>
                      </div>
                   </div>
                   <button 
                    onClick={() => handleRideAction('completed')}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-all"
                   >
                      Complete & Collect
                      <ArrowRight className="ml-2" size={18} />
                   </button>
                </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
