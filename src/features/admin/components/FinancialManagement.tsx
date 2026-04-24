import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion } from 'motion/react';
import { IndianRupee, TrendingUp, ArrowUpRight, ArrowDownLeft, Filter, Download, Calendar, Search } from 'lucide-react';
import { formatCurrency, cn } from '../../../utils/format';

export default function FinancialManagement() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    driverPayouts: 0,
    cancellationEarnings: 0
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*, user:users(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      setTransactions(txData || []);

      // Platform revenue: sum ledger_entries account='platform_revenue' type='credit'
      const { data: revenueData } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('account', 'platform_revenue')
        .eq('entry_type', 'credit');
      
      const totalRevenue = (revenueData || []).reduce((acc, curr) => acc + curr.amount, 0);

      // Driver payouts: sum wallet_transactions type='ride_earning' amount > 0
      const { data: payoutsData } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'ride_earning');
      
      const totalPayouts = (payoutsData || []).reduce((acc, curr) => acc + (curr.amount > 0 ? curr.amount : 0), 0);

      // Cancellation earnings
      const { data: cancelData } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('account', 'platform_revenue')
        .filter('metadata->>reason', 'eq', 'cancellation');
      
      const cancellationEarnings = (cancelData || []).reduce((acc, curr) => acc + curr.amount, 0);

      setStats({
        totalRevenue: totalRevenue / 100, // paise to rupees
        driverPayouts: totalPayouts / 100,
        cancellationEarnings: cancellationEarnings / 100
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [adjustment, setAdjustment] = useState({
    email: '',
    amount: '',
    reason: ''
  });
  const [adjusting, setAdjusting] = useState(false);

  const handleWalletAdjustment = async (type: 'credit' | 'debit') => {
    if (!adjustment.email || !adjustment.amount || !adjustment.reason) {
      alert('Please fill all fields');
      return;
    }

    setAdjusting(true);
    try {
      // 1. Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', adjustment.email)
        .single();
      
      if (userError || !userData) throw new Error('User not found');

      const amountPaise = Math.round(parseFloat(adjustment.amount) * 100);
      const rpcName = type === 'credit' ? 'credit_wallet' : 'debit_wallet';

      const { data, error } = await supabase.rpc(rpcName, {
        p_user_id: userData.id,
        p_amount: amountPaise,
        p_type: 'manual_adjustment',
        p_idempotency_key: crypto.randomUUID(),
        p_metadata: { reason: adjustment.reason, admin_id: (await supabase.auth.getUser()).data.user?.id }
      });

      if (error) throw error;

      alert(`Successfully ${type}ed wallet.`);
      setAdjustment({ email: '', amount: '', reason: '' });
      fetchFinancialData();
    } catch (err: any) {
      alert(err.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Platform Revenue', val: stats.totalRevenue, icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Driver Payouts', val: stats.driverPayouts, icon: ArrowUpRight, color: 'bg-blue-500' },
          { label: 'Cancellation Fees', val: stats.cancellationEarnings, icon: IndianRupee, color: 'bg-orange-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-110", item.color)} />
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", item.color.replace('bg-', 'bg-opacity-10 text-'))}>
               <item.icon size={24} className={item.color.replace('bg-', 'text-')} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className="text-3xl font-black">{formatCurrency(item.val)}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden p-10 space-y-8">
        <div>
           <h3 className="text-xl font-black italic">Manual Wallet Adjustment</h3>
           <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Adjust user balances for refunds or fixes</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">User Email</label>
              <input 
                type="email"
                placeholder="search user email..."
                value={adjustment.email}
                onChange={(e) => setAdjustment({...adjustment, email: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (₹)</label>
              <input 
                type="number"
                placeholder="0.00"
                value={adjustment.amount}
                onChange={(e) => setAdjustment({...adjustment, amount: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Adjustment Reason</label>
              <input 
                type="text"
                placeholder="bonus, refund, error fix..."
                value={adjustment.reason}
                onChange={(e) => setAdjustment({...adjustment, reason: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
        </div>
        
        <div className="flex space-x-4">
           <button 
             onClick={() => handleWalletAdjustment('credit')}
             disabled={adjusting}
             className="flex-grow py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition-all"
           >
             {adjusting ? 'Processing...' : 'Credit Wallet'}
           </button>
           <button 
             onClick={() => handleWalletAdjustment('debit')}
             disabled={adjusting}
             className="flex-grow py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
           >
             {adjusting ? 'Processing...' : 'Debit Wallet'}
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h3 className="text-xl font-black">Transaction Ledger</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Real-time financial activity</p>
           </div>
           <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-6 py-3 bg-gray-50 text-black border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                 <Download size={16} />
                 <span>Export Reports</span>
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-mono text-xs text-gray-400">#{tx.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div>
                       <p className="text-sm font-bold">{tx.user?.full_name}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{tx.user?.role}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                       {tx.amount > 0 ? (
                         <ArrowDownLeft size={14} className="text-green-500" />
                       ) : (
                         <ArrowUpRight size={14} className="text-red-500" />
                       )}
                       <p className={cn(
                         "font-black text-sm",
                         tx.amount > 0 ? "text-green-600" : "text-red-600"
                       )}>
                         {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount / 100)}
                       </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 rounded-lg text-gray-500">
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       <Calendar size={12} />
                       <span>{new Date(tx.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && transactions.length === 0 && (
          <div className="p-20 text-center text-gray-300 italic font-medium">
             No recent financial activity found.
          </div>
        )}
      </div>
    </div>
  );
}
