import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MessageSquare, Star, Loader2, ShieldCheck, Navigation, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { Ride, DriverProfile, UserProfile } from '../../common/types';
import { formatCurrency, cn } from '../../../utils/format';
import { useRouting, RouteData } from '../../../lib/maps/routing';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { ChangeView } from '../../../components/common/ChangeView';

export default function RideTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRoute } = useRouting();
  
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<UserProfile & { driver_profile: DriverProfile } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (id) {
      fetchRide();
      const subscription = subscribeToRide();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [id]);

  const fetchRide = async () => {
    const { data } = await supabase
      .from('rides')
      .select('*, driver:driver_id(id, full_name, phone, driver_profile:driver_profiles(*))')
      .eq('id', id)
      .single();
    
    if (data) {
      setRide(data);
      if (data.driver) {
        setDriver(data.driver);
        if (data.driver.driver_profile?.location) {
          setDriverLocation(parsePoint(data.driver.driver_profile.location));
        }
      }

      // Fetch Route
      const p = parsePoint(data.pickup_geometry);
      const d = parsePoint(data.dropoff_geometry);
      if (p && d) {
        getRoute(p, d).then(res => {
          if (res) setRoute(res.primary);
        });
      }

      if (data.status === 'completed' && !data.rider_rating) {
        setShowRating(true);
      }
    }
  };

  const subscribeToRide = () => {
    return supabase
      .channel(`ride-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, (payload) => {
        const newRide = payload.new as Ride;
        setRide(prev => prev ? { ...prev, ...newRide } : newRide);
        
        if (newRide.status === 'completed') {
          setShowRating(true);
        }
        
        if (newRide.driver_id && (!driver || driver.id !== newRide.driver_id)) {
           fetchRide(); // Fetch new driver details
        }
      })
      .subscribe();
  };

  // Subscribe to driver location if assigned
  useEffect(() => {
    if (driver?.id) {
      const locationSub = supabase
        .channel(`driver-loc-${driver.id}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'driver_profiles', 
            filter: `user_id=eq.${driver.id}` 
        }, (payload) => {
          if (payload.new.location) {
             setDriverLocation(parsePoint(payload.new.location));
          }
        })
        .subscribe();
      return () => { locationSub.unsubscribe(); };
    }
  }, [driver?.id]);

  const handleCancel = async () => {
    if (!ride) return;
    setCancelling(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      if (ride.status === 'requested') {
        const { error } = await supabase.rpc('cancel_ride_before_accept', { 
          p_ride_id: ride.id,
          p_idempotency_key: idempotencyKey
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('process_rider_cancellation', { 
          p_ride_id: ride.id,
          p_idempotency_key: idempotencyKey
        });
        if (error) throw error;
      }
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (!id || rating === 0) return;
    await supabase
      .from('rides')
      .update({ rider_rating: rating })
      .eq('id', id);
    navigate('/');
  };

  if (!ride) return <div className="h-screen flex items-center justify-center p-6 text-center">
    <div className="space-y-4">
      <Loader2 className="animate-spin mx-auto text-gray-300" size={48} />
      <p className="text-gray-500 font-medium tracking-tight">Finding your ride...</p>
    </div>
  </div>;

  return (
    <div className="h-screen flex flex-col pt-4">
      <div className="flex-grow relative">
        <MapContainer 
          center={[22.5726, 88.3639]} // Initial fallback
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
        >
          <ChangeView center={toLatLngTuple(driverLocation)} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* PostGIS geometry needs parsing. Assuming standard lat/lng for visualization here */}
          {driverLocation && parsePoint(driverLocation) && (
            <Marker 
              position={toLatLngTuple(driverLocation)} 
              icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [32, 32] })} 
            />
          )}

          {ride && (
            <>
              {parsePoint(ride.pickup_geometry) && <Marker position={toLatLngTuple(ride.pickup_geometry)} />}
              {parsePoint(ride.dropoff_geometry) && <Marker position={toLatLngTuple(ride.dropoff_geometry)} />}
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

        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-4 left-4 p-3 bg-white rounded-full shadow-lg z-[1000] hover:bg-gray-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Status Card */}
      <AnimatePresence>
        {!showRating && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white p-6 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-20"
          >
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h2 className="text-xl font-black capitalize">{ride.status.replace('_', ' ')}</h2>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {ride.status === 'requested' ? 'Finding a matching driver' : 'Arriving in 4 mins'}
                  </p>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-black">{formatCurrency(ride.fare)}</p>
                  <div className="flex items-center justify-end text-[10px] text-black font-bold uppercase tracking-widest mt-1">
                    <ShieldCheck size={12} className="mr-1" />
                    <span>Insured Trip</span>
                  </div>
               </div>
            </div>

            {driver ? (
              <div className="bg-gray-50 p-5 rounded-3xl mb-6">
                 <div className="flex items-center space-x-4 mb-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-2xl overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} alt="Driver" />
                    </div>
                    <div className="flex-grow">
                       <p className="font-black text-lg">{driver.full_name}</p>
                       <div className="flex items-center space-x-2">
                          <p className="text-sm font-bold text-gray-500">{driver.driver_profile.vehicle_details.number}</p>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center text-black font-bold text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                            <Star size={12} className="fill-current mr-1" />
                            <span>4.8</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex space-x-2">
                       <a href={`tel:${driver.phone}`} className="p-3 bg-white border border-gray-100 rounded-xl text-black hover:bg-gray-100 transition-all shadow-sm">
                          <Phone size={20} />
                       </a>
                    </div>
                 </div>
                 <div className="flex items-center space-x-2 text-xs text-black border border-black p-3 rounded-2xl font-bold">
                    <Navigation size={14} className="fill-current" />
                    <span>{driver.driver_profile.vehicle_details.color} {driver.driver_profile.vehicle_details.model} is on the way</span>
                 </div>
              </div>
            ) : (
                <div className="flex items-center justify-center space-x-3 bg-gray-50 p-8 rounded-3xl mb-6 border-2 border-dashed border-gray-200 animate-pulse">
                   <Loader2 className="animate-spin text-gray-300" />
                   <p className="text-gray-400 font-bold text-sm tracking-tight">Matchmaking in progress...</p>
                </div>
            )}

            <div className="flex space-x-3">
               <button 
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-grow py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
               >
                 {cancelling ? 'Updating...' : 'Cancel Ride'}
               </button>
               <button className="p-4 bg-gray-100 text-black rounded-2xl border border-gray-200">
                  <AlertCircle size={20} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Screen */}
      <AnimatePresence>
        {showRating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto flex items-center justify-center mb-6">
                <ShieldCheck size={40} className="text-black" />
              </div>
              <h3 className="text-2xl font-black mb-2">You've Arrived!</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">Hope you had a comfortable trip. How was your experience with {driver?.full_name}?</p>
              
              <div className="flex justify-center space-x-2 mb-10">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    onClick={() => setRating(star)}
                    className={cn(
                      "p-1 transition-all transform active:scale-110",
                      rating >= star ? "text-black scale-110" : "text-gray-200"
                    )}
                  >
                    <Star size={40} fill={rating >= star ? "currentColor" : "none"} strokeWidth={rating >= star ? 0 : 2} />
                  </button>
                ))}
              </div>

              <button 
                onClick={submitRating}
                disabled={rating === 0}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold tracking-wide active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Submit Rating
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
