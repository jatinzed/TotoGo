import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, History, Star, Flame, ChevronRight, Gavel, Home } from 'lucide-react';
import { useAuthStore } from '../../common/stores/authStore';
import { supabase } from '../../../lib/supabase/client';
import { UserStreak, UserGoCoin } from '../../common/types';
import MapPicker from '../../../components/maps/MapPicker';

export default function RiderHome() {
  const { profile } = useAuthStore();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [goCoins, setGoCoins] = useState<UserGoCoin | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      fetchUserStats();
    }
  }, [profile]);

  const fetchUserStats = async () => {
    const { data: streakData } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', profile!.id)
      .single();
    
    const { data: coinData } = await supabase
      .from('user_gocoins')
      .select('*')
      .eq('user_id', profile!.id)
      .single();

    setStreak(streakData);
    setGoCoins(coinData);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm">Where are you heading today?</p>
        </div>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Gavel size={20} />
          </button>
        )}
      </header>

      {/* Streak & Reward Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black text-white p-6 rounded-3xl relative overflow-hidden shadow-xl"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Flame className="text-white fill-white" size={20} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">7-Day Streak Goal</span>
        </div>
        <h3 className="text-2xl font-bold mb-1">{streak?.current_streak || 0}/7 Days</h3>
        <p className="text-white/60 text-xs">Reach 7 days to earn 5 GoCoins!</p>
        
        {/* Progress Bar */}
        <div className="mt-4 h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(((streak?.current_streak || 0) / 7) * 100, 100)}%` }}
            className="h-full bg-white"
          />
        </div>

        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Booking Search Trigger */}
      <div 
        onClick={() => setShowMapPicker(true)}
        className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center space-x-4 cursor-pointer hover:border-gray-300 transition-all active:scale-[0.98]"
      >
        <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
          <Search size={22} />
        </div>
        <div className="flex-grow">
          <p className="text-gray-400 font-medium">Where to?</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex items-center space-x-1 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
           <MapPin size={16} />
           <span className="text-xs font-bold text-black">Map</span>
        </div>
      </div>

      {/* Recent Rides Quick List */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h4 className="font-bold text-lg">Saved Places</h4>
          <button className="text-xs font-bold text-gray-400 hover:text-black">Edit</button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-100 group-hover:text-black transition-colors">
              <Home size={20} />
            </div>
            <div className="flex-grow border-b border-gray-50 pb-4">
              <p className="font-bold text-sm">Home</p>
              <p className="text-xs text-gray-400">123 Green Valley, Downtown</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-100 group-hover:text-black transition-colors">
              <Navigation size={20} />
            </div>
            <div className="flex-grow border-b border-gray-50 pb-4">
              <p className="font-bold text-sm">Office</p>
              <p className="text-xs text-gray-400">Hub 7, Tech Park</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <MapPicker onClose={() => setShowMapPicker(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
