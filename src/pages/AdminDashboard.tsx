import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../App";
import { Business } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, ExternalLink, ShieldCheck, BarChart3, Users, Building2, Search, Edit, Share2, Archive, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { formatIDRCurrency, cn } from "../lib/utils";

export default function AdminDashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === 'melsaembem@gmail.com';

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [currentTab, setCurrentTab] = useState<'active' | 'pending' | 'awaiting_payment' | 'rejected' | 'archived' | 'settings'>('active');
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  // Custom states for modals (iframe friendly)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [notification, setNotification] = useState<{type: 'error' | 'success', message: string} | null>(null);

  if (!user) return <Navigate to="/login" />;
  if (!isSuperAdmin) return <Navigate to="/user/dashboard" />;

  useEffect(() => {
    async function fetchAll() {
      if (!user) return;
      setLoading(true);
      try {
        let query = supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        setBusinesses((data || []).map(item => ({
          ...item,
          status: item.status || 'active',
          photoURL: item.photo_url,
          ownerId: item.owner_id,
          reviewCount: item.review_count,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          jamBuka: item.jam_buka,
          jamTutup: item.jam_tutup,
          alamat: item.full_address,
          linkMaps: item.link_maps
        } as Business)));

        const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'qris_image').single();
        if (settingsData && settingsData.value?.url) {
          setQrisImage(settingsData.value.url);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleShare = async (business: Business) => {
    const shareData = {
      title: business.name,
      text: `Cek ${business.name} di Katalog Duren Sawit! ${business.category}`,
      url: `${window.location.origin}/bisnis/${business.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setNotification({ type: 'success', message: "Link berhasil disalin ke clipboard!" });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(b => b.id));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;

    setIsDeletingBulk(true);
    const idsToProcess = [...selectedIds];

    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .in('id', idsToProcess);

      if (error) {
        console.error("❌ Supabase Delete Error:", error);
        let friendlyMessage = error.message;
        if (error.code === '42501') {
          friendlyMessage = "Izin ditolak (RLS). Database tidak mengizinkan Anda menghapus data ini. Pastikan Anda adalah pemilik data atau memiliki hak akses Admin.";
        } else if (error.code === '23503') {
          friendlyMessage = "Gagal menghapus karena data ini masih terhubung dengan ulasan atau promo lain (Foreign Key Constraint).";
        }
        throw new Error(friendlyMessage);
      }

      setBusinesses(prev => prev.filter(b => !idsToProcess.includes(b.id)));
      setSelectedIds([]);
      setNotification({ type: 'success', message: `Berhasil menghapus ${count} usaha secara permanen.` });
    } catch (err: any) {
      console.error("🚨 Delete Process Failed:", err);
      setNotification({ type: 'error', message: `GAGAL MENGHAPUS:\n${err.message || "Terjadi kesalahan pada koneksi server"}` });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;

    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ status: 'archived' })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setBusinesses(prev => prev.map(b =>
        selectedIds.includes(b.id) ? { ...b, status: 'archived' } : b
      ));

      setSelectedIds([]);
      setNotification({ type: 'success', message: `Berhasil mengarsipkan data.` });
    } catch (err: any) {
      console.error("🚨 Detail Error Archive:", err);
      setNotification({ type: 'error', message: `Gagal mengarsipkan: ${err.message || "Terjadi kesalahan"}` });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkApproveToPayment = async () => {
    if (selectedIds.length === 0) return;

    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ status: 'awaiting_payment', rejection_reason: null })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setBusinesses(prev => prev.map(b =>
        selectedIds.includes(b.id) ? { ...b, status: 'awaiting_payment', rejection_reason: undefined } as any : b
      ));
      setSelectedIds([]);
      setNotification({ type: 'success', message: `Berhasil menyetujui ${selectedIds.length} data. Menunggu Pembayaran.` });
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) return;

    setIsDeletingBulk(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('businesses')
        .update({ last_payment_date: now })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setBusinesses(prev => prev.map(b =>
        selectedIds.includes(b.id) ? { ...b, last_payment_date: now } as any : b
      ));

      setSelectedIds([]);
      setNotification({ type: 'success', message: `Berhasil menandai ${selectedIds.length} data lunas tagihan bulan ini.` });
    } catch (err: any) {
      console.error("🚨 Detail Error Mark Paid:", err);
      let friendlyMessage = err.message || "Terjadi kesalahan saat memproses data.";
      setNotification({ type: 'error', message: friendlyMessage });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;

    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ status: 'active', rejection_reason: null })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setBusinesses(prev => prev.map(b =>
        selectedIds.includes(b.id) ? { ...b, status: 'active', rejection_reason: undefined } as any : b
      ));

      setSelectedIds([]);
      setNotification({ type: 'success', message: `Berhasil memulihkan/menyetujui data.` });
    } catch (err: any) {
      console.error("🚨 Detail Error Restore:", err);
      setNotification({ type: 'error', message: `Gagal memulihkan: ${err.message || "Terjadi kesalahan"}` });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;

    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ status: 'rejected', rejection_reason: rejectReason })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setBusinesses(prev => prev.map(b =>
        selectedIds.includes(b.id) ? { ...b, status: 'rejected', rejection_reason: rejectReason } as any : b
      ));

      setSelectedIds([]);
      setRejectReason("");
      setNotification({ type: 'success', message: `Berhasil menolak data.` });
    } catch (err: any) {
      console.error("🚨 Detail Error Reject:", err);
      setNotification({ type: 'error', message: `Gagal menolak: ${err.message || "Terjadi kesalahan"}` });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQris(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `qris/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;
      setQrisImage(url);

      const { error: dbError } = await supabase
        .from('settings')
        .upsert({ id: 'qris_image', value: { url } });

      if (dbError) throw dbError;

      setNotification({ type: 'success', message: "QRIS berhasil diperbarui." });
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: "Gagal upload QRIS: " + err.message });
    } finally {
      setIsUploadingQris(false);
    }
  };

  const filtered = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = b.status === currentTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#D4A373] mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Admin Control Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-[#1F3D2B]">
              Moderasi Katalog
            </h1>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <Link
            to="/upload"
            className="bg-[#1F3D2B] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-[#D4A373] transition-all flex items-center gap-2"
          >
            Tambah Usaha
          </Link>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari usaha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-[#1F3D2B]/10"
            />
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-black/5 flex items-center gap-4">
          <div className="p-3 bg-[#1F3D2B]/5 rounded-2xl text-[#1F3D2B]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              {isSuperAdmin ? "Total Aktif" : "Usaha Saya"}
            </p>
            <p className="text-2xl font-black text-[#1F3D2B]">{businesses.filter(b => b.status === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 flex items-center gap-4">
          <div className="p-3 bg-[#D4A373]/5 rounded-2xl text-[#D4A373]">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Total Arsip</p>
            <p className="text-2xl font-black text-[#1F3D2B]">
              {businesses.filter(b => b.status === 'archived').length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 flex items-center gap-4">
          <div className="p-3 bg-[#A7C4A0]/5 rounded-2xl text-[#A7C4A0]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Status Sistem</p>
            <p className="text-sm font-bold text-[#A7C4A0]">AKTIF & AMAN</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100 overflow-x-auto">
        <button
          onClick={() => { setCurrentTab('active'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'active'
              ? "text-[#1F3D2B] border-[#1F3D2B]"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Katalog Aktif
        </button>
        <button
          onClick={() => { setCurrentTab('pending'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'pending'
              ? "text-amber-500 border-amber-500"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Menunggu ({businesses.filter(b => b.status === "pending").length})
        </button>
        <button
          onClick={() => { setCurrentTab('awaiting_payment'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'awaiting_payment'
              ? "text-blue-500 border-blue-500"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Menunggu Pembayaran ({businesses.filter(b => b.status === "awaiting_payment").length})
        </button>
        <button
          onClick={() => { setCurrentTab('rejected'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'rejected'
              ? "text-red-500 border-red-500"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Ditolak
        </button>
        <button
          onClick={() => { setCurrentTab('archived'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'archived'
              ? "text-[#1F3D2B] border-[#1F3D2B]"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Arsip Usaha
        </button>
        <button
          onClick={() => { setCurrentTab('settings'); setSelectedIds([]); }}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
            currentTab === 'settings'
              ? "text-[#1F3D2B] border-[#1F3D2B]"
              : "text-gray-400 border-transparent hover:text-gray-600"
          )}
        >
          Pengaturan
        </button>
      </div>

      {/* Business List Table */}
      {currentTab !== 'settings' ? (
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F5F5] text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4 w-10">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#1F3D2B] focus:ring-[#1F3D2B] cursor-pointer"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th className="px-6 py-4">Usaha</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Lokasi</th>
                {currentTab === 'active' && <th className="px-6 py-4">Status Sewa</th>}
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((b) => {
                const now = new Date();
                const lastPayment = b.last_payment_date ? new Date(b.last_payment_date) : null;
                const isPaidThisMonth = lastPayment && lastPayment.getMonth() === now.getMonth() && lastPayment.getFullYear() === now.getFullYear();

                return (
                <tr key={b.id} className={cn("hover:bg-gray-50 transition-colors", selectedIds.includes(b.id) && "bg-[#F5F5F5]")}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#1F3D2B] focus:ring-[#1F3D2B]"
                      checked={selectedIds.includes(b.id)}
                      onChange={() => toggleSelect(b.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={b.photoURL} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold text-sm text-[#1F3D2B]">{b.name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] bg-[#F5F5F5] px-2 py-1 rounded-full font-bold text-gray-500">{b.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium">{b.whatsapp}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-[#1F3D2B]">{b.price || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium">RT {b.rt} / RW {b.rw}</p>
                  </td>
                  {currentTab === 'active' && (
                  <td className="px-6 py-4">
                    {isPaidThisMonth ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Lunas Bulan Ini</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Belum Lunas</span>
                    )}
                  </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleShare(b)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Bagikan"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/admin/edit/${b.id}`}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/bisnis/${b.id}`}
                        className="p-2 text-gray-400 hover:text-[#D4A373] transition-colors"
                        title="Lihat"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center text-gray-400 text-sm italic">
              Tidak ada data usaha ditemukan.
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-8 max-w-xl">
          <h2 className="text-xl font-bold text-[#1F3D2B] mb-6">Pengaturan Pembayaran (QRIS)</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload foto/gambar QRIS Admin. Gambar ini akan ditampilkan di halaman Riwayat pendafar untuk mereka melakukan pembayaran sewa bulanan.
            </p>
            
            {qrisImage && (
              <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={qrisImage} alt="QRIS" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="mt-4">
              <label className="inline-block">
                <span className="px-6 py-3 bg-[#D4A373] text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-[#c29161] transition-colors flex items-center justify-center">
                  {isUploadingQris ? "Mengupload..." : "Upload Gambar QRIS"}
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleQrisUpload} 
                  disabled={isUploadingQris}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1F3D2B] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-8 border border-white/10"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Terpilih</span>
              <span className="text-xl font-black">{selectedIds.length} Usaha</span>
            </div>

            <div className="h-8 w-px bg-white/10"></div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/5 transition-colors"
                disabled={isDeletingBulk}
              >
                Batal
              </button>

              <button
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isDeletingBulk}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingBulk ? "Menghapus..." : "Hapus"}
              </button>

              {currentTab === 'active' && (
                <>
                  <button
                    onClick={handleMarkPaid}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Tandai Lunas
                  </button>
                  <button
                    onClick={() => setIsConfirmingArchive(true)}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-[#A7C4A0] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#8da887] transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                    {isDeletingBulk ? "Mengarsipkan..." : "Arsipkan"}
                  </button>
                </>
              )}

              {currentTab === 'pending' && (
                <>
                  <button
                    onClick={handleBulkApproveToPayment}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Setujui (Tunggu Pembayaran)
                  </button>
                  <button
                    onClick={() => setIsConfirmingReject(true)}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak
                  </button>
                </>
              )}

              {currentTab === 'awaiting_payment' && (
                <>
                  <button
                    onClick={handleBulkRestore}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish (Pembayaran Diterima)
                  </button>
                  <button
                    onClick={() => setIsConfirmingReject(true)}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak Pembayaran
                  </button>
                </>
              )}

              {currentTab === 'rejected' && (
                <button
                  onClick={handleBulkRestore}
                  disabled={isDeletingBulk}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Pulihkan / Setujui
                </button>
              )}

              {currentTab === 'archived' && (
                <button
                  onClick={handleBulkRestore}
                  disabled={isDeletingBulk}
                  className="flex items-center gap-2 px-6 py-2 bg-[#D4A373] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#c49363] transition-all active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isDeletingBulk ? "Memulihkan..." : "Pulihkan"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* State Modals */}
      <AnimatePresence>
        {/* Reject Modal */}
        {isConfirmingReject && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-white/20"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center text-[#1F3D2B] mb-2">Tolak Pendaftaran?</h3>
              <p className="text-center text-gray-500 mb-6 text-sm leading-relaxed">
                Silakan berikan alasan penolakan agar pengguna bisa memperbaiki datanya.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Foto kurang jelas, deskripsi tidak lengkap..."
                className="w-full p-4 bg-gray-50 border-none rounded-2xl mb-8 focus:ring-2 focus:ring-[#1F3D2B]/10 text-sm resize-none h-24"
              ></textarea>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsConfirmingReject(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setIsConfirmingReject(false);
                    handleBulkReject();
                  }}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-lg"
                >
                  Tolak Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Custom Archive Modal */}
        {isConfirmingArchive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-white/20"
            >
              <div className="w-16 h-16 bg-[#A7C4A0]/20 text-[#A7C4A0] rounded-full flex items-center justify-center mx-auto mb-6">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center text-[#1F3D2B] mb-2">Arsipkan Data?</h3>
              <p className="text-center text-gray-500 mb-8 text-sm leading-relaxed">
                Yakin ingin mengarsipkan <b>{selectedIds.length} data</b>? Data akan dipindahkan ke tab Arsip dan tidak muncul di katalog publik.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsConfirmingArchive(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setIsConfirmingArchive(false);
                    handleBulkArchive();
                  }}
                  className="flex-1 px-4 py-3 bg-[#1F3D2B] text-white rounded-xl font-bold text-sm hover:bg-[#1F3D2B]/90 transition-colors shadow-lg"
                >
                  Ya, Arsipkan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Confirmation Modal */}
        {isConfirmingDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-white/20"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center text-[#1F3D2B] mb-2">Hapus Permanen?</h3>
              <p className="text-center text-gray-500 mb-8 text-sm leading-relaxed">
                Yakin ingin menghapus <b>{selectedIds.length} data</b> secara permanen? Data akan terhapus dari sistem sepenuhnya dan tidak bisa dibatalkan.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsConfirmingDelete(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    handleBulkAction();
                  }}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Global Notification Modal */}
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                notification.type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
              )}>
                {notification.type === 'success' ? <ShieldCheck className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6 rotate-180" />}
              </div>
              <h3 className="text-lg font-bold text-center text-[#1F3D2B] mb-2">
                {notification.type === 'success' ? "Berhasil" : "Pemberitahuan"}
              </h3>
              <p className="text-center text-gray-600 text-sm whitespace-pre-line mb-6">
                {notification.message}
              </p>
              <button 
                onClick={() => setNotification(null)}
                className="w-full px-4 py-3 bg-[#1F3D2B] text-white rounded-xl font-bold text-sm hover:bg-[#1F3D2B]/90 transition-colors"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}