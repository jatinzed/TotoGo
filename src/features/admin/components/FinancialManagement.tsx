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
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*, user:users(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      setTransactions(data || []);

      // Mock aggregated stats for now
      setStats({
        totalRevenue: 45000,
        driverPayouts: 32000,
        cancellationEarnings: 4500
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
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
                       {tx.type === 'credit' || tx.type === 'manual_adjustment' ? (
                         <ArrowDownLeft size={14} className="text-green-500" />
                       ) : (
                         <ArrowUpRight size={14} className="text-red-500" />
                       )}
                       <p className={cn(
                         "font-black text-sm",
                         tx.type === 'credit' || tx.type === 'manual_adjustment' ? "text-green-600" : "text-red-600"
                       )}>
                         {tx.type === 'credit' || tx.type === 'manual_adjustment' ? '+' : '-'}{formatCurrency(tx.amount / 100)}
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
