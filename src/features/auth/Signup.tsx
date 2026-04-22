import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../common/stores/authStore';
import { Logo } from '../../components/common/Logo';
import { cn } from '../../utils/format';
import { motion } from 'motion/react';
import { Car } from 'lucide-react';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'driver' ? 'driver' : 'rider';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'rider' | 'driver'>(initialRole);
  const [error, setError] = useState('');
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, fullName, phone, role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
           <Logo className="text-black w-48 mb-8" />
           <p className="mt-2 text-center text-sm text-gray-600 font-bold uppercase tracking-widest text-xs">Join our community</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-gray-100">
          {/* Role Selection */}
          <div className="flex p-1 bg-gray-50 rounded-2xl mb-8">
             <button 
              onClick={() => setRole('rider')}
              className={cn(
                "flex-grow py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                role === 'rider' ? "bg-black text-white shadow-lg" : "text-gray-400"
              )}
             >
                Join as Rider
             </button>
             <button 
              onClick={() => setRole('driver')}
              className={cn(
                "flex-grow py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                role === 'driver' ? "bg-black text-white shadow-lg" : "text-gray-400"
              )}
             >
                Join as Driver
             </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <div className="bg-black text-white p-3 rounded-xl text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-black focus:border-black sm:text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-black focus:border-black sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-black focus:border-black sm:text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-black focus:border-black sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Sign Up
              </motion.button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center space-x-2 text-sm">
            <span className="text-gray-500">Already have an account?</span>
            <Link to="/login" className="font-bold text-black hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
