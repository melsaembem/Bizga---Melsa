import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Store, Clock, CheckCircle, XCircle, AlertCircle, MessageCircle } from "lucide-react";
import { formatIDRCurrency } from "../lib/utils";
import QRCode from "react-qr-code";
import { motion } from "motion/react";

export default function Riwayat() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [selectedQris, setSelectedQris] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRiwayat() {
      const locallySavedStr = localStorage.getItem('guest_businesses') || '[]';
      const locallySaved = JSON.parse(locallySavedStr);

      if (locallySaved.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('id', locallySaved)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching riwayat:", error);
      } else {
        setBusinesses(data || []);
      }
      
      const { data: qrisData } = await supabase.from('settings').select('*').eq('id', 'qris_image').single();
      if (qrisData && qrisData.value?.url) {
        setQrisImage(qrisData.value.url);
      }
      
      setLoading(false);
    }

    fetchRiwayat();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F3D2B]"></div>
        <p className="mt-4 text-gray-500 font-medium">Memuat Riwayat...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#1F3D2B] mb-2">Riwayat Pendaftaran</h1>
        <p className="text-gray-500">Pantau status persetujuan usaha yang Anda daftarkan di sini.</p>
      </div>

      {businesses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
            <Store className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-2">Belum Ada Riwayat</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Anda belum pernah mendaftarkan usaha di perangkat ini. Yuk daftarkan usaha Anda sekarang!
          </p>
          <Link 
            to="/upload"
            className="px-8 py-3 bg-[#D4A373] text-white rounded-xl font-bold shadow-lg hover:bg-[#c29161] transition-all"
          >
            Daftarkan Usaha
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business, index) => (
            <motion.div 
              key={business.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border rounded-[24px] overflow-hidden shadow-sm flex flex-col"
            >
              <div className="relative aspect-video">
                <img 
                  src={business.photo_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"} 
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  {business.status === 'active' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 backdrop-blur text-white text-xs font-bold rounded-lg shadow-lg">
                      <CheckCircle className="w-3.5 h-3.5" /> Telah Tayang
                    </span>
                  )}
                  {business.status === 'awaiting_payment' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/90 backdrop-blur text-white text-xs font-bold rounded-lg shadow-lg">
                      <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran
                    </span>
                  )}
                  {business.status === 'pending' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 backdrop-blur text-white text-xs font-bold rounded-lg shadow-lg">
                      <Clock className="w-3.5 h-3.5" /> Menunggu Review Admin
                    </span>
                  )}
                  {business.status === 'rejected' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/90 backdrop-blur text-white text-xs font-bold rounded-lg shadow-lg">
                      <XCircle className="w-3.5 h-3.5" /> Ditolak / Revisi
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-widest w-fit mb-3">
                  {business.category}
                </div>
                <h3 className="font-bold text-lg text-[#1F3D2B] mb-2">{business.name}</h3>
                
                {business.status === 'rejected' && business.rejection_reason && (
                  <div className="mt-2 mb-4 p-3 bg-red-50 text-red-700/80 rounded-xl text-xs border border-red-100">
                    <span className="font-bold block">Alasan Admin:</span>
                    {business.rejection_reason}
                  </div>
                )}
                
                {business.status === 'awaiting_payment' && (
                  <div className="mt-4 mb-2 p-4 bg-blue-50 rounded-xl flex flex-col gap-4 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => setSelectedQris(`Pembayaran Katalog ${business.name}`)}
                        className="bg-white p-2 text-black rounded-lg shrink-0 shadow-sm flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                      >
                         {qrisImage ? (
                           <img src={qrisImage} alt="QRIS" className="w-[64px] h-[64px] object-cover" />
                         ) : (
                           <QRCode value={`Pembayaran Katalog ${business.name}`} size={64} />
                         )}
                      </button>
                      <div>
                        <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Pembayaran Awal
                        </p>
                        <p className="text-[10px] text-blue-700 leading-relaxed font-bold">
                          Pengajuan disetujui!
                        </p>
                        <p className="text-[10px] text-blue-700 leading-relaxed mt-1">
                          Scan QRIS ini untuk pembayaran awal katalog Anda. Setelah transfer, segera konfirmasi via WhatsApp.
                        </p>
                      </div>
                    </div>
                    <a 
                      href={`https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20ingin%20konfirmasi%20pembayaran%20awal%20katalog%20untuk%20usaha%20${business.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] text-white text-xs font-bold rounded-lg shadow hover:bg-[#1ebd5a] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Konfirmasi via WhatsApp
                    </a>
                  </div>
                )}

                {business.status === 'active' && 
                 Math.abs(new Date().getDate() - new Date(business.created_at).getDate()) <= 5 && 
                 (!business.last_payment_date || (new Date(business.last_payment_date).getMonth() !== new Date().getMonth() || new Date(business.last_payment_date).getFullYear() !== new Date().getFullYear())) && (
                  <div className="mt-4 mb-2 p-4 bg-amber-50 rounded-xl flex flex-col gap-4 border border-amber-200">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => setSelectedQris(`Pembayaran Katalog ${business.name}`)}
                        className="bg-white p-2 text-black rounded-lg shrink-0 shadow-sm flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                      >
                         {qrisImage ? (
                           <img src={qrisImage} alt="QRIS" className="w-[64px] h-[64px] object-cover" />
                         ) : (
                           <QRCode value={`Pembayaran Katalog ${business.name}`} size={64} />
                         )}
                      </button>
                      <div>
                        <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Tagihan Sewa Bulanan
                        </p>
                        <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                          Jatuh tempo setiap tanggal {new Date(business.created_at).getDate()}
                        </p>
                        <p className="text-[10px] text-amber-700 leading-relaxed mt-1">
                          Scan QRIS untuk pembayaran sewa jasa bulanan. Setelah bayar, konfirmasi Admin.
                        </p>
                      </div>
                    </div>
                    <a 
                      href={`https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20ingin%20konfirmasi%20pembayaran%20sewa%20bulanan%20katalog%20Bizga%20untuk%20usaha%20${business.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] text-white text-xs font-bold rounded-lg shadow hover:bg-[#1ebd5a] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Konfirmasi via WhatsApp
                    </a>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                  <button 
                    onClick={() => navigate(`/upload?edit=${business.id}`)} // Note: We might need to allow unauthenticated edits for their own items?
                    className="flex-1 py-2 text-center border-2 border-[#1F3D2B] text-[#1F3D2B] text-xs font-bold rounded-xl hover:bg-[#1F3D2B]/5 transition-colors"
                  >
                    Detail/Edit
                  </button>
                  {business.status === 'active' && (
                    <Link 
                      to={`/bisnis/${business.id}`}
                      className="flex-1 py-2 text-center bg-[#F5F5F5] text-[#1F3D2B] text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Lihat Tayang
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {selectedQris && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedQris(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-3xl p-6 flex flex-col items-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedQris(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-bold text-[#1F3D2B] mb-4">Scan QRIS</h3>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center p-4 border-2 border-gray-100">
               {qrisImage ? (
                 <img src={qrisImage} alt="QRIS" className="w-full h-full object-contain" />
               ) : (
                 <QRCode value={selectedQris} size={256} className="w-full h-full" />
               )}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Silakan scan QRIS di atas menggunakan aplikasi m-Banking atau e-Wallet Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
