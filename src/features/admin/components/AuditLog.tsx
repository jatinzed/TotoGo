import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { History, Search, Filter, Download, Calendar, User, Info } from 'lucide-react';
import { cn } from '../../../utils/format';

export default function AuditLog() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchAuditLogs();
  }, [typeFilter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('admin_actions')
      .select('*, admin:users!admin_id(full_name, email)');
    
    if (typeFilter !== 'all') {
      query = query.eq('action_type', typeFilter);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(100);
    setActions(data || []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Target ID', 'Details'];
    const rows = actions.map(a => [
      new Date(a.created_at).toLocaleString(),
      a.admin?.email,
      a.action_type,
      a.target_id,
      JSON.stringify(a.details)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-gray-100 p-3 rounded-2xl text-xs font-bold focus:ring-0 shadow-sm"
          >
            <option value="all">All Actions</option>
            <option value="verify_driver">Verify Driver</option>
            <option value="wallet_adjustment">Wallet Adjustment</option>
            <option value="force_cancel_ride">Force Cancel</option>
            <option value="update_settings">Settings Update</option>
            <option value="gocoin_adjustment">GoCoin Adjustment</option>
          </select>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-50 text-black border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrator</th>
              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {actions.map(action => (
              <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Calendar size={12} />
                    <span>{new Date(action.created_at).toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-[10px] font-black">
                      {action.admin?.full_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{action.admin?.full_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">{action.admin?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    action.action_type === 'force_cancel_ride' ? "bg-red-50 text-red-600" :
                    action.action_type === 'verify_driver' ? "bg-green-50 text-green-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {action.action_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-w-sm">
                      <pre className="text-[10px] font-mono whitespace-pre-wrap text-gray-600">
                        {JSON.stringify(action.details, null, 2)}
                      </pre>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {actions.length === 0 && !loading && (
          <div className="p-20 text-center">
            <History className="mx-auto mb-4 text-gray-200" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No audit logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
