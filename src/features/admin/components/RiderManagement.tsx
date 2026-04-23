import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion } from 'motion/react';
import { Search, Wallet, UserX, UserCheck, Shield, ChevronRight, Download, Filter, Car } from 'lucide-react';
import { cn, formatCurrency } from '../../../utils/format';

export default function RiderManagement() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    fetchRiders();
  }, [statusFilter]);

  const fetchRiders = async () => {
    setLoading(true);
    let query = supabase
      .from('users')
      .select('*, rides:rides!rider_id(count)')
      .eq('role', 'rider');

    if (statusFilter === 'active') query = query.eq('is_active', true);
    if (statusFilter === 'suspended') query = query.eq('is_active', false);

    const { data } = await query.order('created_at', { ascending: false });
    setRiders(data || []);
    setLoading(false);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) alert(error.message);
    else fetchRiders();
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Joined Date', 'Status'];
    const rows = riders.map(r => [
      r.full_name,
      r.email,
      r.phone,
      new Date(r.created_at).toLocaleDateString(),
      r.is_active ? 'Active' : 'Suspended'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `riders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRiders = riders.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white border border-gray-100 p-2 rounded-2xl shadow-sm px-4">
            <Search className="text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search riders..." 
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
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/10"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rider Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Trips</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRiders.map(rider => (
              <tr key={rider.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-300">
                      {rider.full_name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{rider.full_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{rider.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <p className="text-sm font-bold text-gray-600">{rider.phone}</p>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center space-x-1">
                    <Car size={14} className="text-gray-300" />
                    <p className="text-sm font-black">{rider.rides?.[0]?.count || 0}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    rider.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  )}>
                    {rider.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleToggleStatus(rider.id, rider.is_active)}
                      className={cn(
                        "p-2 rounded-xl transition-all shadow-sm",
                        rider.is_active ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" : "bg-green-50 text-green-500 hover:bg-green-500 hover:text-white"
                      )}
                      title={rider.is_active ? 'Suspend Account' : 'Activate Account'}
                    >
                      {rider.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRiders.length === 0 && (
          <div className="p-20 text-center text-gray-400 italic">
            No riders found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
