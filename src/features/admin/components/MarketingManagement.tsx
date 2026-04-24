import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Gift, Tag, Send, Users, History, Plus, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '../../../utils/format';

export default function MarketingManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'referrals' | 'promo' | 'gocoin'>('referrals');
  const [promos, setPromos] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [gocoinLeaders, setGocoinLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showLeadersModal, setShowLeadersModal] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    expires_at: '',
    usage_limit: 100
  });

  const [gocoinAdj, setGocoinAdj] = useState({
    email: '',
    amount: '',
    reason: ''
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
     fetchMarketingData();
  }, [activeSubTab]);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'promo') {
        const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
        setPromos(data || []);
      } else if (activeSubTab === 'referrals') {
        const { data } = await supabase.from('referrals').select('*, referrer:users!referrer_id(*), referee:users!referee_id(*)');
        setReferrals(data || []);
      }
    } catch (err) {
      console.warn("Marketing data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const { error } = await supabase.from('promo_codes').insert([newPromo]);
      if (error) throw error;
      alert('Promo code created successfully');
      setShowPromoModal(false);
      fetchMarketingData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (!error) fetchMarketingData();
  };

  const handleGocoinAdjustment = async () => {
    if (!gocoinAdj.email || !gocoinAdj.amount) return;
    setProcessing(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', gocoinAdj.email)
        .single();
      
      if (userError || !userData) throw new Error('User not found');

      const { error } = await supabase.rpc('adjust_gocoins', {
        p_user_id: userData.id,
        p_amount: parseInt(gocoinAdj.amount),
        p_reason: gocoinAdj.reason,
        p_idempotency_key: crypto.randomUUID()
      });

      if (error) throw error;
      alert('GoCoins adjusted');
      setGocoinAdj({ email: '', amount: '', reason: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const fetchLeaders = async () => {
    setLoading(true);
    setShowLeadersModal(true);
    const { data } = await supabase
      .from('user_gocoins')
      .select('*, user:users(full_name, email)')
      .order('balance', { ascending: false })
      .limit(10);
    setGocoinLeaders(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'referrals', label: 'Referrals', icon: Users },
          { id: 'promo', label: 'Promo Codes', icon: Tag },
          { id: 'gocoin', label: 'GoCoin Economy', icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === tab.id ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'referrals' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Referrals</p>
                   <h3 className="text-3xl font-black">{referrals.length}</h3>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rewards Disbursed</p>
                   <h3 className="text-3xl font-black">₹4,250</h3>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conversion Rate</p>
                   <h3 className="text-3xl font-black">64%</h3>
                </div>
             </div>

             <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referrer</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referee</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {referrals.map(ref => (
                         <tr key={ref.id}>
                            <td className="px-6 py-4 font-bold text-sm">{ref.referrer?.full_name}</td>
                            <td className="px-6 py-4 font-bold text-sm">{ref.referee?.full_name}</td>
                            <td className="px-6 py-4">
                               <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[10px] font-black uppercase tracking-widest">
                                  {ref.status}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-400">{new Date(ref.created_at).toLocaleDateString()}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>
        )}

        {activeSubTab === 'promo' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Active Promo Codes</h3>
                <button 
                  onClick={() => setShowPromoModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/10"
                >
                   <Plus size={16} />
                   <span>Create Promo</span>
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promos.map(promo => (
                   <div key={promo.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                         <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                            <span className="text-orange-600 font-mono font-black tracking-widest uppercase">{promo.code}</span>
                         </div>
                         <button 
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                      <h4 className="text-2xl font-black mb-1">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`} OFF
                      </h4>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Expires {new Date(promo.expires_at).toLocaleDateString()}</p>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                         <div className="flex items-center space-x-1 text-gray-400">
                            <History size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{promo.usage_count || 0} Uses</span>
                         </div>
                         <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>
        )}

        {activeSubTab === 'gocoin' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                 <div className="flex flex-col md:flex-row gap-12">
                    <div className="md:w-1/2 space-y-6">
                       <div className="w-16 h-16 bg-orange-50 rounded-[24px] flex items-center justify-center border border-orange-100">
                          <Zap className="text-orange-500" size={24} />
                       </div>
                       <h3 className="text-2xl font-black">GoCoin Adjustment</h3>
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">User Email</label>
                             <input 
                               placeholder="user@example.com"
                               value={gocoinAdj.email}
                               onChange={(e) => setGocoinAdj({...gocoinAdj, email: e.target.value})}
                               className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">GoCoins (±)</label>
                                <input 
                                  placeholder="50"
                                  type="number"
                                  value={gocoinAdj.amount}
                                  onChange={(e) => setGocoinAdj({...gocoinAdj, amount: e.target.value})}
                                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Reason</label>
                                <input 
                                  placeholder="Gift, Reward..."
                                  value={gocoinAdj.reason}
                                  onChange={(e) => setGocoinAdj({...gocoinAdj, reason: e.target.value})}
                                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                                />
                             </div>
                          </div>
                          <button 
                            onClick={handleGocoinAdjustment}
                            disabled={processing}
                            className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
                          >
                             {processing ? 'Processing...' : 'Apply Adjustment'}
                          </button>
                       </div>
                    </div>
                    <div className="md:w-1/2 flex flex-col justify-center items-center text-center bg-gray-50 rounded-[32px] p-8 border border-gray-100">
                       <Users className="text-gray-300 mb-4" size={48} />
                       <h4 className="text-xl font-black mb-2">Platform Leaders</h4>
                       <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 px-4">
                          Analyze the top contributors and users with the highest GoCoin engagement across the system.
                       </p>
                       <button 
                        onClick={fetchLeaders}
                        className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm"
                       >
                          View Rich List
                       </button>
                    </div>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Promo Create Modal */}
      <AnimatePresence>
         {showPromoModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-6">
               <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-[40px] p-10 overflow-hidden relative">
                  <button onClick={() => setShowPromoModal(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl transition-all">
                     <X size={20} className="text-gray-400" />
                  </button>
                  <h3 className="text-2xl font-black mb-8 italic">New Promotional Code</h3>
                  
                  <form onSubmit={handleCreatePromo} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Code Name (Uppercase)</label>
                        <input 
                           required
                           placeholder="NEWYEAR2024"
                           value={newPromo.code}
                           onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                           className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Type</label>
                           <select 
                             value={newPromo.discount_type}
                             onChange={(e) => setNewPromo({...newPromo, discount_type: e.target.value})}
                             className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                           >
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed (₹)</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Value</label>
                           <input 
                              type="number"
                              required
                              value={newPromo.discount_value}
                              onChange={(e) => setNewPromo({...newPromo, discount_value: parseInt(e.target.value)})}
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                           />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Expiry Date</label>
                           <input 
                              type="date"
                              required
                              value={newPromo.expires_at}
                              onChange={(e) => setNewPromo({...newPromo, expires_at: e.target.value})}
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Usage Limit</label>
                           <input 
                              type="number"
                              required
                              value={newPromo.usage_limit}
                              onChange={(e) => setNewPromo({...newPromo, usage_limit: parseInt(e.target.value)})}
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold"
                           />
                        </div>
                     </div>
                     <button 
                       type="submit"
                       disabled={processing}
                       className="w-full py-5 bg-black text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                     >
                        {processing ? 'Creating...' : 'Launch Promo Code'}
                     </button>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Leaders Modal */}
      <AnimatePresence>
         {showLeadersModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-6">
               <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden max-h-[80vh] flex flex-col">
                  <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                     <div>
                        <h3 className="text-2xl font-black">GoCoin Rich List</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Top 10 most engaged users</p>
                     </div>
                     <button onClick={() => setShowLeadersModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                        <X size={20} className="text-gray-400" />
                     </button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-10">
                     <div className="space-y-4">
                        {gocoinLeaders.map((leader, i) => (
                           <div key={leader.user_id} className="flex items-center space-x-4 p-5 bg-gray-50 rounded-3xl border border-gray-100 group hover:bg-black hover:text-white transition-all cursor-pointer">
                              <div className="w-10 h-10 flex items-center justify-center font-black text-lg bg-white/20 rounded-xl">
                                 {i + 1}
                              </div>
                              <div className="flex-grow">
                                 <p className="font-bold text-sm">{leader.user?.full_name}</p>
                                 <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest truncate">{leader.user?.email}</p>
                              </div>
                              <div className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-xl group-hover:bg-white group-hover:text-black transition-all">
                                 <Zap size={14} />
                                 <span className="font-black text-sm">{leader.balance}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}

function X({ size, className }: any) {
   return <Plus size={size} className={cn("rotate-45", className)} />;
}
