import { create } from 'zustand';
import { supabase } from '../../../lib/supabase/client';
import { UserProfile } from '../types';

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  walletBalance: number;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string, role: string, vehicleModel?: string, vehicleColor?: string) => Promise<any>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  walletBalance: 0,
  loading: true,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null });

    set({ loading: false, initialized: true });

    let walletSub: any = null;

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ user: session?.user ?? null });
      
      // Cleanup previous subscription if any
      if (walletSub) {
        supabase.removeChannel(walletSub);
        walletSub = null;
      }

      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ profile: profile as UserProfile });
        await get().refreshBalance();

        // Subscribe to wallet changes
        // Use a unique channel name to avoid "callbacks after subscribe" error
        const channelName = `user-wallet-${session.user.id}-${Date.now()}`;
        walletSub = supabase
          .channel(channelName)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'user_wallets', 
            filter: `user_id=eq.${session.user.id}` 
          }, () => {
            get().refreshBalance();
          })
          .subscribe();
      } else {
        set({ profile: null, walletBalance: 0 });
      }
    });
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (profile) set({ profile: profile as UserProfile });
  },

  refreshBalance: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const { data } = await supabase.rpc('get_wallet_balance', { p_user_id: userId });
    if (typeof data === 'number') {
      set({ walletBalance: data });
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, phone, role, vehicleModel, vehicleColor) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role
        }
      }
    });

    if (error) throw error;

    if (data.user && role === 'driver') {
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: data.user.id,
          vehicle_model: vehicleModel || '',
          vehicle_color: vehicleColor || '',
          vehicle_number: '', // Will be updated later
          online_status: false,
          is_busy: false,
          is_verified: false,
          verification_status: 'pending'
        });
      if (profileError) throw profileError;
    }

    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));
