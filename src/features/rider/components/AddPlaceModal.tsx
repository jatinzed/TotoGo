import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

interface AddPlaceModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPlaceModal({ userId, onClose, onSuccess }: AddPlaceModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (!name || !selectedCoords || !address) return;
    setSaving(true);
    try {
      const type = name.toLowerCase().includes('home') ? 'home' : (name.toLowerCase().includes('work') || name.toLowerCase().includes('office') ? 'office' : 'other');
      const { error } = await supabase.from('saved_places').insert({
        user_id: userId,
        name,
        address,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        type
      });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-[40px] p-8 relative flex flex-col max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400">
          <X size={20} />
        </button>

        <h3 className="text-2xl font-black mb-6">Add Saved Place</h3>

        <div className="space-y-4 overflow-y-auto pr-2 scrollbar-hide">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Place Name</label>
            <input 
              type="text" 
              placeholder="e.g. Home, My Office, Gym"
              className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:bg-white outline-none transition-all font-bold text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Address</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search location..."
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:bg-white outline-none transition-all font-bold text-sm"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={16} />}
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-[150px] overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100 p-2 space-y-1">
                {searchResults.map((r, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setAddress(r.display_name);
                      setSelectedCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
                      setSearchQuery(r.display_name);
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-3 hover:bg-white rounded-xl transition-all text-xs font-medium border border-transparent hover:border-gray-100"
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCoords && (
             <div className="p-4 bg-black text-white rounded-2xl flex items-center space-x-3">
                <MapPin size={18} />
                <p className="text-[10px] font-bold truncate">{address}</p>
             </div>
          )}

          <button 
            disabled={saving || !name || !selectedCoords}
            onClick={handleSave}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all disabled:opacity-30"
          >
            {saving ? 'Saving...' : 'Save Place'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
