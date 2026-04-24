import React, { useState } from 'react';
import { useAuthStore } from '../../common/stores/authStore';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, LogOut, ChevronRight, Share2, Shield, Settings, Camera, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ComplaintForm from './ComplaintForm';

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const referralCode = profile?.id?.slice(0, 8).toUpperCase() || 'TOTO-GO';

  const handleShare = async () => {
    const text = `Join me on TotoGo! Use my code ${referralCode} for exclusive rewards. Download: https://totogo.app`;
    if (navigator.share) {
      await navigator.share({ title: 'Join TotoGo', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Referral link copied to clipboard!');
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <header className="flex items-center space-x-6 mb-10">
        <div className="relative group">
          <div className="w-24 h-24 bg-gray-200 rounded-[32px] overflow-hidden border-4 border-white shadow-xl relative">
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} alt="Avatar" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-all">
            <Camera size={16} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <div>
           <h1 className="text-2xl font-black">{profile?.full_name}</h1>
           <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">{profile?.role}</p>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
         {[
           { label: 'Ratings', val: '4.9', icon: '⭐' },
           { label: 'Trips', val: '128', icon: '🚗' },
           { label: 'Years', val: '2', icon: '📅' }
         ].map((stat, i) => (
           <div key={i} className="bg-gray-50 p-4 rounded-3xl flex flex-col items-center justify-center text-center">
              <span className="text-lg mb-1">{stat.icon}</span>
              <p className="font-black text-sm">{stat.val}</p>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
           </div>
         ))}
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Account Settings</h4>
        
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden divide-y divide-gray-50 shadow-sm">
           <div className="p-5 flex items-center space-x-4 hover:bg-gray-50 transition-colors cursor-pointer group">
              <Mail className="text-gray-400 group-hover:text-black" size={20} />
              <div className="flex-grow">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                 <p className="text-sm font-bold">{profile?.email}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
           </div>
           <div className="p-5 flex items-center space-x-4 hover:bg-gray-50 transition-colors cursor-pointer group">
              <Phone className="text-gray-400 group-hover:text-black" size={20} />
              <div className="flex-grow">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                 <p className="text-sm font-bold">{profile?.phone}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
           </div>
           <div className="p-5 flex items-center space-x-4 hover:bg-gray-50 transition-colors cursor-pointer group">
              <Shield className="text-gray-400 group-hover:text-black" size={20} />
              <div className="flex-grow">
                 <p className="text-sm font-bold">Privacy & Security</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
           </div>
           <div className="p-5 flex items-center space-x-4 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => setShowComplaintForm(true)}>
              <AlertCircle className="text-gray-400 group-hover:text-black" size={20} />
              <div className="flex-grow">
                 <p className="text-sm font-bold">File a Complaint</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Referrals</h4>
        <div className="bg-black p-6 rounded-[32px] text-white relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" onClick={handleShare}>
           <div className="relative z-10 flex justify-between items-center">
              <div>
                 <p className="font-black text-lg mb-1 text-white">Invite your friends</p>
                 <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Earn 10 GoCoins per referral</p>
              </div>
              <div className="bg-white/10 p-3 rounded-full">
                 <Share2 size={24} />
              </div>
           </div>
           <div className="mt-4 flex items-center space-x-2">
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 font-mono font-bold text-sm tracking-widest text-white">
                 {referralCode}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tap to share</span>
           </div>
        </div>
      </div>

      {(profile?.role === 'driver' || profile?.role === 'admin') && (
        <button 
          onClick={() => navigate('/driver')}
          className="w-full py-5 bg-green-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-green-700 transition-all mb-4"
        >
          <Car size={16} />
          <span>Go to Driver Mode</span>
        </button>
      )}
      
      {(profile?.email === 'comrade.jotinmoy.010@proton.me' || profile?.role === 'admin') && (
        <button 
          onClick={() => navigate('/admin')}
          className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all mb-4"
        >
          <Shield size={16} />
          <span>Go to Admin Panel</span>
        </button>
      )}

      <button 
        onClick={handleSignOut}
        className="w-full py-5 bg-black text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-gray-900 transition-all mb-10"
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>

      <AnimatePresence>
        {showComplaintForm && (
          <ComplaintForm onClose={() => setShowComplaintForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
