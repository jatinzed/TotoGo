import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { Ride, DriverProfile } from '../../common/types';
import { formatCurrency, cn } from '../../../utils/format';
import { useRouting, RouteData } from '../../../lib/maps/routing';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { ChangeView } from '../../../components/common/ChangeView';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Power, MapPin, Navigation, CheckCircle2, ChevronRight, Loader2, ArrowRight, RefreshCw, Share2, Award, X, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DriverNavigation from './DriverNavigation';
import { getDistanceFromLatLonInMeters } from '../../../utils/distance';
import { sendPushNotification } from '../../../lib/notifications/onesignal';

// Audio and Vibration Helper
const playRideAlert = () => {
  try {
    const audio = new Audio('/sounds/ride_request.mp3');
    audio.play().catch(e => console.warn('Autoplay blocked:', e));
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (err) {
    console.error('Alert failed:', err);
  }
};

const RideRequestCard = ({ 
  request, 
  onAccept, 
  onTimeout 
}: { 
  request: any, 
  onAccept: (id: string) => void, 
  onTimeout: (id: string, isAssigned: boolean) => void 
}) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    // Play alert when a new request shows up
    playRideAlert();
    
    // Web Notification
    if (Notification.permission === 'granted') {
      new Notification('New Ride Request', {
        body: `Pickup: ${request.pickup_address} - ${formatCurrency(request.fare)}`,
        icon: '/favicon.ico'
      });
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout(request.ride_id || request.id, !!request.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [request.ride_id || request.id, onTimeout]);

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white p-6 rounded-[32px] shadow-2xl border border-gray-100"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <div className="bg-black text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit mb-1">
            {request.status === 'accepted' ? 'Incoming Assignment' : 'New Ride Found'}
          </div>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
            Accept in {timeLeft}s
          </p>
        </div>
        <p className="text-xl font-black">{formatCurrency(request.fare)}</p>
      </div>
      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-1.5 bg-black rounded-full" />
          <p className="text-sm font-bold truncate">{request.pickup_address}</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
          <p className="text-sm font-bold text-gray-400 truncate">{request.dropoff_address}</p>
        </div>
      </div>
      <button 
        onClick={() => onAccept(request.ride_id || request.id)}
        className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
      >
        <CheckCircle2 size={18} />
        <span>Accept Ride</span>
      </button>
    </motion.div>
  );
};

export default function DriverHome() {
  const { profile, refreshBalance } = useAuthStore();
  const navigate = useNavigate();
  const { getRoute } = useRouting();

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPromoter, setShowPromoter] = useState(false);
  const [formallyAccepted, setFormallyAccepted] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  
  const referralCode = profile?.referral_code || '';
  
  const locationInterval = useRef<number | null>(null);
  const pollingInterval = useRef<number | null>(null);

  useEffect(() => {
    if (profile) {
      fetchDriverStatus();
      subscribeToRideAssignments();
      checkNotificationPermission();
    }
    return () => {
      stopWatchingLocation();
      stopPollingRequests();
    };
  }, [profile]);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      
      // Interaction fallback for audio
      const audio = new Audio('/sounds/ride_request.mp3');
      audio.volume = 0;
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    // Re-start location watching with new frequency when ride status changes
    if (online) {
      startWatchingLocation();
    }
  }, [currentRide?.status, online]);

  useEffect(() => {
    if (online && !currentRide) {
      startPollingRequests();
    } else {
      stopPollingRequests();
    }
  }, [online, !!currentRide]);

  const fetchDriverStatus = async () => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('id', profile!.id)
      .single();
    
    if (data) {
      setDriverProfile(data);
      setOnline(data.online_status);
    }
    setLoading(false);
  };

  const subscribeToRideAssignments = () => {
    const channelName = `driver-rides-${profile!.id}-${Date.now()}`;
    const assignedSub = supabase
      .channel(channelName)
      .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'rides', 
         filter: `driver_id=eq.${profile!.id}` 
      }, (payload) => {
        const newRide = payload.new as Ride;
        if (['accepted', 'arrived', 'started'].includes(newRide.status)) {
           setCurrentRide(newRide);
           if (newRide.status !== 'accepted') {
             setFormallyAccepted(true);
           }
        } else if (['completed', 'cancelled_by_rider', 'cancelled_by_driver'].includes(newRide.status)) {
           setCurrentRide(null);
           setFormallyAccepted(false);
        }
      })
      .subscribe();

    return () => {
      assignedSub.unsubscribe();
    }
  };

  const startWatchingLocation = () => {
    stopWatchingLocation();
    
    const isActive = currentRide && ['accepted', 'arrived', 'started'].includes(currentRide.status);
    const frequency = isActive ? 2000 : 10000;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { longitude, latitude } = pos.coords;
          const { data } = await supabase
            .from('driver_profiles')
            .update({ 
               location: `POINT(${longitude} ${latitude})`,
               last_location_update: new Date().toISOString()
            })
            .eq('id', profile!.id)
            .select()
            .single();
          
          if (data) setDriverProfile(data);
        },
        (err) => console.error(err),
        { enableHighAccuracy: isActive }
      );
    };

    updateLocation();
    locationInterval.current = window.setInterval(updateLocation, frequency);
  };

  const stopWatchingLocation = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  };

  const startPollingRequests = () => {
    stopPollingRequests();
    
    const poll = async (manual = false) => {
      if (!driverProfile?.location) return;
      const coords = parsePoint(driverProfile.location);
      if (!coords) return;

      if (manual) setIsRefreshing(true);
      const { data, error } = await supabase.rpc('find_nearby_requests', {
        p_driver_lng: coords.lng,
        p_driver_lat: coords.lat,
        p_radius_meters: 3000
      });

      if (!error && data) {
        setNearbyRequests(data);
      }
      if (manual) setIsRefreshing(false);
    };

    poll();
    pollingInterval.current = window.setInterval(() => poll(false), 10000);
    return poll;
  };

  const manualRefresh = async () => {
    if (!driverProfile?.location) return;
    const coords = parsePoint(driverProfile.location);
    if (!coords) return;

    setIsRefreshing(true);
    const { data, error } = await supabase.rpc('find_nearby_requests', {
      p_driver_lng: coords.lng,
      p_driver_lat: coords.lat,
      p_radius_meters: 3000
    });

    if (!error && data) setNearbyRequests(data);
    setIsRefreshing(false);
  };

  const stopPollingRequests = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setNearbyRequests([]);
  };

  const toggleOnline = async () => {
    const newStatus = !online;
    setOnline(newStatus);
    
    await supabase
      .from('driver_profiles')
      .update({ online_status: newStatus })
      .eq('id', profile!.id);

    if (newStatus) {
      startWatchingLocation();
    } else {
      stopWatchingLocation();
      stopPollingRequests();
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    // Issue #38: Check if driver is already busy
    if (currentRide && !['completed', 'cancelled', 'cancelled_by_rider', 'cancelled_by_driver'].includes(currentRide.status)) {
      alert("You already have an active ride. Complete it first.");
      return;
    }

    if (currentRide?.id === rideId && currentRide?.status === 'accepted') {
      setFormallyAccepted(true);
      return;
    }

    // Issue #1: Use dispatch_nearest_driver instead of manual update
    const { data: ride, error } = await supabase.rpc('dispatch_nearest_driver', {
      p_ride_id: rideId
    });

    if (error) {
      alert(error.message);
    } else if (!ride) {
      alert('Failed to accept ride. It might have been taken by another driver.');
    } else {
      setCurrentRide(ride);
      setFormallyAccepted(true);
      // Send push notification via placeholder Edge Function
      sendPushNotification(profile!.id, 'Trip Accepted', 'You have a new passenger to pick up!');
    }
  };

  const handleRideTimeout = async (rideId: string, isAssigned: boolean) => {
    if (isAssigned) {
      setCurrentRide(null);
      setFormallyAccepted(false);
      await supabase.rpc('release_driver_and_redispatch', { 
        p_ride_id: rideId,
        p_driver_id: profile!.id
      });
      alert('Ride request timed out');
    } else {
      setNearbyRequests(prev => prev.filter(r => r.ride_id !== rideId));
      alert('Ride request timed out');
    }
  };

  const handleAction = async (newStatus: 'arrived' | 'started' | 'completed') => {
    if (!currentRide || !driverProfile) return;
    
    if (newStatus === 'arrived') {
       const driverCoords = parsePoint(driverProfile.location);
       const pickupCoords = parsePoint(currentRide.pickup_geometry);
       
       if (driverCoords && pickupCoords) {
         const distance = getDistanceFromLatLonInMeters(
           driverCoords.lat, driverCoords.lng,
           pickupCoords.lat, pickupCoords.lng
         );
         
         if (distance > 50) {
           alert("You are too far from the pickup point. Please move closer and try again.");
           return;
         }
       }
    }

    const update: any = { status: newStatus };
    if (newStatus === 'started') update.started_at = new Date().toISOString();
    if (newStatus === 'completed') update.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('rides')
      .update(update)
      .eq('id', currentRide.id)
      .select()
      .single();
    
    if (data) {
      setCurrentRide(newStatus === 'completed' ? null : data);
      
      // Issue #6: Handle payments on completion
      if (newStatus === 'completed') {
        try {
          // Debit rider (total fare)
          await supabase.rpc('debit_wallet', { 
            p_user_id: currentRide.rider_id, 
            p_amount: currentRide.fare, 
            p_type: 'ride_payment', 
            p_idempotency_key: crypto.randomUUID(), 
            p_metadata: { ride_id: currentRide.id } 
          });

          // Credit driver (80% earning)
          await supabase.rpc('credit_wallet', { 
            p_user_id: profile!.id, 
            p_amount: Math.floor(currentRide.fare * 0.8), 
            p_type: 'ride_earning', 
            p_idempotency_key: crypto.randomUUID(), 
            p_metadata: { ride_id: currentRide.id } 
          });

          await refreshBalance();
        } catch (err) {
          console.error('Payment processing failed:', err);
        }
      }
    }
    if (error) alert(error.message);
  };

  const handleDecline = async () => {
    if (!currentRide) return;
    const rideId = currentRide.id;
    setCurrentRide(null);
    setFormallyAccepted(false);
    
    await supabase.rpc('release_driver_and_redispatch', { 
      p_ride_id: rideId,
      p_driver_id: profile!.id
    });
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

  if (currentRide && driverProfile && formallyAccepted) {
    return (
      <DriverNavigation 
        ride={currentRide} 
        driverProfile={driverProfile} 
        onTripEnd={() => {
          setCurrentRide(null);
          setFormallyAccepted(false);
        }} 
      />
    );
  }

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
          <ChangeView 
            center={toLatLngTuple(driverProfile?.location)} 
          />
          <TileLayer
            {...({
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            } as any)}
          />

          {driverProfile?.location && parsePoint(driverProfile.location) && (
            <Marker 
              {...({
                position: toLatLngTuple(driverProfile.location),
                icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [32, 32] })
              } as any)} 
            />
          )}

          {currentRide && (
            <>
              {parsePoint(currentRide.pickup_geometry) && <Marker {...({position: toLatLngTuple(currentRide.pickup_geometry)} as any)} />}
              {parsePoint(currentRide.dropoff_geometry) && <Marker {...({position: toLatLngTuple(currentRide.dropoff_geometry)} as any)} />}
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

        {online && !currentRide && (
           <div className="absolute top-4 left-0 right-0 px-6 z-[1000]">
              <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center justify-between">
                 <div>
                    <p className="font-black text-xl">{online ? 'You are Online' : 'You are Offline'}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         {online ? 'Listening for rides' : 'Go online to receive jobs'}
                       </p>
                       <span className="text-[10px] text-gray-300">|</span>
                       <button 
                         onClick={() => navigate('/')}
                         className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                       >
                         Rider Mode
                       </button>
                    </div>
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

              {notifPermission !== 'granted' && (
                <button 
                  onClick={requestNotificationPermission}
                  className="mt-4 w-full bg-yellow-50 border border-yellow-100 p-4 rounded-3xl shadow-lg flex items-center justify-between hover:bg-yellow-100 transition-all active:scale-95"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
                      <Bell size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-yellow-900">Enable Ride Alerts</p>
                      <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-widest">Get sound & push alerts</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-yellow-400" />
                </button>
              )}

              <button 
                onClick={() => setShowPromoter(true)}
                className="mt-4 w-full bg-white/90 backdrop-blur-sm border border-gray-100 p-4 rounded-3xl shadow-lg flex items-center justify-between hover:bg-white transition-all active:scale-95"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm">Promoter Program</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Earn ₹5 per 5 rider trips</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
           </div>
        )}
      </div>

      <AnimatePresence>
        {online && !formallyAccepted && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-6 left-0 right-0 px-6 space-y-4 z-20 max-h-[60%] overflow-y-auto"
          >
            {/* Show Assigned Ride First if not accepted yet */}
            {currentRide && currentRide.status === 'requested' && !formallyAccepted && (
              <div className="space-y-3">
                <RideRequestCard 
                  request={currentRide}
                  onAccept={handleAcceptRide}
                  onTimeout={handleRideTimeout}
                />
                <button 
                  onClick={handleDecline}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all"
                >
                  <X size={18} />
                  <span>Decline Ride</span>
                </button>
              </div>
            )}

            {/* Nearby Broadcase Requests */}
            {!currentRide && (
              <>
                <div className="flex justify-between items-end px-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                     {nearbyRequests.length} Nearby Requests Found
                   </p>
                   <button 
                    onClick={manualRefresh}
                    disabled={isRefreshing}
                    className="p-2 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                   >
                     <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                     <span>Refresh</span>
                   </button>
                </div>
                {nearbyRequests.map(request => (
                  <RideRequestCard 
                    key={request.ride_id}
                    request={request}
                    onAccept={handleAcceptRide}
                    onTimeout={handleRideTimeout}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promoter Modal */}
      <AnimatePresence>
        {showPromoter && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[42px] p-8 text-center"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="text-left">
                  <h3 className="text-2xl font-black">Driver Promoter</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share & Earn Rewards</p>
                </div>
                <button 
                  onClick={() => setShowPromoter(false)}
                  className="p-3 bg-gray-50 rounded-2xl text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gray-50 p-6 rounded-[32px] mb-8 border border-gray-100 flex justify-center">
                <QRCodeSVG 
                  value={`https://totogo.app/signup?ref=${referralCode}`}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-black text-white rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Your Referral Code</p>
                    <p className="font-mono text-lg tracking-widest">{referralCode}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      alert('Code copied!');
                    }}
                    className="p-2 bg-white/10 rounded-xl"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Commission Policy</p>
                  <ul className="text-xs font-bold text-blue-900 space-y-1">
                    <li>• Reward: ₹5 per 5 rider trips</li>
                    <li>• Bonus: 20 GoCoins added per payout</li>
                    <li>• Rider Bonus: 10 GoCoins on signup</li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => {
                  const text = `Join me on TotoGo! Sign up using my driver code ${referralCode} and get 10 GoCoins immediately. https://totogo.app/signup?ref=${referralCode}`;
                  navigator.clipboard.writeText(text);
                  alert('Invite link copied to clipboard!');
                }}
                className="mt-8 w-full py-5 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-xl shadow-black/10"
              >
                <Share2 size={18} />
                <span>Share Invite Link</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
