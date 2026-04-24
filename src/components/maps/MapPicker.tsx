import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { X, MapPin, Navigation2, Check, ArrowRight, Loader2, Route as RouteIcon, Search, History, Coins, Home, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useRouting, RouteData } from '../../lib/maps/routing';
import { supabase } from '../../lib/supabase/client';
import { useAuthStore } from '../../features/common/stores/authStore';
import { useRideStore } from '../../features/common/stores/rideStore';
import { useNavigate } from 'react-router-dom';
import { AutoRickshawIcon } from '../common/AutoRickshawIcon';
import { ChangeView } from '../common/ChangeView';
import { parsePoint, toLatLngTuple } from '../../utils/geo';
import { cn } from '../../utils/format';

interface MapPickerProps {
  onClose: () => void;
  initialPickup?: { lat: number, lng: number, address: string } | null;
  initialDropoff?: { lat: number, lng: number, address: string } | null;
}

function MapEvents({ onMove }: { onMove: (pos: { lat: number, lng: number }) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onMove({ lat: center.lat, lng: center.lng });
    }
  });
  return null;
}

export default function MapPicker({ onClose, initialPickup, initialDropoff }: MapPickerProps) {
  const { location: userLocation } = useGeolocation();
  const { profile } = useAuthStore();
  const { dispatchRide, error: rideError } = useRideStore();
  const navigate = useNavigate();
  const { getRoute, loading: routingLoading } = useRouting();
  
  const [step, setStep] = useState<'pickup' | 'dropoff' | 'confirm'>(
    initialDropoff ? 'confirm' : (initialPickup ? 'dropoff' : 'pickup')
  );
  const [pickup, setPickup] = useState<{ lat: number, lng: number, address: string } | null>(initialPickup || null);
  const [dropoff, setDropoff] = useState<{ lat: number, lng: number, address: string } | null>(initialDropoff || null);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number, lng: number } | null>(
    initialDropoff || initialPickup || null
  );
  const [booking, setBooking] = useState(false);
  const [fare, setFare] = useState(0);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<RouteData[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [goCoinsBalance, setGoCoinsBalance] = useState<number>(0);
  const [useGoCoins, setUseGoCoins] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const lastClickRef = React.useRef<number>(0);

  const coinsToUse = useGoCoins ? Math.min(goCoinsBalance, fare) : 0;
  const finalFare = fare - coinsToUse;

  useEffect(() => {
    const fetchMaintenance = async () => {
      const { data } = await supabase.from('system_settings').select('maintenance_mode').single();
      if (data) setMaintenanceMode(data.maintenance_mode);
    };
    fetchMaintenance();
  }, []);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (userLocation && !pickup && !initialPickup) {
       setCurrentCenter(userLocation);
       setPickup({ ...userLocation, address: 'Current Location' });
    }
  }, [userLocation, initialPickup]);

  useEffect(() => {
    const handleInitialRoute = async () => {
      if (initialPickup && initialDropoff) {
        const routeData = await getRoute(initialPickup, initialDropoff);
        if (routeData && routeData.routes) {
          setAvailableRoutes(routeData.routes);
          setRoute(routeData.primary);
          calculateFare(routeData.primary.distance);
        }
      } else if (initialDropoff && pickup) {
         const routeData = await getRoute(pickup, initialDropoff);
         if (routeData && routeData.routes) {
          setAvailableRoutes(routeData.routes);
          setRoute(routeData.primary);
          calculateFare(routeData.primary.distance);
        }
      }
    };
    handleInitialRoute();
  }, [initialPickup, initialDropoff]);

  useEffect(() => {
    if (profile) {
      const fetchGoCoins = async () => {
        const { data } = await supabase
          .from('user_gocoins')
          .select('balance')
          .eq('user_id', profile.id)
          .single();
        if (data) setGoCoinsBalance(data.balance);
      };
      fetchGoCoins();
    }
  }, [profile]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = (result: any) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setCurrentCenter(coords);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const handleConfirmLocation = async () => {
    if (!currentCenter) return;
    
    // Reverse Geocoding via our Proxy
    let address = `Point at ${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}`;
    try {
      const res = await fetch(`/api/geo/reverse?lat=${currentCenter.lat}&lon=${currentCenter.lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) address = data.display_name;
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }

    if (step === 'pickup') {
      setPickup({ ...currentCenter, address });
      setStep('dropoff');
      setSearchQuery(''); // Reset search
      setSearchResults([]);
    } else if (step === 'dropoff') {
      setDropoff({ ...currentCenter, address });
      const routeData = await getRoute(pickup!, currentCenter);
      if (routeData && routeData.routes) {
        setAvailableRoutes(routeData.routes);
        setRoute(routeData.primary);
        calculateFare(routeData.primary.distance);
      } else {
        setAvailableRoutes([]);
        calculateFareFallback(pickup!, currentCenter);
      }
      setStep('confirm');
    }
  };

  const handleSelectSavedPlace = async (type: 'home' | 'office') => {
    // For now, use hardcoded coordinates if not found in profile
    // Ideally, these would come from the profile's saved_addresses
    const savedPlaces = {
      home: { lat: 22.5800, lng: 88.3700, address: 'Home (123 Green Valley, Downtown)' },
      office: { lat: 22.5650, lng: 88.3650, address: 'Office (Hub 7, Tech Park)' }
    };
    
    const place = savedPlaces[type];
    setCurrentCenter({ lat: place.lat, lng: place.lng });
    
    // Auto confirm after a short delay
    setTimeout(() => {
      if (step === 'pickup') {
        setPickup({ lat: place.lat, lng: place.lng, address: place.address });
        setStep('dropoff');
      } else if (step === 'dropoff') {
        setDropoff({ lat: place.lat, lng: place.lng, address: place.address });
        handleConfirmLocation();
      }
      setIsSearchFocused(false);
    }, 500);
  };

  const calculateFare = (distanceInMeters: number) => {
     // Fare: ₹5 for first 500m, ₹0.5 per 100m after
     const base = 5;
     const baseDistance = 500;
     if (distanceInMeters <= baseDistance) {
       setFare(base);
     } else {
       const extraDistance = distanceInMeters - baseDistance;
       const extraPrice = Math.ceil(extraDistance / 100) * 0.5;
       setFare(Math.round(base + extraPrice));
     }
  };

  const calculateFareFallback = (p: any, d: any) => {
     const distMeters = Math.sqrt(Math.pow(p.lat - d.lat, 2) + Math.pow(p.lng - d.lng, 2)) * 111000;
     calculateFare(distMeters);
  };

  const handleBookRide = async () => {
    if (maintenanceMode) {
      alert('System is under maintenance. New bookings are temporarily disabled.');
      return;
    }
    if (!pickup || !dropoff || !profile) return;
    
    // Issue #27: Rate limiting / Debounce (3 seconds)
    const now = Date.now();
    if (now - lastClickRef.current < 3000) return;
    lastClickRef.current = now;

    // 27: prevent multiple concurrent requests
    if (booking) return;

    setBooking(true);
    try {
      const startOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // 1. Deduct GoCoins if used
      if (coinsToUse > 0) {
        const { error: coinError } = await supabase.rpc('adjust_gocoins', {
          p_user_id: profile.id,
          p_amount: -coinsToUse,
          p_reason: 'Ride discount applied'
        });
        if (coinError) throw new Error('Failed to apply GoCoins: ' + coinError.message);
      }

      // 2. Create Ride Record
      const { data: ride, error: createError } = await supabase
        .from('rides')
        .insert({
          rider_id: profile.id,
          status: 'requested',
          pickup_address: pickup.address,
          dropoff_address: dropoff.address,
          pickup_geometry: `POINT(${pickup.lng} ${pickup.lat})`,
          dropoff_geometry: `POINT(${dropoff.lng} ${dropoff.lat})`,
          fare: finalFare,
          payment_method: paymentMethod, 
          payment_status: 'pending',
          start_otp: startOtp
        })
        .select()
        .single();

      if (createError) throw createError;

      // 3. Cascade Dispatch via Edge Function (Asynchronous)
      supabase.functions.invoke('cascade-dispatch', {
        body: { ride_id: ride.id }
      }).catch(err => console.error('Cascade dispatch trigger failed:', err));

      navigate(`/ride/${ride.id}`);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to find a driver. Try again?');
    } finally {
      setBooking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white relative z-[100]">
        <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full">
          <X size={24} />
        </button>
        <div className="flex-grow text-center">
            <h2 className="font-bold text-lg">
              {step === 'pickup' && 'Select Pickup'}
              {step === 'dropoff' && 'Select Dropoff'}
              {step === 'confirm' && 'Request Your Ride'}
            </h2>
        </div>
        <div className="w-10" />
      </div>

      {/* Search Bar - only visible when not confirmed */}
      {step !== 'confirm' && (
        <div className="px-4 py-2 relative z-[110] bg-white border-b border-gray-100 shadow-sm">
           <div className={cn(
             "flex items-center space-x-3 bg-gray-100 p-3 rounded-2xl transition-all border-2",
             isSearchFocused ? "border-black bg-white" : "border-transparent"
           )}>
              <Search size={18} className="text-gray-400 shrink-0" />
              <input 
                type="text"
                placeholder={step === 'pickup' ? "Search for pickup..." : "Search destination..."}
                className="w-full bg-transparent focus:outline-none text-sm font-bold"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {isSearching && <Loader2 size={16} className="animate-spin text-gray-400" />}
           </div>

            <AnimatePresence>
              {(isSearchFocused) && (
                <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="absolute top-full left-0 right-0 mx-4 mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[120]"
                >
                  {/* Saved Places Quick Actions */}
                  {searchQuery.length < 3 && (
                    <div className="p-4 border-b border-gray-50 flex space-x-2">
                      <button 
                        onClick={() => handleSelectSavedPlace('home')}
                        className="flex-1 p-3 bg-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-gray-100 transition-colors"
                      >
                        <Home size={18} className="text-black" />
                        <span className="text-[10px] font-bold">Home</span>
                      </button>
                      <button 
                        onClick={() => handleSelectSavedPlace('office')}
                        className="flex-1 p-3 bg-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-gray-100 transition-colors"
                      >
                        <Briefcase size={18} className="text-black" />
                        <span className="text-[10px] font-bold">Office</span>
                      </button>
                    </div>
                  )}

                  {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching ? (
                    <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest leading-loose">
                       No locations found. <br/> Try picking on the map.
                    </div>
                  ) : searchQuery.length >= 3 ? (
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 text-black">
                       {searchResults.map((result, idx) => (
                         <button 
                           key={idx}
                           onClick={() => handleSelectResult(result)}
                           className="w-full p-4 flex items-start space-x-4 hover:bg-gray-50 transition-colors text-left"
                         >
                           <div className="p-2 bg-gray-100 rounded-xl mt-0.5 shrink-0">
                             <MapPin size={16} className="text-black" />
                           </div>
                           <div className="flex-grow min-w-0">
                              <p className="font-bold text-sm truncate">{result.display_name.split(',')[0]}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                                {result.display_name.split(',').slice(1).join(',')}
                              </p>
                           </div>
                         </button>
                       ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                       Search coordinates or choose on map
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      )}

      {/* Map Content */}
      <div className="flex-grow relative bg-gray-100 overflow-hidden">
        {isSearchFocused && (
          <div className="absolute inset-0 bg-black/10 z-[65] pointer-events-auto transition-opacity" onClick={() => setIsSearchFocused(false)} />
        )}
        
        <MapContainer 
          {...({
            center: [22.5726, 88.3639],
            zoom: 15,
            zoomControl: false,
            className: "w-full h-full"
          } as any)}
        >
          <TileLayer
            {...({
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              maxZoom: 19
            } as any)}
          />
          <ChangeView center={toLatLngTuple(currentCenter)} />
          {step !== 'confirm' && <MapEvents onMove={setCurrentCenter} />}
          
          {/* Static Point Marker on map center (simulates picker) */}
          {step !== 'confirm' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
               <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-12"
               >
                  <div className="relative group">
                     {/* Modern Pin Body */}
                     <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-2xl relative z-10 transition-transform active:scale-95">
                        <MapPin size={20} className="text-white fill-current" />
                     </div>
                     {/* Modern Pin Pointer */}
                     <div className="w-4 h-4 bg-black rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white/20 z-0 shadow-lg" />
                  </div>
                  
                  {/* Glowing Shadow */}
                  <div className="w-4 h-1.5 bg-black/20 rounded-full absolute -bottom-4 left-1/2 -translate-x-1/2 blur-[2px] transition-all" />
               </motion.div>
            </div>
          )}

          {/* Actual Markers after selection */}
          {pickup && <Marker {...({position: [pickup.lat, pickup.lng], icon: L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] })})} />}
          {dropoff && <Marker {...({position: [dropoff.lat, dropoff.lng], icon: L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] })})} />}
          
          {route && (
            <Polyline 
              {...({
                positions: route.geometry.coordinates.map(c => [c[1], c[0]]),
                color: "#000000",
                weight: 6,
                opacity: 0.8
              } as any)} 
            />
          )}

          {availableRoutes.map((r, i) => (
            r !== route && (
              <Polyline 
                key={i}
                {...({
                  positions: r.geometry.coordinates.map(c => [c[1], c[0]]),
                  color: "#9ca3af",
                  weight: 4,
                  opacity: 0.4
                } as any)} 
                eventHandlers={{
                  click: () => {
                    setRoute(r);
                    calculateFare(r.distance);
                  }
                }}
              />
            )
          ))}
        </MapContainer>

        {/* Locate Me Button */}
        {step !== 'confirm' && (
          <button 
            onClick={() => userLocation && setCurrentCenter(userLocation)}
            className="absolute bottom-24 right-4 p-4 bg-white rounded-full shadow-lg z-[1000] text-black hover:bg-gray-50 active:scale-95 transition-all outline-none"
          >
            <Navigation2 size={20} className="fill-current" />
          </button>
        )}
      </div>

      {/* Action Footer */}
      <div className={cn(
        "bg-white border-t border-gray-100 rounded-t-[32px] -mt-1 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] transition-all duration-300",
        step === 'confirm' ? "h-[65%] min-h-[400px]" : "p-6 pb-12"
      )}>
        {step === 'confirm' ? (
          <div className="h-full flex flex-col p-6 overflow-y-auto scrollbar-hide">
             <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 text-sm">
                   <div className="w-2 h-2 bg-black rounded-full" />
                   <p className="text-gray-500 flex-grow font-medium truncate">{pickup?.address}</p>
                </div>
                <div className="ml-1 w-px h-3 bg-gray-100" />
                <div className="flex items-center space-x-3 text-sm">
                   <div className="w-2 h-2 bg-white border border-black rounded-full" />
                   <p className="text-gray-500 flex-grow font-medium truncate">{dropoff?.address}</p>
                </div>
             </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {availableRoutes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRoute(r);
                      calculateFare(r.distance);
                    }}
                    className={cn(
                      "flex-shrink-0 p-3 rounded-2xl border-2 transition-all text-left min-w-[130px]",
                      route === r ? "border-black bg-black text-white" : "border-gray-100 bg-gray-50 text-black"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Route {i + 1}</span>
                      {route === r && <Check size={12} />}
                    </div>
                    <p className="font-black text-sm">₹{Math.round(5 + (r.distance > 500 ? Math.ceil((r.distance - 500) / 100) * 0.5 : 0))}</p>
                    <p className="text-[10px] opacity-60 font-medium">{(r.distance / 1000).toFixed(1)} km • {Math.round(r.duration / 60)} min</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-black text-white rounded-lg">
                      <AutoRickshawIcon className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Toto Standard</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fast & Secure</p>
                    </div>
                 </div>
                 <div className="text-right">
                    {useGoCoins && coinsToUse > 0 && (
                      <p className="text-[10px] text-red-500 font-bold line-through">₹{fare}</p>
                    )}
                    <p className="text-xl font-black">₹{useGoCoins ? fare - coinsToUse : fare}</p>
                 </div>
              </div>

              {/* GoCoin Option */}
              {goCoinsBalance > 0 && (
                <button 
                  onClick={() => setUseGoCoins(!useGoCoins)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                    useGoCoins ? "border-black bg-black text-white" : "border-gray-100 bg-gray-50 text-gray-400"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Coins size={18} className={cn(useGoCoins ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                    <div className="text-left">
                      <p className={cn("text-xs font-black uppercase tracking-widest", useGoCoins ? "text-white" : "text-black")}>
                        Apply {Math.min(goCoinsBalance, fare)} GoCoins
                      </p>
                      <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">
                        1 GoCoin = ₹1 Discount
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    useGoCoins ? "border-white bg-white" : "border-gray-200"
                  )}>
                    {useGoCoins && <Check size={12} className="text-black" />}
                  </div>
                </button>
              )}

              {/* Issue #26: Payment Method Toggle */}
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                 <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    "flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    paymentMethod === 'cash' ? "bg-white text-black shadow-sm" : "text-gray-400"
                  )}
                 >
                   Pay Cash
                 </button>
                 <button 
                  onClick={() => setPaymentMethod('wallet')}
                  className={cn(
                    "flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    paymentMethod === 'wallet' ? "bg-white text-black shadow-sm" : "text-gray-400"
                  )}
                 >
                   Pay Wallet
                 </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={booking}
                onClick={handleBookRide}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {booking ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Finding nearest driver...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{rideError ? 'No drivers found - Retry' : 'Request Toto'}</span>
                  </div>
                )}
              </motion.button>
              {rideError && (
                <p className="text-red-500 text-[10px] text-center font-bold uppercase tracking-widest mt-2">{rideError}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group overflow-hidden">
               <div className="flex-grow">
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">
                   {step === 'pickup' ? 'Current Pickup' : 'Current Destination'}
                 </p>
                 <div className="font-black text-sm truncate flex items-center">
                   <div className="w-1.5 h-1.5 bg-black rounded-full mr-3 animate-pulse" />
                   {currentCenter ? `${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}` : 'Wait...'}
                 </div>
               </div>
               <div className="p-3 bg-white/50 rounded-xl group-hover:bg-white transition-all">
                 <History size={16} className="text-gray-300" />
               </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmLocation}
              className="w-full py-5 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl shadow-black/10 transition-all active:bg-gray-900"
            >
              <span>Confirm {step === 'pickup' ? 'Pickup' : 'Dropoff'}</span>
              <div className="p-1 bg-white/20 rounded-lg">
                <ArrowRight size={16} />
              </div>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
