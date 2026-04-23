import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/format';

export default function ComplaintsManagement() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    const { data } = await supabase.from('complaints').select('*, user:users(*)');
    setComplaints(data || []);
    setLoading(false);
  };

  const handleUpdateComplaint = async (complaintId: string, updates: any) => {
    const { error } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaintId);
    
    if (error) alert(error.message);
    else fetchComplaints();
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    
    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', complaintId);
    
    if (error) alert(error.message);
    else fetchComplaints();
  };

  return (
    <div className="space-y-6">
      {complaints.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] text-center border border-gray-100 italic text-gray-400">
            <MessageSquare className="mx-auto mb-4 opacity-10" size={64} />
            <p>No complaints reported yet.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {complaints.map(complaint => (
            <motion.div 
              key={complaint.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-[38px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex-grow space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {complaint.category}
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    complaint.priority === 'critical' ? 'bg-red-500 text-white' : 
                    complaint.priority === 'high' ? 'bg-orange-100 text-orange-600' : 
                    'bg-blue-50 text-blue-600'
                  )}>
                    {complaint.priority} Priority
                  </div>
                </div>
                
                <div>
                  <h4 className="font-black text-xl mb-1">{complaint.user?.full_name}</h4>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    {complaint.user_role} • {new Date(complaint.created_at).toLocaleString()}
                  </p>
                </div>

                <p className="text-gray-600 leading-relaxed bg-gray-50 p-5 rounded-3xl border border-gray-100 italic">
                  "{complaint.description}"
                </p>

                {complaint.ride_id && (
                  <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center hover:underline">
                    View Linked Ride Request <ChevronRight size={12} className="ml-1" />
                  </button>
                )}
              </div>

              <div className="md:w-64 space-y-4 shrink-0">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-2">Status</label>
                    <select 
                      value={complaint.status}
                      onChange={(e) => handleUpdateComplaint(complaint.id, { status: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl text-xs font-bold py-3 px-4 focus:ring-2 focus:ring-black"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-2">Priority</label>
                    <select 
                      value={complaint.priority}
                      onChange={(e) => handleUpdateComplaint(complaint.id, { priority: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl text-xs font-bold py-3 px-4 focus:ring-2 focus:ring-black"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <button 
                  onClick={() => handleDeleteComplaint(complaint.id)}
                  className="w-full mt-4 flex items-center justify-center space-x-2 py-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                  >
                    <Trash2 size={16} />
                    <span>Remove Case</span>
                  </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
