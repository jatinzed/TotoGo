import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { formatCurrency } from '../../../utils/format';
import { TrendingUp, Award, Calendar, DollarSign, ChevronRight, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format, startOfDay, startOfWeek } from 'date-fns';

export default function DriverEarnings() {
  const { profile, walletBalance, refreshBalance } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [earningsBreakdown, setEarningsBreakdown] = useState({
    rideEarnings: 0,
    cancellationCompensation: 0,
    total: 0
  });

  useEffect(() => {
    if (profile) {
      fetchEarnings();
      refreshBalance();
    }
  }, [profile]);

  const fetchEarnings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', profile!.id)
      .in('transaction_type', ['ride_earning', 'cancellation_compensation'])
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
      
      const breakdown = data.reduce((acc, tx) => {
        const amount = Math.abs(tx.amount);
        if (tx.transaction_type === 'ride_earning') acc.rideEarnings += amount;
        if (tx.transaction_type === 'cancellation_compensation') acc.cancellationCompensation += amount;
        acc.total += amount;
        return acc;
      }, { rideEarnings: 0, cancellationCompensation: 0, total: 0 });
      
      setEarningsBreakdown(breakdown);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-8 pb-32">
       <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-black">Earnings</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Financial Summary</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-2xl flex items-center space-x-2">
             <Wallet size={16} className="text-black" />
             <span className="font-black text-sm">{formatCurrency(walletBalance)}</span>
          </div>
       </header>

       {/* Main Stats Card */}
       <div className="bg-black text-white p-8 rounded-[40px] relative overflow-hidden shadow-2xl shadow-black/20">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Total Professional Income</p>
          <h2 className="text-4xl font-black tracking-tight">{formatCurrency(earningsBreakdown.total)}</h2>
          <TrendingUp className="absolute right-8 bottom-8 text-white/5" size={80} />
       </div>

       {/* Multi-tier Stats */}
       <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
             <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit mb-4">
                <ArrowUpRight size={18} />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ride Earnings</p>
             <p className="text-xl font-black text-black">{formatCurrency(earningsBreakdown.rideEarnings)}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-4">
                <Award size={18} />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cancellation</p>
             <p className="text-xl font-black text-black">{formatCurrency(earningsBreakdown.cancellationCompensation)}</p>
          </div>
       </div>

       {/* Detailed Breakdown/History */}
       <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
             <h4 className="text-lg font-black flex items-center">
                <Calendar className="mr-3 text-black" size={22} />
                Transaction History
             </h4>
          </div>

          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-[32px] animate-pulse" />)}
             </div>
          ) : transactions.length === 0 ? (
             <div className="p-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                <p className="text-gray-300 font-black text-[10px] uppercase tracking-widest">No earning events recorded</p>
             </div>
          ) : (
             <div className="space-y-4">
                {transactions.map(tx => (
                   <div key={tx.id} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-md transition-all">
                       <div className="flex items-center space-x-4">
                          <div className={cn(
                            "p-3 rounded-2xl",
                            tx.transaction_type === 'ride_earning' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                          )}>
                             {tx.transaction_type === 'ride_earning' ? <Car size={20} /> : <AlertCircle size={20} />}
                          </div>
                          <div>
                             <p className="font-black text-sm text-black">
                                {tx.transaction_type === 'ride_earning' ? 'Ride Earning' : 'Cancellation Compensation'}
                             </p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {format(new Date(tx.created_at), 'dd MMM, hh:mm a')}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-lg text-black">+{formatCurrency(Math.abs(tx.amount))}</p>
                          <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Settled</p>
                       </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
}

import { AlertCircle, Car } from 'lucide-react';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
