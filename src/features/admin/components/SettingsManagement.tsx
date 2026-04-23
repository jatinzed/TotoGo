import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion } from 'motion/react';
import { Save, RefreshCcw, Info, ShieldCheck, Zap, Scissors, MapPin, Gauge } from 'lucide-react';

export default function SettingsManagement() {
  const [settings, setSettings] = useState({
    baseFare: 30,
    perKmRate: 15,
    commissionPct: 20,
    cancellationFeePct: 15,
    matchingRadius: 3,
    streakReward: 10,
    maintenanceMode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
     fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      
      if (data) setSettings(data);
    } catch (err) {
      console.warn("Settings table might not exist yet. Using defaults.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: 1, ...settings });
      
      if (error) throw error;
      alert('Settings updated successfully');
    } catch (err: any) {
      console.error(err);
      // If table doesn't exist, we might get an error here too
      alert('Error saving settings. Make sure the system_settings table exists.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-10">
        <div>
           <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-black text-white rounded-xl">
                 <Gauge size={20} />
              </div>
              <h3 className="text-xl font-black">Fare Configuration</h3>
           </div>
           <p className="text-gray-400 text-sm font-medium">Control the pricing dynamics of the platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Base Fare (₹)</label>
              <input 
                type="number"
                value={settings.baseFare}
                onChange={(e) => setSettings({...settings, baseFare: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Per KM Rate (₹)</label>
              <input 
                type="number"
                value={settings.perKmRate}
                onChange={(e) => setSettings({...settings, perKmRate: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Platform Commission (%)</label>
              <input 
                type="number"
                value={settings.commissionPct}
                onChange={(e) => setSettings({...settings, commissionPct: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cancellation Fee (%)</label>
              <input 
                type="number"
                value={settings.cancellationFeePct}
                onChange={(e) => setSettings({...settings, cancellationFeePct: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
              />
           </div>
        </div>

        <div className="pt-10 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div>
                 <div className="flex items-center space-x-3 mb-2">
                    <MapPin size={20} className="text-black" />
                    <h4 className="font-bold">Driver Matching Radius</h4>
                 </div>
                 <input 
                   type="range"
                   min="1"
                   max="10"
                   step="0.5"
                   value={settings.matchingRadius}
                   onChange={(e) => setSettings({...settings, matchingRadius: parseFloat(e.target.value)})}
                   className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                 />
                 <div className="flex justify-between mt-2 font-black text-[10px] uppercase tracking-widest text-gray-400">
                    <span>1 km</span>
                    <span className="text-black text-xs">{settings.matchingRadius} km</span>
                    <span>10 km</span>
                 </div>
              </div>

              <div>
                 <div className="flex items-center space-x-3 mb-2">
                    <Zap size={20} className="text-black" />
                    <h4 className="font-bold">7-Day Streak Reward</h4>
                 </div>
                 <div className="flex items-center space-x-4">
                    <input 
                      type="number"
                      value={settings.streakReward}
                      onChange={(e) => setSettings({...settings, streakReward: parseInt(e.target.value)})}
                      className="w-32 bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-black font-bold"
                    />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">GoCoins</span>
                 </div>
              </div>
           </div>

           <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 h-fit">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-3">
                    <ShieldCheck className="text-orange-500" />
                    <h4 className="font-black text-orange-900">Maintenance Mode</h4>
                 </div>
                 <button 
                  onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-all",
                    settings.maintenanceMode ? "bg-orange-500" : "bg-gray-200"
                  )}
                 >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-all",
                      settings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                    )} />
                 </button>
              </div>
              <p className="text-xs text-orange-700 leading-relaxed font-medium">
                 Enabling this will prevent all users from creating new trips and will display a maintenance message app-wide. Use only for system updates.
              </p>
           </div>
        </div>

        <div className="pt-6">
           <button 
             onClick={handleSave}
             disabled={saving}
             className="w-full py-5 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-xl shadow-black/10"
           >
             {saving ? <RefreshCcw className="animate-spin" /> : <Save size={20} />}
             <span>{saving ? 'Saving Changes...' : 'Save System Settings'}</span>
           </button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
