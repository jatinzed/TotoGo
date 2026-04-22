import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Car, User, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/common/Logo';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-8 pb-12">
      <div className="flex-grow flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-12"
        >
          <Logo className="text-white w-32" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">Choose Your Journey</h1>
          <p className="text-white/50 text-lg">Are you joining us to ride or to drive?</p>
        </motion.div>

        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/signup?role=rider')}
            className="group bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center space-x-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <User size={32} />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-black mb-1">Rider</h3>
              <p className="text-white/40 text-sm">Request a ride and reach your destination safely.</p>
            </div>
            <ArrowRight size={24} className="text-white/20 group-hover:text-white transition-all" />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/signup?role=driver')}
            className="group bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center space-x-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <Car size={32} />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-black mb-1">Driver</h3>
              <p className="text-white/40 text-sm">Join our community of professionals and start earning.</p>
            </div>
            <ArrowRight size={24} className="text-white/20 group-hover:text-white transition-all" />
          </motion.div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-white/30 text-sm mb-4">Already have an account?</p>
        <button 
          onClick={() => navigate('/login')}
          className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
        >
          Sign In
        </button>
      </motion.div>
    </div>
  );
}
