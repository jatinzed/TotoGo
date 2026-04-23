import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MessageSquare, Star, Loader2, ShieldCheck, Navigation, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { Ride, DriverProfile, UserProfile, RideStatus } from '../../common/types';
import { formatCurrency, cn } from '../../../utils/format';
import { useRouting, RouteData } from '../../../lib/maps/routing';
import { useRideStore } from '../../common/stores/rideStore';
import { useAuthStore } from '../../common/stores/authStore';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { ChangeView } from '../../../components/common/ChangeView';

export default function RideTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRoute } = useRouting();
  const { currentRide: ride, fetchRide, subscribeToRide, cancelRide, isLoading } = useRideStore();
  
  const [driver, setDriver] = useState<UserProfile & { driver_profile: DriverProfile } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRide(id);
      const unsubscribe = subscribeToRide(id);
      return () => unsubscribe();
    }
  }, [id]);

  useEffect(() => {
    if (ride?.driver) {
       setDriver(ride.driver as any);
       if ((ride.driver as any).driver_profile?.location) {
         setDriverLocation(parsePoint((ride.driver as any).driver_profile.location));
       }
    }
    
    if (ride?.pickup_geometry && ride?.dropoff_geometry && !route) {
       const p = parsePoint(ride.pickup_geometry);
       const d = parsePoint(ride.dropoff_geometry);
       if (p && d) {
         getRoute(p, d).then(res => {
           if (res) setRoute(res.primary);
         });
       }
    }

    if (ride?.status === 'completed' && !ride?.rider_rating) {
      setShowRating(true);
    }
  }, [ride, route]);

  // Subscribe to driver location if assigned
  useEffect(() => {
    if (driver?.id) {
      const channelName = `driver-loc-${driver.id}-${Date.now()}`;
      const locationSub = supabase
        .channel(channelName)
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

  // Subscribe to driver location if assigned
  useEffect(() => {
    if (ride?.driver_id) {
      const channelName = `driver-location-${ride.driver_id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'driver_profiles',
            filter: `user_id=eq.${ride.driver_id}`
          },
          (payload) => {
            const loc = payload.new.location;
            if (loc) {
              setDriverLocation(parsePoint(loc));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ride?.driver_id]);

  const handleCancel = async () => {
    if (!ride) return;
    try {
      await cancelRide(ride.id, ride.status);
      useAuthStore.getState().refreshBalance();
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('Insufficient balance')) {
        setShowInsufficientModal(true);
      } else {
        alert(err.message || 'Cancellation failed');
      }
    }
  };

  const submitRating = async () => {
    if (!id || rating === 0 || !ride) return;
    
    try {
      // Update rating
      await supabase
        .from('rides')
        .update({ rider_rating: rating })
        .eq('id', id);

      // Issue #11: Referral System Rewards
      // Check if this was the rider's first ride
      const { count } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', ride.rider_id)
        .eq('status', 'completed');

      if (count === 1) { // This is the first completed ride (including this one)
        const referrerId = localStorage.getItem('pending_referral_referrer');
        if (referrerId) {
          // Update referral status
          await supabase
            .from('referrals')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('referrer_id', referrerId)
            .eq('referee_id', ride.rider_id);

          // Reward Referrer (10 GoCoin)
          const { error: r1 } = await supabase.rpc('adjust_gocoins', {
            p_user_id: referrerId,
            p_amount: 10,
            p_description: 'Referral Bonus (Referrer)',
            p_idempotency_key: crypto.randomUUID()
          });

          // Reward Referee (5 GoCoin)
          const { error: r2 } = await supabase.rpc('adjust_gocoins', {
            p_user_id: ride.rider_id,
            p_amount: 5,
            p_description: 'Referral Bonus (Welcome)',
            p_idempotency_key: crypto.randomUUID()
          });

          if (!r1 && !r2) {
             localStorage.removeItem('pending_referral_referrer');
          }
        }
      }
    } catch (err) {
      console.error('Referral reward failed:', err);
    }

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
          {...({
            center: [22.5726, 88.3639],
            zoom: 15,
            zoomControl: false,
            className: "w-full h-full"
          } as any)}
        >
          <ChangeView center={toLatLngTuple(driverLocation)} />
          <TileLayer
            {...({
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            } as any)}
          />
          {/* PostGIS geometry needs parsing. Assuming standard lat/lng for visualization here */}
          {driverLocation && parsePoint(driverLocation) && (
            <Marker 
              {...({
                position: toLatLngTuple(driverLocation),
                icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [32, 32] })
              } as any)} 
            />
          )}

          {ride && (
            <>
              {parsePoint(ride.pickup_geometry) && <Marker {...({position: toLatLngTuple(ride.pickup_geometry)} as any)} />}
              {parsePoint(ride.dropoff_geometry) && <Marker {...({position: toLatLngTuple(ride.dropoff_geometry)} as any)} />}
            </>
          )}

          {route && (
            <Polyline 
              {...({
                positions: route.geometry.coordinates.map(c => [c[1], c[0]]),
                color: "#000000",
                weight: 4,
                opacity: 0.6
              } as any)} 
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
                          <p className="text-sm font-bold text-gray-500">{driver.driver_profile.vehicle_number}</p>
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
                    <span>{driver.driver_profile.vehicle_color} {driver.driver_profile.vehicle_model} is on the way</span>
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
                disabled={isLoading}
                className="flex-grow py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
               >
                 {isLoading ? 'Updating...' : 'Cancel Ride'}
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
        {showInsufficientModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-red-100">
                <AlertCircle size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-2">Insufficient Balance</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                You don't have enough balance to pay the cancellation fee. Please add money to continue.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/wallet')}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all"
                >
                  Add Money
                </button>
                <button 
                  onClick={() => setShowInsufficientModal(false)}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
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
