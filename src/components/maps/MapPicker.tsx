import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { X, MapPin, Navigation2, Check, ArrowRight, Loader2, Car, Route as RouteIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useRouting, RouteData } from '../../lib/maps/routing';
import { supabase } from '../../lib/supabase/client';
import { useAuthStore } from '../../features/common/stores/authStore';
import { useRideStore } from '../../features/common/stores/rideStore';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { ChangeView } from '../common/ChangeView';
import { parsePoint, toLatLngTuple } from '../../utils/geo';

interface MapPickerProps {
  onClose: () => void;
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

export default function MapPicker({ onClose }: MapPickerProps) {
  const { location: userLocation } = useGeolocation();
  const { profile } = useAuthStore();
  const { dispatchRide, error: rideError } = useRideStore();
  const navigate = useNavigate();
  const { getRoute, loading: routingLoading } = useRouting();
  
  const [step, setStep] = useState<'pickup' | 'dropoff' | 'confirm'>('pickup');
  const [pickup, setPickup] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [booking, setBooking] = useState(false);
  const [fare, setFare] = useState(0);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const lastClickRef = React.useRef<number>(0);

  useEffect(() => {
    if (userLocation && !pickup) {
       setCurrentCenter(userLocation);
       setPickup({ ...userLocation, address: 'Current Location' });
    }
  }, [userLocation]);

  const handleConfirmLocation = async () => {
    if (!currentCenter) return;
    
    // In a real app, we would reverse geocode here. 
    // Mocking address for now.
    const address = `Point at ${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}`;

    if (step === 'pickup') {
      setPickup({ ...currentCenter, address });
      setStep('dropoff');
    } else if (step === 'dropoff') {
      setDropoff({ ...currentCenter, address });
      const routeData = await getRoute(pickup!, currentCenter);
      if (routeData) {
        setRoute(routeData.primary);
        calculateFare(routeData.primary.distance);
      } else {
        calculateFareFallback(pickup!, currentCenter);
      }
      setStep('confirm');
    }
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
    if (!pickup || !dropoff || !profile) return;
    
    // Issue #27: Rate limiting / Debounce (3 seconds)
    const now = Date.now();
    if (now - lastClickRef.current < 3000) return;
    lastClickRef.current = now;

    // Issue #27: prevent multiple concurrent requests
    if (booking) return;

    setBooking(true);
    try {
      // 1. Create Ride Record
      const { data: ride, error: createError } = await supabase
        .from('rides')
        .insert({
          rider_id: profile.id,
          status: 'requested',
          pickup_address: pickup.address,
          dropoff_address: dropoff.address,
          pickup_geometry: `POINT(${pickup.lng} ${pickup.lat})`,
          dropoff_geometry: `POINT(${dropoff.lng} ${dropoff.lat})`,
          fare: fare,
          payment_method: paymentMethod, // Issue #26: Use dynamic payment method
          payment_status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Dispatch Nearest Driver via RPC
      const { data: result, error: rpcError } = await supabase.rpc('dispatch_nearest_driver', { 
        p_ride_id: ride.id 
      });
      
      if (rpcError) {
        throw rpcError;
      }

      if (result) {
        navigate(`/ride/${ride.id}`);
        onClose();
      } else {
        throw new Error('No available drivers found in your area. Please try again.');
      }
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
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
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

      {/* Map Content */}
      <div className="flex-grow relative bg-gray-100">
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
               <div className="relative mb-8">
                  <MapPin size={40} className="text-black" />
                  <div className="w-2 h-2 bg-black/20 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 blur-[2px]" />
               </div>
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
                weight: 4,
                opacity: 0.6
              } as any)} 
            />
          )}
        </MapContainer>

        {/* Locate Me Button */}
        {step !== 'confirm' && (
          <button 
            onClick={() => userLocation && setCurrentCenter(userLocation)}
            className="absolute bottom-24 right-4 p-4 bg-white rounded-full shadow-lg z-[1000] text-black hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Navigation2 size={20} className="fill-current" />
          </button>
        )}
      </div>

      {/* Action Footer */}
      <div className={cn(
        "bg-white border-t border-gray-100 rounded-t-[32px] -mt-8 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]",
        step === 'confirm' ? "p-6" : "p-6 pb-12"
      )}>
        {step === 'confirm' ? (
          <div className="space-y-6">
            <div className="space-y-3">
               <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-black rounded-full" />
                  <p className="text-gray-500 flex-grow font-medium truncate">{pickup?.address}</p>
               </div>
               <div className="ml-1 w-px h-4 bg-gray-200" />
               <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-white border border-black rounded-full" />
                  <p className="text-gray-500 flex-grow font-medium truncate">{dropoff?.address}</p>
               </div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-black text-white rounded-lg">
                    <Car size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Toto Standard</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fast & Secure</p>
                  </div>
               </div>
               <p className="text-xl font-black">₹{fare}</p>
            </div>

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
                  <Logo className="h-4 text-white" />
                </div>
              )}
            </motion.button>
            {rideError && (
              <p className="text-red-500 text-[10px] text-center font-bold uppercase tracking-widest mt-2">{rideError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl">
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                 {step === 'pickup' ? 'Pickup Location' : 'Destination'}
               </p>
               <p className="font-bold text-sm truncate">
                 {currentCenter ? `${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}` : 'Detecting...'}
               </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmLocation}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2"
            >
              <span>Confirm {step === 'pickup' ? 'Pickup' : 'Dropoff'}</span>
              <ArrowRight size={20} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
