import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Layout } from '../components/layout/Layout';

// Features
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import RiderHome from '../features/rider/components/Home';
import RideTracking from '../features/rider/components/RideTracking';
import RidesHistory from '../features/rider/components/History';
import WalletPage from '../features/rider/components/Wallet';
import ProfilePage from '../features/rider/components/Profile';
import RewardsPage from '../features/rider/components/Rewards';
import DriverHome from '../features/driver/components/Home';
import DriverEarnings from '../features/driver/components/Earnings';
import DriverDocuments from '../features/driver/components/DocumentUpload';
import AdminPanel from '../features/admin/components/AdminPanel';
import RoleSelection from '../features/onboarding/RoleSelection';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/welcome" element={<RoleSelection />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Rider Routes */}
      <Route path="/" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout><RiderHome /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ride/:id" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout showNav={false}><RideTracking /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout><RidesHistory /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout><WalletPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout><ProfilePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/rewards" element={
        <ProtectedRoute roles={['rider', 'admin']}>
          <Layout><RewardsPage /></Layout>
        </ProtectedRoute>
      } />
      
      {/* Driver Routes */}
      <Route path="/driver" element={
        <ProtectedRoute roles={['driver', 'admin']}>
          <Layout isDriver><DriverHome /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/driver/earnings" element={
        <ProtectedRoute roles={['driver', 'admin']}>
          <Layout isDriver><DriverEarnings /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/driver/documents" element={
        <ProtectedRoute roles={['driver', 'admin']}>
          <Layout isDriver><DriverDocuments /></Layout>
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
};
