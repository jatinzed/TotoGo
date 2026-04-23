import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Clock, IndianRupee, ChevronRight, X, Calendar, Filter, Map as MapIcon, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '../../../utils/format';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { parsePoint, toLatLngTuple } from '../../../utils/geo';
import { useRouting } from '../../../lib/maps/routing';

export default function RideManagement() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const { getRoute } = useRouting();

  useEffect(() => {
    fetchRides();
  }, [statusFilter]);

  const fetchRides = async () => {
    setLoading(true);
    let query = supabase
      .from('rides')
      .select('*, rider:users!rider_id(*), driver:users!driver_id(*)');

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query.order('requested_at', { ascending: false }).limit(100);
    setRides(data || []);
    setLoading(false);
  };

  const handleViewDetails = async (ride: any) => {
    setSelectedRide(ride);
    setRoute(null);
    if (ride.pickup_geometry && ride.dropoff_geometry) {
      const p = parsePoint(ride.pickup_geometry);
      const d = parsePoint(ride.dropoff_geometry);
      if (p && d) {
        const res = await getRoute(p, d);
        if (res) setRoute(res.primary);
      }
    }
  };

  const filteredRides = rides.filter(r => 
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.rider?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white border border-gray-100 p-2 rounded-2xl shadow-sm px-4">
            <Search className="text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full md:w-64" 
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-100 p-3 rounded-2xl text-xs font-bold focus:ring-0 shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Info</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Locations</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fare</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRides.map(ride => (
              <tr key={ride.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Rider: {ride.rider?.full_name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Driver: {ride.driver?.full_name || 'Unassigned'}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="max-w-[200px] space-y-1">
                    <p className="text-xs font-medium truncate">{ride.pickup_address}</p>
                    <p className="text-[10px] text-gray-400 font-bold truncate">To: {ride.dropoff_address}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <p className="font-black text-sm">{formatCurrency(ride.fare)}</p>
                </td>
                <td className="px-6 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    ride.status === 'completed' ? "bg-green-50 text-green-600" :
                    ride.status === 'cancelled' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {ride.status}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Calendar size={12} />
                    <span>{new Date(ride.requested_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <button 
                    onClick={() => handleViewDetails(ride)}
                    className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                  >
                    <MapIcon size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedRide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-4xl rounded-[40px] overflow-hidden flex flex-col h-[85vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black">Trip Journey: {selectedRide.id.slice(0,8)}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {new Date(selectedRide.requested_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedRide(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-2/3 h-[300px] lg:h-full relative border-r border-gray-100">
                  <MapContainer {...({center: toLatLngTuple(parsePoint(selectedRide.pickup_geometry)), zoom: 14, className: "w-full h-full"} as any)}>
                    <TileLayer {...({url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"} as any)} />
                    <Marker {...({position: toLatLngTuple(parsePoint(selectedRide.pickup_geometry))} as any)} />
                    <Marker {...({position: toLatLngTuple(parsePoint(selectedRide.dropoff_geometry))} as any)} />
                    {route && (
                      <Polyline {...({positions: route.geometry.coordinates.map((c: any) => [c[1], c[0]]), color: "#000", weight: 5} as any)} />
                    )}
                  </MapContainer>
                </div>
                <div className="lg:w-1/3 p-8 overflow-y-auto space-y-8 bg-gray-50/50">
                   <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Location Path</p>
                        <div className="space-y-6 relative ml-4">
                           <div className="absolute left-[-17px] top-2 bottom-2 w-0.5 bg-gray-200" />
                           <div className="relative">
                              <div className="absolute left-[-22px] top-1 w-3 h-3 bg-black rounded-full" />
                              <p className="text-sm font-bold leading-tight">{selectedRide.pickup_address}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Pickup</p>
                           </div>
                           <div className="relative">
                              <div className="absolute left-[-22px] top-1 w-3 h-3 bg-blue-500 rounded-full" />
                              <p className="text-sm font-bold leading-tight">{selectedRide.dropoff_address}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Dropoff</p>
                           </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                         <div className="p-4 bg-white rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fare</p>
                            <p className="text-xl font-black">{formatCurrency(selectedRide.fare)}</p>
                         </div>
                         <div className="p-4 bg-white rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-sm font-black text-blue-500 uppercase">{selectedRide.status}</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center space-x-3 p-4 bg-white rounded-3xl border border-gray-100">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden">
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRide.rider?.id}`} alt="Rider" />
                            </div>
                            <div>
                               <p className="text-xs font-black">{selectedRide.rider?.full_name}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rider</p>
                            </div>
                         </div>
                         {selectedRide.driver && (
                            <div className="flex items-center space-x-3 p-4 bg-white rounded-3xl border border-gray-100">
                               <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRide.driver?.id}`} alt="Driver" />
                               </div>
                               <div>
                                  <p className="text-xs font-black">{selectedRide.driver?.full_name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Driver</p>
                               </div>
                            </div>
                         )}
                      </div>

                      <button className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                         Force Cancel Trip
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
