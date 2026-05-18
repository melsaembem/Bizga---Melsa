import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Business, CATEGORIES } from "../types";
import { cn } from "../lib/utils";
import BusinessCard from "../components/BusinessCard";
import RegisterWAButton from "../components/RegisterWAButton";
import { Sparkles, ArrowRight, TrendingUp, Users, Store } from "lucide-react";
import { motion } from "motion/react";

export default function Home() {
  const [featured, setFeatured] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .or('status.eq.active,status.is.null')
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (error) throw error;

        // Map snake_case to camelCase if needed, but let's check types.ts
        const docs = (data || []).map(item => ({
          ...item,
          photoURL: item.photo_url,
          ownerId: item.owner_id,
          reviewCount: item.review_count,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          jamBuka: item.jam_buka,
          jamTutup: item.jam_tutup,
          alamat: item.full_address,
          linkMaps: item.link_maps
        } as Business));

        setFeatured(docs);
      } catch (err) {
        console.error("Error fetching featured:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Section */}
      <section className="relative bg-soft-pink-100 text-soft-pink-800 overflow-hidden w-full pt-20 pb-32 md:pt-32 md:pb-48 flex flex-col items-center text-center">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-soft-yellow-100 opacity-40 rounded-full blur-[120px] -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-soft-pink-300 opacity-40 rounded-full blur-[120px] -ml-64 -mb-64"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-4xl px-6"
        >
          <span className="inline-block px-4 py-1.5 bg-soft-pink-50 text-soft-pink-800 text-[10px] font-bold rounded-full mb-8 uppercase tracking-[0.2em] border border-soft-pink-800/10">
            Komunitas Lokal Terpercaya
          </span>
          <h1 className="text-5xl md:text-8xl font-bold mb-8 leading-[1.1] tracking-tight">
            Cari Jasa & Produk <br className="hidden md:block" /> 
            <span className="text-soft-pink-800/60">Tetangga Duren Sawit</span>
          </h1>
          <p className="text-pastel-pink-dark/70 text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Wadah elegan untuk memajukan kejayaan UMKM warga sekitar. <br className="hidden md:block" /> Promosi instan, profesional, dan langsung terhubung ke WhatsApp tetangga.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/katalog" 
              className="bg-white text-pastel-pink-dark font-bold py-4 px-10 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              Lihat Katalog
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <RegisterWAButton className="w-full sm:w-auto" />
          </div>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto w-full space-y-24">
        {/* Categories */}
        <section className="px-6 overflow-x-hidden">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Kategori Pilihan</h2>
              <p className="text-sm text-gray-400">Temukan apa yang Anda butuhkan</p>
            </div>
            <Link to="/katalog" className="text-soft-pink-800 font-bold text-sm flex items-center gap-1 group">
              Lihat Semua <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link 
                key={cat}
                to={`/katalog?cat=${cat}`}
                className="bg-white p-4 rounded-2xl border border-black/5 flex flex-col items-center text-center gap-3 hover:border-soft-pink-200 hover:shadow-md transition-all group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  i % 2 === 0 ? "bg-soft-pink-50 group-hover:bg-soft-pink-100" : "bg-soft-yellow-50 group-hover:bg-soft-yellow-100"
                )}>
                  <Store className="w-6 h-6 text-soft-pink-800" />
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-soft-pink-800">{cat}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Businesses */}
        <section className="px-6 pb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Usaha Baru Bergabung</h2>
              <p className="text-sm text-gray-400">Dukung langkah awal tetangga kita</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 animate-pulse aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((b, i) => (
                <BusinessCard key={b.id} business={b} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Belum ada usaha terdaftar di wilayah ini.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
