import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { useAuthStore } from '../../features/common/stores/authStore';
import { Bell, CheckSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/format';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    const channelName = `user-notifications-${profile.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${profile.id}` 
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile!.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white hover:bg-gray-50 rounded-2xl shadow-sm border border-gray-100 relative transition-all active:scale-95"
      >
        <Bell size={20} className={cn(unreadCount > 0 ? "animate-[swing_2s_infinite]" : "text-gray-400")} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-black text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black flex items-center space-x-1"
                >
                  <CheckSquare size={12} />
                  <span>Mark All</span>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-gray-400 text-xs font-bold italic">All quiet for now...</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={cn(
                        "p-4 transition-colors cursor-pointer hover:bg-gray-50",
                        !n.is_read && "bg-blue-50/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn("text-sm transition-all", n.is_read ? "font-medium text-gray-600" : "font-black text-black")}>
                          {n.title}
                        </p>
                        {!n.is_read && <div className="w-2 h-2 bg-black rounded-full mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed mb-2">{n.body}</p>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
