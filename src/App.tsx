import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuthStore } from './features/common/stores/authStore';
import { AppRouter } from './routes';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <Router>
      <AppRouter />
    </Router>
  );
}
