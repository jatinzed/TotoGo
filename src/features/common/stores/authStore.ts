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
  signUp: (email: string, password: string, fullName: string, phone: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
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

    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ profile: profile as UserProfile });
      await get().refreshBalance();
    }

    set({ loading: false, initialized: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null });
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ profile: profile as UserProfile });
        await get().refreshBalance();
      } else {
        set({ profile: null, walletBalance: 0 });
      }
    });
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

  signUp: async (email, password, fullName, phone, role) => {
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
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));
