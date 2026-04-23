import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useAuthStore } from '../../common/stores/authStore';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2, Camera, Loader2 } from 'lucide-react';

export default function DriverDocuments() {
  const { profile } = useAuthStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchDocuments();
  }, [profile]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', profile!.id);
    
    if (data) setDocs(data);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(type);
    try {
      const timestamp = Date.now();
      const path = `${profile.id}/${type}_${timestamp}.jpg`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('driver-docs')
        .upload(path, file);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: profile.id,
          document_type: type,
          file_url: path,
          verification_status: 'pending'
        });

      if (dbError) throw dbError;
      
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const documentTypes = [
    { id: 'license', label: 'Driving License', icon: FileText },
    { id: 'rc', label: 'Registration Certificate (RC)', icon: Camera },
    { id: 'insurance', label: 'Vehicle Insurance', icon: Shield },
    { id: 'pcc', label: 'Police Clearance (PCC)', icon: AlertCircle },
  ];

  return (
    <div className="p-6 space-y-8 pb-32">
       <header>
          <h1 className="text-2xl font-black">Verification</h1>
          <p className="text-gray-400 text-sm font-medium">Keep your documents up to date</p>
       </header>

       <div className="space-y-4">
          {documentTypes.map((docType) => {
             const existingDoc = docs.find(d => d.document_type === docType.id);
             
             return (
                <div key={docType.id} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                   <div className="flex items-center space-x-5">
                      <div className={cn(
                        "p-4 rounded-2xl flex items-center justify-center transition-all",
                        existingDoc?.verification_status === 'verified' ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                      )}>
                         <docType.icon size={24} />
                      </div>
                      <div className="flex-grow">
                         <h4 className="font-bold text-sm">{docType.label}</h4>
                         <div className="flex items-center mt-1">
                            {existingDoc ? (
                               <div className="flex items-center space-x-2">
                                  {existingDoc.verification_status === 'pending' && (
                                     <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Clock size={12} className="mr-1" />
                                        Pending Review
                                     </div>
                                  )}
                                  {existingDoc.verification_status === 'verified' && (
                                     <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-black">
                                        <CheckCircle2 size={12} className="mr-1" />
                                        Verified
                                     </div>
                                  )}
                                  {existingDoc.verification_status === 'rejected' && (
                                     <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-black/60">
                                        <AlertCircle size={12} className="mr-1" />
                                        Rejected
                                     </div>
                                  )}
                               </div>
                            ) : (
                               <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Missing Document</span>
                            )}
                         </div>
                      </div>
                      
                      {!existingDoc || existingDoc.verification_status === 'rejected' ? (
                          <label className="cursor-pointer">
                             <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleUpload(e, docType.id)}
                              disabled={uploading === docType.id}
                             />
                             <div className="p-3 bg-black text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-black/10">
                                {uploading === docType.id ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                             </div>
                          </label>
                      ) : (
                         <div className="p-3 bg-gray-50 text-black rounded-xl">
                            <CheckCircle2 size={18} />
                         </div>
                      )}
                   </div>
                </div>
             );
          })}
       </div>

       <div className="bg-gray-100 p-6 rounded-[32px] border border-gray-200">
          <h5 className="font-bold text-black text-sm mb-2">Need Help?</h5>
          <p className="text-gray-500 text-xs leading-relaxed">
            Standard verification takes 24-48 business hours. Ensure your photos are clear and not blurry.
          </p>
       </div>
    </div>
  );
}

function Shield({ size }: { size: number }) {
    return <FileText size={size} />;
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
