import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { UserStreak, UserGoCoin } from '../../common/types';
import { motion } from 'motion/react';
import { Trophy, Flame, Coins, Medal, Star, ChevronRight, History } from 'lucide-react';
import { format } from 'date-fns';

export default function RewardsPage() {
  const { profile } = useAuthStore();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [goCoins, setGoCoins] = useState<UserGoCoin | null>(null);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchRewardsData();
  }, [profile]);

  const fetchRewardsData = async () => {
    const { data: sData } = await supabase.from('user_streaks').select('*').eq('user_id', profile!.id).single();
    const { data: cData } = await supabase.from('user_gocoins').select('*').eq('user_id', profile!.id).single();
    const { data: hData } = await supabase
      .from('gocoin_transactions')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });

    setStreak(sData);
    setGoCoins(cData);
    setCoinHistory(hData || []);
    setLoading(false);
  };

  const badges = [
    { name: 'On Fire', desc: 'Maintain a 3-day streak', icon: Flame, unlocked: (streak?.current_streak || 0) >= 3 },
    { name: 'Week Warrior', desc: '7-day streak milestone', icon: Medal, unlocked: (streak?.longest_streak || 0) >= 7 },
    { name: 'Loyal Rider', desc: '30-day ride challenge', icon: Trophy, unlocked: (streak?.longest_streak || 0) >= 30 },
    { name: 'Toto Elite', desc: 'Earn 100 GoCoins', icon: Star, unlocked: (goCoins?.balance || 0) >= 100 },
  ];

  return (
    <div className="p-6 space-y-10 pb-32">
       <header>
          <h1 className="text-2xl font-black">Rewards Hub</h1>
          <p className="text-gray-400 text-sm font-medium">Your loyalty pays off</p>
       </header>

       {/* Streak Card */}
       <div className="bg-black text-white p-8 rounded-[40px] relative overflow-hidden flex flex-col items-center">
          <div className="relative z-10 text-center">
             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Flame className={cn("transition-colors", (streak?.current_streak || 0) > 0 ? "text-white fill-white" : "text-white/20")} size={32} />
             </div>
             <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Streak</p>
             <h2 className="text-5xl font-black">{streak?.current_streak || 0} Days</h2>
             <p className="text-white/30 text-[10px] mt-4 font-bold uppercase tracking-widest leading-relaxed">
               Best: {streak?.longest_streak || 0} Days • Next reward in {7 - ((streak?.current_streak || 0) % 7)} days
             </p>
          </div>
          
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -left-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
       </div>

       {/* GoCoin Section */}
       <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">GoCoins Balance</h4>
             <span className="text-xs font-black text-black flex items-center cursor-pointer">
               <span className="mr-1 underline underline-offset-4">How to earn?</span>
               <ChevronRight size={12} />
             </span>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
             <div className="flex items-center space-x-4">
                <div className="p-4 bg-black rounded-2xl flex items-center justify-center border border-black text-white">
                   <Coins size={28} className="fill-current" />
                </div>
                <div>
                   <p className="text-3xl font-black">{goCoins?.balance || 0}</p>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Coins</p>
                </div>
             </div>
             <button className="bg-black text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Redeem Now</button>
          </div>
       </div>

       {/* Badges */}
       <div className="space-y-6">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Achievement Badges</h4>
          <div className="grid grid-cols-2 gap-4">
             {badges.map((badge, i) => (
                <div key={i} className={cn(
                  "p-5 rounded-[32px] border transition-all text-center flex flex-col items-center",
                  badge.unlocked ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-transparent opacity-60 grayscale"
                )}>
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center mb-3",
                     badge.unlocked ? "bg-black text-white" : "bg-white text-gray-300"
                   )}>
                      <badge.icon size={24} />
                   </div>
                   <p className="font-black text-sm mb-1">{badge.name}</p>
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">{badge.desc}</p>
                </div>
             ))}
          </div>
       </div>

       {/* GoCoin History */}
       <div className="space-y-6">
          <div className="flex items-center space-x-2 px-2">
             <History size={16} className="text-gray-300" />
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Coin History</h4>
          </div>
          {coinHistory.length === 0 ? (
             <div className="p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No coin history</p>
             </div>
          ) : (
             <div className="space-y-4">
                {coinHistory.map(tx => (
                   <div key={tx.id} className="flex justify-between items-center px-2">
                       <div>
                          <p className="text-sm font-bold">{tx.reason}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(tx.created_at), 'dd MMM yyyy')}</p>
                       </div>
                       <p className="font-black text-lg">
                         {tx.amount > 0 ? '+' : ''}{tx.amount}
                       </p>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
