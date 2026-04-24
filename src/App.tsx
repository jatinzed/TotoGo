import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuthStore } from './features/common/stores/authStore';
import { AppRouter } from './routes';
import { initOneSignal } from './lib/notifications/onesignal';
import { supabase } from './lib/supabase/client';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    initOneSignal();

    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        console.log('Supabase Connection test:', error ? error.message : 'Success', data);
      } catch (err) {
        console.error('Supabase Connection failure:', err);
      }
    };
    testConnection();
  }, []);

  return (
    <Router>
      <AppRouter />
    </Router>
  );
}
