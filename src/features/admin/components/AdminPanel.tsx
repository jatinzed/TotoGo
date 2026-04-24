import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Car, AlertCircle, Check, X, Shield, Search, Wallet, 
  Loader2, ArrowLeft, Trash2, MessageSquare, LayoutDashboard, 
  Settings, History, IndianRupee, Map as MapIcon, LogOut, Navigation
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../../components/common/Logo';
import { cn } from '../../../utils/format';

// Sub-components
import DashboardStats from './DashboardStats';
import DriverManagement from './DriverManagement';
import RiderManagement from './RiderManagement';
import RideManagement from './RideManagement';
import ComplaintsManagement from './ComplaintsManagement';
import FinancialManagement from './FinancialManagement';
import MarketingManagement from './MarketingManagement';
import SettingsManagement from './SettingsManagement';
import LiveDriverMap from './LiveDriverMap';
import AuditLog from './AuditLog';

type AdminTab = 'dashboard' | 'drivers' | 'riders' | 'rides' | 'complaints' | 'finance' | 'marketing' | 'settings' | 'audit' | 'map';

export default function AdminPanel() {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Verification
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!profile) return;
    if (!isAdmin) {
       navigate('/');
       return;
    }
  }, [profile]);

  // Shared state for modals
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<any>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  const viewDocuments = async (driver: any) => {
    setSelectedDriverForDocs(driver);
    setLoadingDocs(true);
    const urls: Record<string, string> = {};
    
    for (const doc of driver.documents || []) {
       if (doc.file_url) {
          const { data } = await supabase.storage
            .from('driver-docs')
            .createSignedUrl(doc.file_url, 3600);
          if (data) urls[doc.id] = data.signedUrl;
       }
    }
    
    setDocUrls(urls);
    setLoadingDocs(false);
  };

  const handleVerifyDriverInModal = async (userId: string, isVerified: boolean) => {
     const { error } = await supabase
       .from('driver_profiles')
       .update({ is_verified: isVerified, verification_status: isVerified ? 'verified' : 'rejected' })
       .eq('user_id', userId);

     if (!error) {
       setSelectedDriverForDocs(null);
       // We'd ideally want to refresh the DriverManagement list here,
       // but for simplicity we'll just close the modal.
       alert('Driver status updated');
     } else {
       alert(error.message);
     }
  };

  if (!isAdmin) return null;

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'drivers', label: 'Drivers', icon: SteerIcon },
    { id: 'riders', label: 'Riders', icon: Users },
    { id: 'rides', label: 'Trips', icon: Car },
    { id: 'complaints', label: 'Support', icon: MessageSquare },
    { id: 'finance', label: 'Earnings', icon: IndianRupee },
    { id: 'marketing', label: 'Marketing', icon: Zap },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Logs', icon: History },
  ];

  function Zap({ size, className }: any) {
    return <AlertCircle size={size} className={className} />; // Placeholder icon if Zap not imported
  }

  function SteerIcon({ size, className }: any) {
    return <Navigation size={size} className={cn("rotate-45", className)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-72 bg-black text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-12">
           <div className="flex items-center space-x-3">
              <Logo className="h-6 text-white" />
              <div className="h-6 w-px bg-white/20" />
              <span className="text-sm font-black tracking-widest uppercase">Admin</span>
           </div>
           <button 
             onClick={() => navigate('/')}
             className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
           >
              <ArrowLeft size={18} />
           </button>
        </div>

        <nav className="space-y-1.5 flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {NAV_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "w-full flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold transition-all group relative",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={18} className={cn(activeTab === tab.id ? "text-black" : "text-white/20 group-hover:text-white")} />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="active-pill" className="absolute right-4 w-1.5 h-1.5 bg-black rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
           <div className="flex items-center space-x-3 px-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-white/30">
                 {profile?.full_name?.[0]}
              </div>
              <div className="flex-grow min-w-0">
                 <p className="text-xs font-black truncate">{profile?.full_name}</p>
                 <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest truncate">{profile?.email}</p>
              </div>
           </div>
           <button 
            onClick={signOut}
            className="w-full flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all"
           >
              <LogOut size={18} />
              <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-10 overflow-y-auto bg-gray-50/50">
        <header className="mb-12">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">Management Portal</p>
           <h2 className="text-4xl font-black capitalize tracking-tight text-gray-900">{activeTab.replace('_', ' ')}</h2>
        </header>

        <div className="min-h-[600px]">
           <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                 {activeTab === 'dashboard' && <DashboardStats />}
                 {activeTab === 'drivers' && <DriverManagement onViewDocs={viewDocuments} />}
                 {activeTab === 'riders' && <RiderManagement />}
                 {activeTab === 'rides' && <RideManagement />}
                 {activeTab === 'complaints' && <ComplaintsManagement />}
                 {activeTab === 'finance' && <FinancialManagement />}
                 {activeTab === 'marketing' && <MarketingManagement />}
                 {activeTab === 'settings' && <SettingsManagement />}
                 {activeTab === 'audit' && <AuditLog />}
                 {activeTab === 'map' && <LiveDriverMap />}
              </motion.div>
           </AnimatePresence>
        </div>
      </main>

      {/* Document Preview Modal */}
      <AnimatePresence>
         {selectedDriverForDocs && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-6"
            >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden flex flex-col max-h-[90vh]"
               >
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                     <div>
                        <h3 className="text-2xl font-black">{selectedDriverForDocs.user?.full_name}'s Documents</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{selectedDriverForDocs.vehicle_number} • {selectedDriverForDocs.vehicle_model}</p>
                     </div>
                     <button onClick={() => setSelectedDriverForDocs(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                        <X size={24} />
                     </button>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto p-8 space-y-8">
                     {loadingDocs ? (
                        <div className="flex flex-col items-center justify-center py-20">
                           <Loader2 className="animate-spin text-gray-200 mb-4" size={48} />
                           <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Generating Secure Links...</p>
                        </div>
                     ) : selectedDriverForDocs.documents?.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                           <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No documents uploaded</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 gap-8">
                           {selectedDriverForDocs.documents?.map((doc: any) => (
                              <div key={doc.id} className="space-y-3">
                                 <div className="flex items-center justify-between px-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{doc.document_type.replace('_', ' ')}</p>
                                    <a 
                                     href={docUrls[doc.id]} 
                                     target="_blank" 
                                     referrerPolicy="no-referrer"
                                     className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                                    >
                                       Open Full View
                                    </a>
                                 </div>
                                 <div className="bg-gray-100 rounded-[32px] overflow-hidden border border-gray-200">
                                    <img 
                                     src={docUrls[doc.id]} 
                                     alt={doc.document_type} 
                                     className="w-full h-auto object-contain max-h-[400px]"
                                     referrerPolicy="no-referrer"
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <div className="p-8 bg-gray-50 flex space-x-4">
                     <button 
                       onClick={() => handleVerifyDriverInModal(selectedDriverForDocs.user_id, true)}
                       className="flex-grow py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all"
                     >
                        Approve Driver
                     </button>
                     <button 
                       onClick={() => handleVerifyDriverInModal(selectedDriverForDocs.user_id, false)}
                       className="flex-grow py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all"
                     >
                        Reject
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
