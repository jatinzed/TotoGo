import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';

interface ComplaintFormProps {
  onClose: () => void;
}

export default function ComplaintForm({ onClose }: ComplaintFormProps) {
  const { profile } = useAuthStore();
  const [category, setCategory] = useState('Safety');
  const [description, setDescription] = useState('');
  const [pastRides, setPastRides] = useState<any[]>([]);
  const [selectedRideId, setSelectedRideId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingRides, setFetchingRides] = useState(true);

  useEffect(() => {
    async function fetchRecentRides() {
      if (!profile) return;
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('rider_id', profile.id)
        .order('requested_at', { ascending: false })
        .limit(10);
      setPastRides(data || []);
      setFetchingRides(false);
    }
    fetchRecentRides();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('complaints').insert({
        user_id: profile.id,
        user_role: profile.role,
        complaint_type: category,
        description,
        ride_id: selectedRideId || null,
        status: 'open',
        priority: 'medium'
      });

      if (error) throw error;
      alert('Complaint submitted successfully');
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error submitting complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1500] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black">File a Complaint</h3>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">We take your safety seriously</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-bold"
            >
              {['Driver behavior', 'Ride issue', 'Payment', 'Safety', 'Other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Related Ride (Optional)</label>
            <select
              value={selectedRideId}
              onChange={(e) => setSelectedRideId(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-sm font-medium"
              disabled={fetchingRides}
            >
              <option value="">No specific ride</option>
              {pastRides.map(ride => (
                <option key={ride.id} value={ride.id}>
                  {new Date(ride.requested_at).toLocaleDateString()} - {ride.pickup_address.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell us what happened..."
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all resize-none font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-xl shadow-black/10"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <Send size={18} />
                <span>Submit Complaint</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
