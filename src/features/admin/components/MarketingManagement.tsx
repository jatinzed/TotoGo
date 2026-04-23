import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Gift, Tag, Send, Users, History, Plus, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '../../../utils/format';

export default function MarketingManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'referrals' | 'promo' | 'gocoin'>('referrals');
  const [promos, setPromos] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetchMarketingData();
  }, [activeSubTab]);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'promo') {
        const { data } = await supabase.from('promo_codes').select('*');
        setPromos(data || []);
      } else if (activeSubTab === 'referrals') {
        const { data } = await supabase.from('referrals').select('*, referrer:users!referrer_id(*), referee:users!referee_id(*)');
        setReferrals(data || []);
      }
    } catch (err) {
      console.warn("Marketing tables might be missing.");
    } finally {
      setLoading(false);
    }
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
                <button className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/10">
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
                         <button className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                         </button>
                      </div>
                      <h4 className="text-2xl font-black mb-1">{promo.discount_value}% OFF</h4>
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
                 <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
                    <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center mb-8 border border-orange-100">
                       <Zap className="text-orange-500" size={32} />
                    </div>
                    <h3 className="text-2xl font-black mb-4">GoCoin Economy Tools</h3>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
                       Manually adjust user GoCoin balances, view global transaction history or configure gamification rewards.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                       <button className="py-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                          Adjust Balances
                       </button>
                       <button className="py-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                          View Leaders
                       </button>
                    </div>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
