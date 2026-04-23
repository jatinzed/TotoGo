import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { UserWallet, UserGoCoin } from '../../common/types';
import { formatCurrency } from '../../../utils/format';
import { motion } from 'motion/react';
import { Plus, Coins, ArrowUpRight, ArrowDownLeft, History as HistoryIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function WalletPage() {
  const { profile } = useAuthStore();
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [goCoin, setGoCoin] = useState<UserGoCoin | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMoney, setAddingMoney] = useState(false);

  useEffect(() => {
    if (profile) fetchWalletData();
  }, [profile]);

  const fetchWalletData = async () => {
    const { data: wData } = await supabase.from('user_wallets').select('*').eq('user_id', profile!.id).single();
    const { data: cData } = await supabase.from('user_gocoins').select('*').eq('user_id', profile!.id).single();
    const { data: tData } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });

    setWallet(wData);
    setGoCoin(cData);
    setTransactions(tData || []);
    setLoading(false);
  };

  const handleAddMoney = async () => {
    setAddingMoney(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const { error } = await supabase.rpc('credit_wallet', {
        p_user_id: profile!.id,
        p_amount: 10000, // ₹100
        p_type: 'topup',
        p_idempotency_key: idempotencyKey,
        p_metadata: { source: 'mock_topup' }
      });
      if (error) throw error;
      useAuthStore.getState().refreshBalance();
      await fetchWalletData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingMoney(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header>
          <h1 className="text-2xl font-black">Payments</h1>
          <p className="text-gray-400 text-sm font-medium">Manage your balance & GoCoins</p>
      </header>

      {/* Main Balance card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col items-center">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-center w-full">Total Balance</p>
            <h2 className="text-4xl font-black mb-10">{formatCurrency(wallet?.balance || 0)}</h2>
            
            <div className="grid grid-cols-2 gap-4 w-full">
               <button 
                onClick={handleAddMoney}
                disabled={addingMoney}
                className="bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
               >
                 {addingMoney ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                 <span>Top Up</span>
               </button>
               <div className="bg-white/10 backdrop-blur-md py-4 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                  <div className="flex items-center space-x-2 mb-1">
                    <Coins size={14} className="text-white" />
                    <span className="text-sm font-black">{goCoin?.balance || 0}</span>
                  </div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">GoCoins</span>
               </div>
            </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16" />
      </motion.div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-6 px-1">
           <h4 className="font-black text-lg flex items-center">
             <HistoryIcon className="mr-2 text-gray-300" size={20} />
             Transactions
           </h4>
           <button className="text-xs font-black text-gray-400 uppercase tracking-widest">See all</button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
             <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
             {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center space-x-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                   <div className={cn(
                     "p-3 rounded-xl",
                     tx.amount > 0 ? "bg-black text-white" : "bg-white border border-black text-black"
                   )}>
                     {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                   </div>
                   <div className="flex-grow min-w-0">
                      <p className="font-bold text-sm truncate">{tx.description || tx.type}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{format(new Date(tx.created_at), 'dd MMM, hh:mm a')}</p>
                   </div>
                   <p className="font-black text-sm">
                     {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                   </p>
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
