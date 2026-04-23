import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { Ride } from '../../common/types';
import { formatCurrency } from '../../../utils/format';
import { MapPin, Calendar, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function RidesHistory() {
  const { profile } = useAuthStore();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchRides();
  }, [profile]);

  const fetchRides = async () => {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('rider_id', profile!.id)
      .order('requested_at', { ascending: false });
    
    if (data) setRides(data as Ride[]);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-8">Trip History</h1>
      
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
           <p className="text-gray-400 font-bold">No trips yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rides.map(ride => (
            <div key={ride.id} className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:border-gray-300 transition-all cursor-pointer group">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                     <Calendar size={14} />
                     <span>{format(new Date(ride.requested_at), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                    ride.status === 'completed' ? "bg-black text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    {ride.status}
                  </span>
               </div>
               
               <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    <p className="text-gray-600 font-medium truncate">{ride.pickup_address}</p>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-1.5 h-1.5 bg-white border border-black rounded-full" />
                    <p className="text-gray-600 font-medium truncate">{ride.dropoff_address}</p>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <p className="font-black text-lg">{formatCurrency(ride.fare)}</p>
                  <div className="p-2 bg-gray-50 rounded-xl text-gray-300 group-hover:text-black group-hover:bg-gray-100 transition-all">
                    <ChevronRight size={18} />
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
