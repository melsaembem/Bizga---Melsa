import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Business, Review } from "../types";
import { MessageCircle, MapPin, Star, Clock, ChevronLeft, Share2, ShieldCheck, Navigation, Send, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatIDRCurrency, cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import { isBusinessOpen } from "../lib/businessUtils";
import { useAuth } from "../App";

export default function BusinessDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review form state
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: "",
    userName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (data) {
          setBusiness({ 
            ...data,
            photoURL: data.photo_url,
            ownerId: data.owner_id,
            reviewCount: data.review_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            jamBuka: data.jam_buka,
            jamTutup: data.jam_tutup,
            alamat: data.full_address,
            linkMaps: data.link_maps
          } as Business);
          
          // Fetch reviews placeholder (if table exists)
          const { data: revData } = await supabase
            .from('reviews')
            .select('*')
            .eq('business_id', id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (revData) {
            setReviews(revData.map(r => ({
              ...r,
              businessId: r.business_id,
              userId: r.user_id,
              userName: r.user_name,
              createdAt: r.created_at
            } as Review)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !business) return;
    if (!newReview.comment.trim() || !newReview.userName.trim()) {
      alert("Mohon isi nama dan ulasan Anda.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        business_id: id,
        user_name: newReview.userName,
        rating: newReview.rating,
        comment: newReview.comment,
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      };

      const { data: insertedData, error } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();

      if (error) throw error;

      // Update business rating & count (Optional/Graceful if fail)
      try {
        const newCount = (business.reviewCount || 0) + 1;
        const newRating = ((business.rating * (business.reviewCount || 0)) + newReview.rating) / newCount;

        await supabase
          .from('businesses')
          .update({ 
            rating: Number(newRating.toFixed(1)), 
            review_count: newCount 
          })
          .eq('id', id);

        setBusiness({
          ...business,
          rating: Number(newRating.toFixed(1)),
          reviewCount: newCount
        });
      } catch (e) {
        console.warn("Could not update business stats, likely RLS restriction.", e);
      }

      // Add to local state immediately
      const addedReview: Review = {
        id: insertedData?.id || Math.random().toString(),
        businessId: id,
        userName: newReview.userName,
        rating: newReview.rating,
        comment: newReview.comment,
        userId: user?.id || 'guest',
        createdAt: new Date().toISOString()
      };

      setReviews(prev => [addedReview, ...prev]);
      setNewReview({ rating: 5, comment: "", userName: "" });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Gagal mengirim ulasan. Pastikan Anda sudah menjalankan SQL di Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!business) return;
    const shareData = {
      title: business.name,
      text: `Cek ${business.name} di Katalog Duren Sawit!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link berhasil disalin ke clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soft-pink-800"></div>
    </div>
  );

  if (!business) return (
    <div className="p-12 text-center">
      <h2 className="text-xl font-bold text-gray-800">Usaha tidak ditemukan.</h2>
      <Link to="/katalog" className="text-pastel-pink-dark mt-2 inline-block underline">Kembali ke Katalog</Link>
    </div>
  );

  return (
    <div className="pb-12 space-y-8">
      {/* Header Overlay */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden -mx-6 md:rounded-b-[40px]">
        <img 
          src={business.photoURL || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200'} 
          className="w-full h-full object-cover"
          alt={business.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <Link 
          to="/katalog"
          className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <button 
          onClick={handleShare}
          className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-2xl border border-black/5"
        >
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-soft-pink-50 text-soft-pink-800 text-[10px] font-bold rounded-full uppercase tracking-widest border border-soft-pink-800/10">
                  {business.category}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-soft-yellow-100 text-soft-yellow-800 text-[10px] font-bold rounded-full uppercase tracking-widest border border-soft-yellow-800/10">
                  <ShieldCheck className="w-3 h-3" />
                  Warga Terverifikasi
                </span>
              </div>
              <h1 className="text-4xl font-bold text-soft-pink-800">{business.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-pastel-pink-dark" />
                  <span>RT {business.rt}/RW {business.rw}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-soft-yellow-800 fill-current" />
                  <span className="text-soft-pink-800 font-bold">{business.rating}</span>
                  <span className="opacity-50">({business.reviewCount} ulasan)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pastel-pink-dark" />
                  <span>{business.jamBuka?.slice(0, 5)} - {business.jamTutup?.slice(0, 5)}</span>
                  {isBusinessOpen(business.jamBuka, business.jamTutup) ? (
                    <span className="px-2 py-0.5 bg-soft-green-50 text-soft-green-700 text-[10px] font-bold rounded-full uppercase border border-soft-green-100">Buka</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-soft-red-50 text-soft-red-700 text-[10px] font-bold rounded-full uppercase border border-soft-red-100">Tutup</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-auto text-center md:text-right space-y-4">
              <div className="text-2xl font-black text-soft-pink-800">
                {business.price ? business.price : `Mulai Rp 15.000`}
              </div>
              <a 
                href={`https://wa.me/${business.whatsapp}?text=Halo, saya lihat di Bizga: ${business.name}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-soft-green-100 text-soft-green-800 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-soft-green-200 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                <MessageCircle className="w-6 h-6" />
                Chat Tetangga
              </a>
            </div>
          </div>

          <div className="h-px bg-gray-100 my-8"></div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-soft-pink-800 flex items-center gap-2">
              Deskripsi Usaha
            </h3>
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed italic border-l-4 border-soft-pink-100 pl-4">
              <ReactMarkdown>{business.description}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reviews & More */}
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-soft-pink-800">Ulasan Tetangga</h2>
            <div className="flex items-center gap-1 text-soft-yellow-800">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{business.rating}</span>
              <span className="text-xs text-gray-400">({business.reviewCount})</span>
            </div>
          </div>

          {/* Review Form */}
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5 space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tulis Ulasan</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Anda</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input 
                    type="text" 
                    placeholder="Masukkan nama..."
                    value={newReview.userName}
                    onChange={(e) => setNewReview({...newReview, userName: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-soft-pink-50/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-soft-pink-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({...newReview, rating: star})}
                      className={cn(
                        "p-1 transition-all",
                        newReview.rating >= star ? "text-pastel-pink-dark" : "text-gray-200"
                      )}
                    >
                      <Star className={cn("w-6 h-6", newReview.rating >= star ? "fill-current" : "")} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Ulasan</label>
                <textarea 
                  placeholder="Ceritakan pengalaman Anda..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-soft-pink-50/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-soft-pink-200 resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-soft-pink-100 text-soft-pink-800 py-3 rounded-xl font-bold text-sm hover:bg-soft-pink-200 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Ulasan
                  </>
                )}
              </button>

              <AnimatePresence>
                {showSuccess && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center text-xs font-bold text-soft-green-700"
                  >
                    Ulasan berhasil dikirim! Terimakasih tetangga.
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="h-px bg-gray-100"></div>

          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((rev) => (
                <div key={rev.id} className="space-y-2 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-soft-pink-800 text-sm uppercase">{rev.userName}</h4>
                      <p className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-soft-yellow-800">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < rev.rating ? "fill-current" : "text-gray-100")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed italic bg-soft-yellow-50/50 p-4 rounded-2xl rounded-tl-none border-l-4 border-soft-yellow-200">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#F5F5F5] p-12 rounded-[32px] text-center border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Belum ada ulasan untuk usaha ini.<br/>Jadilah tetangga pertama yang memberi ulasan!</p>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-soft-pink-800">Lokasi Usaha</h2>
          <div className="bg-soft-pink-50/30 aspect-square rounded-3xl overflow-hidden shadow-inner relative group border border-black/5">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
              className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 transition-all duration-700" 
              alt="Map placeholder"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {business.linkMaps ? (
                <a 
                  href={business.linkMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white p-4 rounded-full shadow-2xl animate-bounce hover:scale-110 transition-transform cursor-pointer"
                >
                   <MapPin className="w-8 h-8 text-soft-pink-800" />
                </a>
              ) : (
                <div className="bg-white p-4 rounded-full shadow-2xl animate-bounce">
                   <MapPin className="w-8 h-8 text-pastel-pink-dark" />
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/95 backdrop-blur-md rounded-2xl text-xs font-bold shadow-sm flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-gray-400 uppercase text-[8px] mb-1">Alamat & Patokan Usaha :</p>
                <p className="text-soft-pink-800 font-bold text-sm leading-tight">{business.alamat || `RT ${business.rt}/RW ${business.rw}, Duren Sawit`}</p>
                {business.patokan && (
                  <p className="text-soft-pink-800/60 text-[10px] mt-1 font-medium">✨ Patokan: {business.patokan}</p>
                )}
              </div>
              {business.linkMaps && (
                <a 
                  href={business.linkMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-soft-pink-100 text-soft-pink-800 rounded-xl hover:bg-soft-pink-200 transition-colors shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Peta
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
