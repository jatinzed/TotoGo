import { create } from 'zustand';
import { supabase } from '../../../lib/supabase/client';
import { Ride, RideStatus } from '../types';

interface RideState {
  currentRide: Ride | null;
  isLoading: boolean;
  error: string | null;
  setCurrentRide: (ride: Ride | null) => void;
  fetchRide: (id: string) => Promise<void>;
  subscribeToRide: (id: string) => () => void;
  dispatchRide: (rideId: string) => Promise<{ success: boolean; error?: string }>;
  cancelRide: (rideId: string, status: RideStatus) => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  currentRide: null,
  isLoading: false,
  error: null,

  setCurrentRide: (ride) => set({ currentRide: ride }),

  fetchRide: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*, driver:driver_id(id, full_name, phone, driver_profile:driver_profiles(*))')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      set({ currentRide: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToRide: (id) => {
    const channelName = `ride-tracking-${id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` },
        async (payload) => {
          const newRide = payload.new as Ride;
          // If driver_id changed or was null and now exists, re-fetch full details
          if (newRide.driver_id && (!get().currentRide?.driver_id)) {
            await get().fetchRide(id);
          } else {
            set((state) => ({
              currentRide: state.currentRide ? { ...state.currentRide, ...newRide } : newRide
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  dispatchRide: async (rideId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('dispatch_nearest_driver', { p_ride_id: rideId });
      
      if (error) throw error;
      
      if (!data.success) {
        set({ error: data.error || 'No available drivers found' });
        return { success: false, error: data.error };
      }

      // Notify rider about assignment
      await supabase.from('notifications').insert({
        user_id: get().currentRide?.rider_id || '',
        title: 'Driver Assigned',
        body: 'A driver has accepted your request and is on the way!'
      });

      return { success: true };
    } catch (err: any) {
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  cancelRide: async (rideId, status) => {
    const idempotencyKey = crypto.randomUUID();
    set({ isLoading: true });
    try {
      const riderId = get().currentRide?.rider_id;
      const driverId = get().currentRide?.driver_id;

      if (status === 'requested') {
        const { error } = await supabase.rpc('cancel_ride_before_accept', { 
          p_ride_id: rideId,
          p_idempotency_key: idempotencyKey
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('process_rider_cancellation', { 
          p_ride_id: rideId,
          p_idempotency_key: idempotencyKey
        });
        if (error) throw error;

        // Notify driver if assigned
        if (driverId) {
          await supabase.from('notifications').insert({
            user_id: driverId,
            title: 'Ride Cancelled',
            body: 'The rider has cancelled the trip.'
          });
        }
      }

      // Notify rider
      if (riderId) {
        await supabase.from('notifications').insert({
          user_id: riderId,
          title: 'Ride Cancelled',
          body: 'Your ride has been cancelled successfully.'
        });
      }

      set({ currentRide: null });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  }
}));
