import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Check, X, Shield, Filter, Download, ChevronRight, Loader2, Star, Car } from 'lucide-react';
import { cn, formatCurrency } from '../../../utils/format';

interface DriverManagementProps {
  onViewDocs: (driver: any) => void;
}

export default function DriverManagement({ onViewDocs }: DriverManagementProps) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    let query = supabase
      .from('driver_profiles')
      .select('*, user:users(*), documents:driver_documents(*)');

    if (statusFilter !== 'all') query = query.eq('verification_status', statusFilter);

    const { data } = await query;
    setDrivers(data || []);
    setLoading(false);
  };

  const handleVerifyDriver = async (userId: string, isVerified: boolean) => {
    const { error } = await supabase
      .from('driver_profiles')
      .update({ is_verified: isVerified, verification_status: isVerified ? 'verified' : 'rejected' })
      .eq('id', userId);

    if (!error) {
      await supabase.from('admin_actions').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: userId,
        action: isVerified ? 'approve_driver' : 'reject_driver',
        details: { verification_status: isVerified ? 'verified' : 'rejected' }
      });
      fetchDrivers();
    } else {
      alert(error.message);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white border border-gray-100 p-2 rounded-2xl shadow-sm px-4">
            <Search className="text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search drivers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full md:w-64" 
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-gray-100 p-3 rounded-2xl text-xs font-bold focus:ring-0 shadow-sm"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Pending Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredDrivers.map(driver => (
          <motion.div 
            key={driver.id} 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between group hover:shadow-md transition-all gap-6"
          >
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden ring-4 ring-gray-50 uppercase font-black text-gray-300 flex items-center justify-center relative shrink-0">
                {driver.user?.avatar_url ? (
                  <img src={driver.user.avatar_url} className="w-full h-full object-cover" />
                ) : driver.user?.full_name?.[0]}
                {driver.is_online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-black text-lg">{driver.user?.full_name}</h4>
                  {driver.is_verified && <Shield className="text-blue-500 fill-blue-500" size={14} />}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                   {driver.vehicle_number} • {driver.vehicle_model} • {driver.vehicle_color}
                </p>
                <div className="flex items-center space-x-3 mt-2">
                   <div className="flex items-center space-x-1 text-black font-bold text-[10px] bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                      <Star size={10} className="fill-current" />
                      <span>{driver.avg_rating || '5.0'}</span>
                   </div>
                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{driver.total_rides || 0} Trips</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 md:space-x-10">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  driver.verification_status === 'verified' ? "bg-green-50 text-green-600" : 
                  driver.verification_status === 'pending' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                )}>
                  {driver.verification_status}
                </span>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => onViewDocs(driver)}
                  className="px-4 py-3 bg-gray-50 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-100 shadow-sm"
                >
                  Verify Docs
                </button>
                <div className="flex space-x-1">
                    <button 
                      onClick={() => handleVerifyDriver(driver.id, true)}
                      className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                    >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => handleVerifyDriver(driver.id, false)}
                    className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {filteredDrivers.length === 0 && (
         <div className="p-20 text-center text-gray-400 italic">No drivers matching filters.</div>
      )}
    </div>
  );
}
