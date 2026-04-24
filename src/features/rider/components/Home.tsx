import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, History, Star, Flame, ChevronRight, Gavel, Home, X, Plus, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../common/stores/authStore';
import { supabase } from '../../../lib/supabase/client';
import { UserStreak, UserGoCoin } from '../../common/types';
import MapPicker from '../../../components/maps/MapPicker';
import AddPlaceModal from './AddPlaceModal';

export default function RiderHome() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [goCoins, setGoCoins] = useState<UserGoCoin | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [initialPickup, setInitialPickup] = useState<any>(null);
  const [initialDropoff, setInitialDropoff] = useState<any>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchUserStats();
      fetchSavedPlaces();
      fetchMaintenance();
    }
  }, [profile]);

  const fetchMaintenance = async () => {
    const { data } = await supabase.from('system_settings').select('maintenance_mode').single();
    if (data) setMaintenanceMode(data.maintenance_mode);
  };

  const fetchUserStats = async () => {
    try {
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
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const fetchSavedPlaces = async () => {
    const { data } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', profile!.id);
    setSavedPlaces(data || []);
  };

  const handleSelectSavedPlace = (place: any) => {
    setInitialDropoff(place);
    setShowMapPicker(true);
  };

  const referralCode = profile 
    ? (profile.full_name ? profile.full_name.split(' ')[0].toUpperCase() : 'USER') + profile.id.slice(0, 4).toUpperCase()
    : 'TOTOGO';

  return (
    <div className="p-6 space-y-8">
      {maintenanceMode && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-500 text-white p-4 rounded-2xl flex items-center space-x-3 shadow-lg shadow-orange-200"
        >
          <Gavel size={20} className="shrink-0" />
          <p className="text-xs font-black uppercase tracking-widest leading-tight">
            System Maintenance: New bookings are currently disabled.
          </p>
        </motion.div>
      )}
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {profile?.full_name?.split(' ')[0] || 'Guest'}!</h1>
          <p className="text-gray-500 text-sm">Where are you heading today?</p>
        </div>
        <div className="flex items-center space-x-2">
          {(profile?.role === 'driver' || profile?.role === 'admin') && (
            <button 
              onClick={() => navigate('/driver')}
              className="p-2 bg-black text-white rounded-full hover:bg-gray-900 transition-colors shadow-lg"
              title="Switch to Driver Mode"
            >
              <Car size={20} />
            </button>
          )}
          {profile?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
              title="Admin Panel"
            >
              <Shield size={20} />
            </button>
          )}
        </div>
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

      {/* Refer & Earn Banner */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setShowReferralModal(true)}
        className="bg-yellow-400 p-6 rounded-3xl cursor-pointer relative overflow-hidden shadow-lg group active:scale-[0.98] transition-all"
      >
        <div className="relative z-10">
          <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-1">Limited Offer</p>
          <h3 className="text-xl font-black text-black mb-1">Refer & Earn 10 GoCoins</h3>
          <p className="text-black/80 text-xs font-medium">Give 5, Get 10 for every new user!</p>
          
          <div className="mt-4 inline-flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-xl">
             <span className="font-mono font-bold text-sm">{referralCode}</span>
             <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        
        <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
           <Flame size={120} className="fill-current -mb-8 -mr-8" />
        </div>
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

      {/* Saved Places */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h4 className="font-black text-lg">Saved Places</h4>
          <button 
            onClick={() => setShowAddPlaceModal(true)}
            className="p-2 bg-gray-100 rounded-full text-black hover:bg-black hover:text-white transition-all shadow-sm"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {savedPlaces.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No saved places yet</p>
            </div>
          ) : (
            savedPlaces.map((place) => (
              <div 
                key={place.id}
                onClick={() => handleSelectSavedPlace(place)}
                className="flex items-center space-x-4 group cursor-pointer"
              >
                <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                  {place.type === 'home' ? <Home size={20} /> : (place.type === 'office' ? <Briefcase size={20} /> : <MapPin size={20} />)}
                </div>
                <div className="flex-grow border-b border-gray-50 pb-4">
                  <p className="font-bold text-sm">{place.name}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{place.address}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Referral Modal */}
      <AnimatePresence>
        {showReferralModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 relative"
            >
              <button 
                onClick={() => setShowReferralModal(false)}
                className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                 <div className="w-20 h-20 bg-yellow-100 rounded-3xl mx-auto flex items-center justify-center mb-6">
                    <Flame size={40} className="text-yellow-600 fill-current" />
                 </div>
                 <h3 className="text-2xl font-black mb-2">Spread the Word</h3>
                 <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">
                    Share your referral code with friends. When they complete their first ride, you get 10 GoCoins and they get 5!
                 </p>
                 
                 <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-8">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Your Unique Code</p>
                    <p className="text-3xl font-mono font-black tracking-tighter text-black select-all">{referralCode}</p>
                 </div>
                 
                 <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Hey! Use my code ${referralCode} on TotoGo to get 5 GoCoins on your first ride!`);
                    alert('Referral text copied to clipboard!');
                  }}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 transition-all active:scale-95"
                 >
                   Copy Invite Link
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <MapPicker 
            onClose={() => {
              setShowMapPicker(false);
              setInitialPickup(null);
              setInitialDropoff(null);
            }} 
            initialPickup={initialPickup}
            initialDropoff={initialDropoff}
          />
        )}
      </AnimatePresence>

      {/* Add Place Modal */}
      <AnimatePresence>
        {showAddPlaceModal && (
          <AddPlaceModal 
            userId={profile!.id}
            onClose={() => setShowAddPlaceModal(false)}
            onSuccess={() => {
              setShowAddPlaceModal(false);
              fetchSavedPlaces();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
