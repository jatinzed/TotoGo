import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { Ride } from '../../common/types';
import { formatCurrency } from '../../../utils/format';
import { TrendingUp, Award, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { format, startOfDay, startOfWeek } from 'date-fns';

export default function DriverEarnings() {
  const { profile } = useAuthStore();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });

  useEffect(() => {
    if (profile) {
      fetchEarnings();
    }
  }, [profile]);

  const fetchEarnings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', profile!.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (data) {
      setRides(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (data: Ride[]) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    let today = 0, week = 0, total = 0;

    data.forEach(ride => {
      const date = new Date(ride.requested_at);
      const earning = (ride.fare * 0.8); // 80% to driver
      total += earning;
      if (date >= todayStart) today += earning;
      if (date >= weekStart) week += earning;
    });

    setStats({ today, week, total });
  };

  return (
    <div className="p-6 space-y-8 pb-32">
       <header>
          <h1 className="text-2xl font-black">Earnings</h1>
          <p className="text-gray-400 text-sm font-medium">Your driving summary</p>
       </header>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-4">
          <div className="bg-black text-white p-6 rounded-[32px] col-span-2 relative overflow-hidden">
             <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Earnings</p>
             <h2 className="text-3xl font-black">{formatCurrency(stats.total)}</h2>
             <TrendingUp className="absolute right-6 bottom-6 text-white/10" size={48} />
          </div>
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Today</p>
             <p className="text-xl font-black">{formatCurrency(stats.today)}</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">This Week</p>
             <p className="text-xl font-black">{formatCurrency(stats.week)}</p>
          </div>
       </div>

       {/* Recent Rides */}
       <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
             <h4 className="text-lg font-black flex items-center">
                <Award className="mr-2 text-black" size={20} />
                Recent Missions
             </h4>
             <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest">History</button>
          </div>

          {loading ? (
             <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
             </div>
          ) : rides.length === 0 ? (
             <div className="p-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                <p className="text-gray-300 font-black text-xs uppercase tracking-[0.2em]">No trips completed</p>
             </div>
          ) : (
             <div className="space-y-4">
                {rides.map(ride => (
                   <div key={ride.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
                       <div>
                          <p className="font-bold text-sm">{format(new Date(ride.requested_at), 'dd MMM, hh:mm a')}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission: {formatCurrency(ride.fare * 0.2)}</p>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-lg text-black">+{formatCurrency(ride.fare * 0.8)}</p>
                          <div className="flex items-center justify-end text-[8px] text-gray-400 font-black uppercase tracking-widest">
                             <span>PAID</span>
                             <div className="w-1.5 h-1.5 bg-black rounded-full ml-1" />
                          </div>
                       </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
