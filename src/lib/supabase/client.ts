import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnnejcmhhbixvyndgyas.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubmVqY21oaGJpeHZ5bmRneWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjcxMDgsImV4cCI6MjA5MjM0MzEwOH0.A00b4Q_1aT4_nMjjNhogytat8E4s8nJkceR2VZuEv9Y';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
