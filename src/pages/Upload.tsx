import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../App";
import { CATEGORIES, Category, Business } from "../types";
import { generateAdCopy } from "../services/gemini";
import { Sparkles, Image as ImageIcon, Loader2, Send, ChevronLeft, Check, AlertCircle, Clock, Map as MapIcon, Globe, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";

export default function Upload() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [aiResult, setAiResult] = useState<{ fullCaption: string, wsStatus: string, hashtags: string[] } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    registrantName: "",
    registrantPhone: "",
    category: CATEGORIES[0] as Category,
    description: "",
    price: "",
    whatsapp: "",
    rt: "00",
    rw: "00",
    address: "",
    photoURL: "",
    jamBuka: "08:00",
    jamTutup: "20:00",
    alamat: "",
    patokan: "",
    linkMaps: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const dashboardPath = isAdmin ? "/admin/dashboard" : "/riwayat";

  useEffect(() => {
    async function fetchBusiness() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            name: data.name,
            registrantName: data.registrant_name || "",
            registrantPhone: data.registrant_phone || "",
            category: data.category as Category,
            description: data.description,
            price: data.price || "", 
            whatsapp: data.whatsapp,
            rt: data.rt || "00",
            rw: data.rw || "00",
            address: data.address || "",
            photoURL: data.photo_url || "",
            jamBuka: data.jam_buka || "08:00",
            jamTutup: data.jam_tutup || "20:00",
            alamat: data.full_address || "",
            patokan: data.patokan || "",
            linkMaps: data.link_maps || ""
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchBusiness();
  }, [id]);

  const handleGenerateAI = async () => {
    if (!formData.name || !formData.description) return;
    setAiLoading(true);
    setNotification(null);
    try {
      const result = await generateAdCopy({
        businessName: formData.name,
        category: formData.category,
        description: formData.description,
        price: formData.price,
        whatsapp: formData.whatsapp
      });
      setAiResult(result);
      setStep(3);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: "Gagal membuat caption AI. Pastikan API key sudah terpasang." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `business-photos/${fileName}`;

      // Try to upload to bucket 'images'. If it fails, suggest manual creation.
      const { error: uploadError, data } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.toLowerCase().includes('bucket not found') || uploadError.message.toLowerCase().includes('row-level security')) {
          throw new Error("STORAGE_SETUP_NEEDED");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error("Upload error:", err);
      if (err.message === "STORAGE_SETUP_NEEDED") {
        throw err;
      }
      throw new Error(err.message || "Gagal mengupload gambar.");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setNotification(null);
    try {
      let finalPhotoURL = formData.photoURL;

      if (imageFile) {
        setIsUploading(true);
        const uploadedURL = await uploadImage(imageFile);
        if (!uploadedURL) {
          setIsUploading(false);
          setLoading(false);
          return;
        }
        finalPhotoURL = uploadedURL;
        setIsUploading(false);
      }

      const businessData: any = {
        name: formData.name,
        category: formData.category,
        description: aiResult?.fullCaption || formData.description,
        whatsapp: formData.whatsapp,
        price: formData.price,
        owner_id: user?.id || null,
        registrant_name: formData.registrantName,
        registrant_phone: formData.registrantPhone,
        rt: formData.rt,
        rw: formData.rw,
        address: formData.address,
        full_address: formData.alamat,
        patokan: formData.patokan,
        jam_buka: formData.jamBuka,
        jam_tutup: formData.jamTutup,
        link_maps: formData.linkMaps,
        updated_at: new Date().toISOString(),
        photo_url: finalPhotoURL || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
      };

      if (!id) {
        // Only set status at creation
        businessData.status = isAdmin ? 'active' : 'pending';
      }

      if (id) {
        const { error } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', id);
        
        if (error) {
          console.error("Update error detail:", error);
          throw error;
        }
        setNotification({ type: 'success', message: "Berhasil memperbarui data katalog!" });
      } else {
        businessData.rating = 5;
        businessData.review_count = 0;
        businessData.created_at = new Date().toISOString();
        
        const { data: newBusiness, error } = await supabase
          .from('businesses')
          .insert([businessData])
          .select()
          .single();
        
        if (error) {
          console.error("Insert error detail:", error);
          throw error;
        }
        
        if (!user && newBusiness) {
          const locallySavedStr = localStorage.getItem('guest_businesses') || '[]';
          const locallySaved = JSON.parse(locallySavedStr);
          locallySaved.push(newBusiness.id);
          localStorage.setItem('guest_businesses', JSON.stringify(locallySaved));
        }

        setNotification({ type: 'success', message: "Berhasil menambahkan usaha!" });
      }
      
      setTimeout(() => navigate(user ? dashboardPath : "/riwayat"), 1500);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : (err?.message || JSON.stringify(err));
      
      if (errorMessage === "STORAGE_SETUP_NEEDED") {
        setNotification({ 
          type: 'error', 
          message: "Belum setup Supabase Storage! Anda belum membuat Bucket 'images' dan policynya.\n\nSilakan jalankan ulang perintah SQL dari file setup.sql di Supabase SQL Editor Anda." 
        });
      } else {
        setNotification({ type: 'error', message: `Gagal menyimpan usaha: ${errorMessage}` });
      }
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10 text-center relative">
        <button 
          onClick={() => navigate(user ? dashboardPath : "/")}
          className="absolute left-0 top-0 p-2 text-gray-400 hover:text-[#1F3D2B] transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        {!isAdmin && (
          <div className="mb-6 p-4 bg-[#D4A373]/10 border border-[#D4A373]/30 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-[#D4A373]">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-left text-sm text-[#5D4037]">
              <p className="font-bold mb-1">Ada pertanyaan tentang pendaftaran?</p>
              <p>Tim admin kami siap membantu. Hubungi WA: <strong>0812-3456-7890</strong> (Tanya-tanya gratis!)</p>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A373]/10 text-[#D4A373] rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-[#D4A373]/20">
          <Sparkles className="w-4 h-4" />
          {isAdmin ? "ADMIN PORTAL" : "PENDAFTARAN USAHA"}
        </div>
        <h1 className="text-3xl font-bold text-[#1F3D2B]">
          {id ? "Edit Data Usaha" : "Daftarkan Usaha Baru"}
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          {id ? "Perbarui informasi bisnis Anda di katalog" : (!isAdmin ? "Daftarkan agar usaha Anda masuk ke katalog utama Bizga (membutuhkan persetujuan admin)." : "Biar AI yang memikat calon pelanggan Anda dengan kata-kata elegan.")}
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-[#F5F5F5] h-2 w-full flex">
          <div className={`transition-all duration-500 h-full bg-[#1F3D2B] ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        <div className="p-8">
          <AnimatePresence>
            {notification && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "mb-6 p-4 rounded-xl text-xs font-bold flex items-center gap-2 border",
                  notification.type === 'success' ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                )}
              >
                {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {notification.message}
              </motion.div>
            )}
          </AnimatePresence>

  <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama Pendaftar / Pemilik</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi Santoso"
                      value={formData.registrantName}
                      onChange={(e) => setFormData({...formData, registrantName: e.target.value})}
                      className="w-full px-4 py-3 bg-amber-50 border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">No HP Pendaftar</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 081234567890"
                      value={formData.registrantPhone}
                      onChange={(e) => setFormData({...formData, registrantPhone: e.target.value})}
                      className="w-full px-4 py-3 bg-amber-50 border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alamat Lengkap</label>
                    <div className="relative">
                      <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="Contoh: Jl. Sudirman No 123"
                        value={formData.alamat}
                        onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Patokan / Keterangan Tepat (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Depan Masjid Al-Ikhlas, Samping Warung Bu Siti"
                      value={formData.patokan}
                      onChange={(e) => setFormData({...formData, patokan: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">RT</label>
                    <input type="text" value={formData.rt} onChange={(e) => setFormData({...formData, rt: e.target.value})} className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl text-center font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">RW</label>
                    <input type="text" value={formData.rw} onChange={(e) => setFormData({...formData, rw: e.target.value})} className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl text-center font-bold" />
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!formData.registrantName.trim() || !formData.registrantPhone.trim() || !formData.alamat.trim()}
                  className="w-full py-4 bg-[#D4A373] text-white font-bold rounded-2xl shadow-xl hover:bg-[#c29161] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-8"
                >
                  Selanjutnya (Info Usaha)
                </button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama Usaha/Jasa</label>
                    <input 
                      type="text" 
                      placeholder="Babi Guling Pak Nyoman"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Apa yang Anda Jual?</label>
                  <textarea 
                    placeholder="Contoh: Saya menjual nasi goreng dengan bumbu rempah asli, ada suwiran ayam dan kerupuk udang. Rasanya bikin nagih..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Harga / Range Harga</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Mulai Rp 15rb atau Rp 50.000"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nomor WhatsApp Usaha</label>
                    <input 
                      type="text" 
                      placeholder="628123456789"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Buka</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="time" 
                        value={formData.jamBuka} 
                        onChange={(e) => setFormData({...formData, jamBuka: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 bg-[#F5F5F5] border-none rounded-xl font-bold" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tutup</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="time" 
                        value={formData.jamTutup} 
                        onChange={(e) => setFormData({...formData, jamTutup: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 bg-[#F5F5F5] border-none rounded-xl font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link Google Maps (Opsional)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                      type="text" 
                      placeholder="https://maps.google.com/..."
                      value={formData.linkMaps}
                      onChange={(e) => setFormData({...formData, linkMaps: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-500 uppercase">Foto Produk</label>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      {/* File Upload Option */}
                      <div 
                        className="relative group cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-[#1F3D2B] transition-all bg-[#F5F5F5]/50 hover:bg-white text-center"
                        onClick={() => document.getElementById('imageInput')?.click()}
                      >
                        <input 
                          id="imageInput"
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2">
                           <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-[#1F3D2B] transition-colors" />
                           <p className="text-sm font-bold text-gray-500 group-hover:text-[#1F3D2B]">Klik atau Seret Foto ke sini</p>
                           <p className="text-[10px] text-gray-400">Pastikan format JPG, PNG, atau WEBP</p>
                        </div>
                      </div>

                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type="text" 
                          placeholder="Atau masukkan URL Gambar..."
                          value={formData.photoURL}
                          onChange={(e) => {
                            setFormData({...formData, photoURL: e.target.value});
                            if (e.target.value) {
                              setImageFile(null);
                              setImagePreview(null);
                            }
                          }}
                          className="w-full pl-12 pr-4 py-3 bg-[#F5F5F5] border-none rounded-xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium text-sm"
                        />
                      </div>
                    </div>
                    {(imagePreview || formData.photoURL) && (
                      <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden border-2 border-[#D4A373]/20 shrink-0 shadow-inner relative group">
                        <img 
                          src={imagePreview || formData.photoURL} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800")}
                        />
                        {(imagePreview || formData.photoURL) && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold uppercase">Preview</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-[#F5F5F5] text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Kembali
                  </button>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={aiLoading || !formData.name || !formData.description}
                    className="flex-[2] py-4 bg-[#1F3D2B] text-white font-bold rounded-2xl shadow-xl hover:bg-[#1F3D2B]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AI sedang berpikir...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-[#D4A373]" />
                        Buat Kata-Kata Promosi
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="bg-[#F5F5F5] p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-12 h-12 text-[#1F3D2B]" />
                  </div>
                  <h4 className="text-[10px] font-bold text-[#1F3D2B] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#D4A373] rounded-full animate-pulse"></span>
                    Caption Katalog (Otomatis AI)
                  </h4>
                  <div className="prose prose-sm text-[#1A1A1A] leading-relaxed italic">
                    <ReactMarkdown>{aiResult?.fullCaption || ""}</ReactMarkdown>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {aiResult?.hashtags.map(tag => (
                      <span key={tag} className="text-[10px] text-[#A7C4A0] font-bold">#{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-[#25D366]/20 relative">
                  <h4 className="text-[10px] font-bold text-[#25D366] uppercase tracking-widest mb-2 flex items-center gap-2">
                    Versi Status WhatsApp
                  </h4>
                  <p className="text-sm font-medium text-gray-600 line-clamp-3">
                    {aiResult?.wsStatus}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-[#F5F5F5] text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Kembali
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading || isUploading}
                    className="flex-[2] py-4 bg-[#1F3D2B] text-white font-bold rounded-2xl shadow-xl hover:bg-[#1F3D2B]/90 transition-all flex items-center justify-center gap-2"
                  >
                    {loading || isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isUploading ? "Mengupload Gambar..." : "Publish Katalog Sekarang"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
