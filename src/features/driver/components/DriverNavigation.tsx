import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { Ride, DriverProfile } from '../../common/types';
import { formatCurrency, cn } from '../../../utils/format';
import { useRouting, RouteData } from '../../../lib/maps/routing';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { ChangeView } from '../../../components/common/ChangeView';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, ArrowRight, Phone } from 'lucide-react';

import { useAuthStore } from '../../common/stores/authStore';

import { getDistanceFromLatLonInMeters } from '../../../utils/distance';

interface DriverNavigationProps {
  ride: Ride;
  driverProfile: DriverProfile;
  onTripEnd: () => void;
}

export default function DriverNavigation({ ride, driverProfile, onTripEnd }: DriverNavigationProps) {
  const { getRoute } = useRouting();
  const [route, setRoute] = useState<RouteData | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride>(ride);

  useEffect(() => {
    setCurrentRide(ride);
  }, [ride]);

  useEffect(() => {
    const p = parsePoint(currentRide.pickup_geometry);
    const d = parsePoint(currentRide.dropoff_geometry);
    if (p && d) {
      getRoute(p, d).then(res => {
        if (res) setRoute(res.primary);
      });
    }

    const channel = supabase
      .channel(`ride-nav-${currentRide.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'rides', 
        filter: `id=eq.${currentRide.id}` 
      }, (payload) => {
        const newRide = payload.new as Ride;
        setCurrentRide(newRide);
        if (['completed', 'cancelled_by_rider', 'cancelled_by_driver'].includes(newRide.status)) {
           onTripEnd();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRide.id]);

  const handleAction = async (newStatus: 'arrived' | 'started' | 'completed') => {
    const update: any = { status: newStatus };
    
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

    if (newStatus === 'started') update.started_at = new Date().toISOString();
    if (newStatus === 'completed') update.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('rides')
      .update(update)
      .eq('id', currentRide.id);

    if (!error) {
      // Send notification to rider
      let title = "";
      let body = "";
      
      if (newStatus === 'arrived') {
        title = "Driver Arrived";
        body = "Your Toto is here! Please head to the pickup point.";
      } else if (newStatus === 'started') {
        title = "Trip Started";
        body = "You are on your way to the destination. Enjoy your ride!";
      } else if (newStatus === 'completed') {
        title = "Ride Completed";
        body = "Thank you for riding with TotoGo! Please rate your driver.";
      }

      if (title) {
        await supabase.from('notifications').insert({
          user_id: currentRide.rider_id,
          title,
          body
        });
      }

      // If completed, notify driver and handle payment
      if (newStatus === 'completed') {
        try {
          // Issue #6: Handle payments on completion
          await supabase.rpc('debit_wallet', { 
            p_user_id: currentRide.rider_id, 
            p_amount: currentRide.fare, 
            p_type: 'ride_payment', 
            p_idempotency_key: crypto.randomUUID(), 
            p_metadata: { ride_id: currentRide.id } 
          });

          await supabase.rpc('credit_wallet', { 
            p_user_id: useAuthStore.getState().profile?.id, 
            p_amount: Math.floor(currentRide.fare * 0.8), 
            p_type: 'ride_earning', 
            p_idempotency_key: crypto.randomUUID(), 
            p_metadata: { ride_id: currentRide.id } 
          });

          await useAuthStore.getState().refreshBalance();
          
          await supabase.from('notifications').insert({
            user_id: driverProfile.user_id,
            title: "Ride Completed",
            body: `Ride ended. You earned ₹${currentRide.fare}.`
          });
        } catch (err) {
          console.error('Payment processing failed:', err);
        }
      }
    } else {
      alert(error.message);
    }
  };

  function MapContainerChild() {
    return (
      <>
        <ChangeView center={toLatLngTuple(driverProfile.location)} />
        <TileLayer
          {...({
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          } as any)}
        />

        {driverProfile.location && (
          <Marker 
            {...({
              position: toLatLngTuple(driverProfile.location),
              icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [32, 32] })
            } as any)} 
          />
        )}

        {parsePoint(currentRide.pickup_geometry) && <Marker {...({position: toLatLngTuple(currentRide.pickup_geometry)} as any)} />}
        {parsePoint(currentRide.dropoff_geometry) && <Marker {...({position: toLatLngTuple(currentRide.dropoff_geometry)} as any)} />}

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
      </>
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
          <MapContainerChild />
        </MapContainer>
      </div>

      <motion.div 
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        className="bg-white p-6 rounded-t-[40px] shadow-[0_-10px_50px_rgba(0,0,0,0.1)] relative z-20"
      >
        {currentRide.status === 'accepted' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />
                Navigate to Pickup
              </div>
              <p className="text-2xl font-black">{formatCurrency(currentRide.fare)}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-black rounded-full" />
              <p className="font-bold text-sm truncate">{currentRide.pickup_address}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => handleAction('arrived')}
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
            <p className="text-gray-400 text-sm font-medium">Verify the rider name and destination.</p>
            <button 
              onClick={() => handleAction('started')}
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
              onClick={() => handleAction('completed')}
              className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              Complete Trip
              <ArrowRight className="ml-2" size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
