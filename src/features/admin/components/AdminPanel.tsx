import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { formatCurrency } from '../../../utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Car, AlertCircle, Check, X, Shield, Search, Wallet, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../../components/common/Logo';
import { cn } from '../../../utils/format';

export default function AdminPanel() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'drivers' | 'rides' | 'complaints' | 'wallet'>('drivers');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-verify admin access
  const isAdmin = profile?.email === 'comrade.jotinmoy.010@proton.me';

  useEffect(() => {
    if (!profile) return;
    if (!isAdmin) {
       navigate('/');
       return;
    }
    fetchData();
  }, [profile, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'drivers') {
      const { data } = await supabase
        .from('driver_profiles')
        .select('*, user:users(*), documents:driver_documents(*)');
      setDrivers(data || []);
    } else if (activeTab === 'rides') {
      const { data } = await supabase
        .from('rides')
        .select('*, rider:users!rider_id(*), driver:users!driver_id(*)')
        .order('requested_at', { ascending: false })
        .limit(50);
      setRides(data || []);
    } else if (activeTab === 'complaints') {
      const { data } = await supabase.from('complaints').select('*, user:users(*)');
      setComplaints(data || []);
    }
    setLoading(false);
  };

  const handleVerifyDriver = async (userId: string, isVerified: boolean) => {
    await supabase
      .from('driver_profiles')
      .update({ is_verified: isVerified, verification_status: isVerified ? 'verified' : 'rejected' })
      .eq('user_id', userId);
    fetchData();
  };

  const [creditEmail, setCreditEmail] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [crediting, setCrediting] = useState(false);

  const handleManualCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrediting(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', creditEmail)
        .single();
      
      if (userError) throw new Error('User not found');

      const { error } = await supabase.rpc('credit_wallet', {
        p_user_id: userData.id,
        p_amount: parseInt(creditAmount) * 100,
        p_type: 'manual_adjustment',
        p_description: creditReason || 'Admin manual credit',
        p_idempotency_key: `admin_${Date.now()}`,
        p_metadata: { admin_email: profile?.email }
      });

      if (error) throw error;
      alert('Wallet credited successfully');
      setCreditEmail('');
      setCreditAmount('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCrediting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-64 bg-black text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center space-x-3 mb-10">
           <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft size={20} />
           </button>
           <div className="flex items-center space-x-2">
              <Logo className="h-5 text-white" />
              <span className="text-xl font-black tracking-tight border-l border-white/20 pl-3">Admin</span>
           </div>
        </div>

        <nav className="space-y-2 flex-grow">
          {[
            { id: 'drivers', label: 'Drivers', icon: Users },
            { id: 'rides', label: 'Rides', icon: Car },
            { id: 'complaints', label: 'Complaints', icon: AlertCircle },
            { id: 'wallet', label: 'Finance', icon: Wallet },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold transition-all",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/5">
           <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Logged in as</p>
           <p className="text-xs font-bold truncate">{profile?.email}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
           <h2 className="text-3xl font-black capitalize">{activeTab} Management</h2>
           <div className="flex items-center space-x-2 bg-white border border-gray-100 p-2 rounded-xl shadow-sm">
              <Search className="text-gray-300 ml-2" size={18} />
              <input type="text" placeholder="Search..." className="bg-transparent border-none focus:ring-0 text-sm w-48" />
           </div>
        </header>

        {loading ? (
           <div className="h-64 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-200" size={48} />
           </div>
        ) : (
           <AnimatePresence mode="wait">
              {activeTab === 'drivers' && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {drivers.map(driver => (
                       <div key={driver.user_id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                          <div className="flex items-center space-x-6">
                             <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden ring-4 ring-gray-50 uppercase font-black text-gray-300 flex items-center justify-center">
                                {driver.user?.full_name?.[0]}
                             </div>
                             <div>
                                <h4 className="font-black text-lg">{driver.user?.full_name}</h4>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{driver.vehicle_details?.number} • {driver.vehicle_details?.model}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center space-x-8">
                             <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={cn(
                                   "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                   driver.is_verified ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                                )}>
                                   {driver.verification_status}
                                </span>
                             </div>

                             <div className="flex space-x-2">
                                <button 
                                 onClick={() => handleVerifyDriver(driver.user_id, true)}
                                 className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                                >
                                   <Check size={20} />
                                </button>
                                <button 
                                 onClick={() => handleVerifyDriver(driver.user_id, false)}
                                 className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >
                                   <X size={20} />
                                </button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </motion.div>
              )}

              {activeTab === 'rides' && (
                 <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm shadow-black/5">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rider / Driver</th>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</th>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fare</th>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {rides.map(ride => (
                             <tr key={ride.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-6">
                                   <p className="font-bold text-sm">{ride.rider?.full_name}</p>
                                   <p className="text-[10px] text-gray-400 font-bold truncate max-w-[120px]">{ride.driver?.full_name || 'Unassigned'}</p>
                                </td>
                                <td className="px-6 py-6">
                                   <p className="text-xs text-gray-500 truncate max-w-[200px]">{ride.pickup_address} → {ride.dropoff_address}</p>
                                </td>
                                <td className="px-6 py-6">
                                   <p className="font-black text-sm">{formatCurrency(ride.fare)}</p>
                                </td>
                                <td className="px-6 py-6">
                                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-lg">{ride.status}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}

              {activeTab === 'wallet' && (
                 <div className="max-w-xl mx-auto">
                    <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl">
                       <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mb-8 mx-auto border border-blue-100">
                          <Wallet className="text-blue-500" size={32} />
                       </div>
                       <h3 className="text-2xl font-black text-center mb-2">Manual Wallet Credit</h3>
                       <p className="text-gray-400 font-medium text-center text-sm mb-10 leading-relaxed">
                          Use this form to adjust user balances for compensation, refunds or penalties.
                       </p>
                       
                       <form onSubmit={handleManualCredit} className="space-y-6">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">User Email</label>
                             <input 
                              type="email" 
                              required
                              value={creditEmail}
                              onChange={(e) => setCreditEmail(e.target.value)}
                              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                              placeholder="e.g. jatin@totogo.app"
                             />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Amount (₹)</label>
                             <input 
                              type="number" 
                              required
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(e.target.value)}
                              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                              placeholder="e.g. 50"
                             />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Reason</label>
                             <textarea 
                              required
                              value={creditReason}
                              onChange={(e) => setCreditReason(e.target.value)}
                              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all resize-none h-24"
                              placeholder="Describe why you are adding this credit..."
                             />
                          </div>
                          
                          <button 
                           disabled={crediting}
                           className="w-full py-5 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                          >
                             {crediting ? <Loader2 className="animate-spin" /> : <span>Authorize Credit</span>}
                          </button>
                       </form>
                    </div>
                 </div>
              )}
           </AnimatePresence>
        )}
      </main>
    </div>
  );
}
