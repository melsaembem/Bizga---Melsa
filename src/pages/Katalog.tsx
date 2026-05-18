import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Business, CATEGORIES } from "../types";
import BusinessCard from "../components/BusinessCard";
import RegisterWAButton from "../components/RegisterWAButton";
import { Search, Filter, X } from "lucide-react";
import { cn } from "../lib/utils";

export default function Katalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const categoryFilter = searchParams.get("cat") || "Semua";

  useEffect(() => {
    async function fetchBusinesses() {
      setLoading(true);
      try {
        let query = supabase
          .from('businesses')
          .select('*')
          .or('status.eq.active,status.is.null')
          .order('created_at', { ascending: false });
        
        if (categoryFilter !== "Semua") {
          query = query.eq('category', categoryFilter);
        }
        
        const { data, error } = await query;
        if (error) throw error;

        let docs = (data || []).map(item => ({
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
        
        // Logical search filter
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          docs = docs.filter(b => 
            b.name.toLowerCase().includes(lowerQuery) || 
            b.description.toLowerCase().includes(lowerQuery) ||
            b.category.toLowerCase().includes(lowerQuery)
          );
        }
        
        setBusinesses(docs);
      } catch (err) {
        console.error("Error fetching katalog:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBusinesses();
  }, [categoryFilter, searchQuery]);

  const handleCategoryClick = (cat: string) => {
    if (cat === "Semua") {
      searchParams.delete("cat");
    } else {
      searchParams.set("cat", cat);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Search Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Katalog Duren Sawit</h1>
            <p className="text-sm text-gray-400">Temukan barang dan jasa di sekitar lingkungan Anda</p>
          </div>
          <RegisterWAButton className="w-full md:w-auto" />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nasi goreng, tukang pijat, atau baju..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-soft-yellow-100 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Categories Horizontal */}
      <div className="sticky top-16 z-30 bg-soft-pink-50/80 backdrop-blur-md py-4 -mx-6 px-6 overflow-x-auto hide-scrollbar border-b border-soft-pink-800/5">
        <div className="flex gap-2 min-w-max">
          {["Semua", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold transition-all border",
                categoryFilter === cat 
                  ? "bg-soft-pink-100 text-soft-pink-800 border-soft-pink-800/20 shadow-sm" 
                  : "bg-white text-gray-500 border-black/5 hover:border-soft-pink-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-200 animate-pulse aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : businesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((b, i) => (
            <BusinessCard key={b.id} business={b} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Filter className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Tidak ditemukan</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">Coba gunakan kata kunci lain atau ubah kategori filter Anda.</p>
        </div>
      )}
    </div>
  );
}
