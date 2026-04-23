import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion } from 'motion/react';
import { Users, Car, IndianRupee, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalRiders: 0,
    totalDrivers: 0,
    totalRidesToday: 0,
    activeRides: 0,
    pendingVerifications: 0,
    openComplaints: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get Riders count
      const { count: ridersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'rider');

      // Get Drivers count
      const { count: driversCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver');

      // Get verification pending count
      const { count: pendingCount } = await supabase
        .from('driver_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      // Get open complaints
      const { count: complaintsCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Today's stats
      const today = new Date();
      today.setHours(0,0,0,0);
      const { count: ridesToday } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .gte('requested_at', today.toISOString());

      // Active rides
      const { count: activeCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .in('status', ['accepted', 'arrived', 'started']);

      setStats({
        totalRiders: ridersCount || 0,
        totalDrivers: driversCount || 0,
        totalRidesToday: ridesToday || 0,
        activeRides: activeCount || 0,
        pendingVerifications: pendingCount || 0,
        openComplaints: complaintsCount || 0,
        totalRevenue: 12540 // Mocking for now as we need complex aggregation for true revenue
      });

      // Mock chart data
      setChartData([
        { name: 'Mon', revenue: 4000, rides: 240 },
        { name: 'Tue', revenue: 3000, rides: 198 },
        { name: 'Wed', revenue: 2000, rides: 150 },
        { name: 'Thu', revenue: 2780, rides: 390 },
        { name: 'Fri', revenue: 1890, rides: 480 },
        { name: 'Sat', revenue: 6390, rides: 520 },
        { name: 'Sun', revenue: 4490, rides: 400 },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-100 rounded-[32px] animate-pulse" />
      ))}
    </div>
  );

  const cards = [
    { label: 'Total Riders', value: stats.totalRiders, icon: Users, color: 'blue' },
    { label: 'Total Drivers', value: stats.totalDrivers, icon: Car, color: 'green' },
    { label: 'Rides Today', value: stats.totalRidesToday, icon: Clock, color: 'orange' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: IndianRupee, color: 'purple' },
    { label: 'Active Rides', value: stats.activeRides, icon: TrendingUp, color: 'indigo' },
    { label: 'Pending Docs', value: stats.pendingVerifications, icon: ShieldCheck, color: 'red' },
    { label: 'Open Complaints', value: stats.openComplaints, icon: AlertCircle, color: 'amber' },
  ];

  function ShieldCheck({ size, className }: { size?: number, className?: string }) {
    return <CheckCircle2 size={size} className={className} />;
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.slice(0, 4).map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 bg-${card.color}-50 rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon className={`text-${card.color}-500`} size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
            <h3 className="text-2xl font-black">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black">Revenue Analytics</h3>
             <select className="bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2">
                <option>Weekly</option>
                <option>Monthly</option>
             </select>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                     cursor={{ fill: '#f8f9fa' }}
                   />
                   <Bar dataKey="revenue" fill="#000" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black">User Growth</h3>
             <div className="flex space-x-2">
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 bg-black rounded-full" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Riders</span>
                </div>
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 bg-blue-500 rounded-full" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Drivers</span>
                </div>
             </div>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                   />
                   <Line type="monotone" dataKey="rides" stroke="#000" strokeWidth={4} dot={{ r: 4, fill: '#000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.slice(4).map((card, i) => (
          <div key={i} className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
              <h3 className="text-xl font-black">{card.value}</h3>
            </div>
            <div className={`p-3 bg-${card.color}-100 rounded-2xl`}>
              <card.icon className={`text-${card.color}-600`} size={20} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
