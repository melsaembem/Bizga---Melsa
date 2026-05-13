import { Link } from "react-router-dom";
import { MessageCircle, Star, MapPin, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Business } from "../types";
import { cn, formatIDRCurrency } from "../lib/utils";
import { isBusinessOpen } from "../lib/businessUtils";

interface BusinessCardProps {
  business: Business;
  index: number;
}

export default function BusinessCard({ business, index }: BusinessCardProps) {
  const isOpen = isBusinessOpen(business.jamBuka, business.jamTutup);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden group hover:shadow-md transition-all h-full flex flex-col"
    >
      <Link to={`/bisnis/${business.id}`} className="block overflow-hidden relative">
        <img 
          src={business.photoURL || `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800`} 
          alt={business.name}
          className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold text-[#1F3D2B] uppercase tracking-wider">
            {business.category}
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg",
            isOpen ? "bg-green-500" : "bg-red-500"
          )}>
            {isOpen ? "BUKA" : "TUTUP"}
          </div>
        </div>
      </Link>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/bisnis/${business.id}`}>
            <h3 className="font-bold text-lg text-[#1A1A1A] group-hover:text-[#1F3D2B] transition-colors">{business.name}</h3>
          </Link>
          <div className="flex items-center gap-1 text-[#D4A373]">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-bold">{business.rating || '5.0'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
          <MapPin className="w-3 h-3" />
          <span>RT {business.rt || '00'}/RW {business.rw || '00'}</span>
        </div>

        <p className="text-sm text-gray-500 mb-4 line-clamp-2 italic">
          "{business.description}"
        </p>
        
        <div className="mt-auto flex justify-between items-center">
          <span className="text-[#1F3D2B] font-bold text-sm">
            {business.price ? business.price : `Mulai dari Rp 15rb`}
          </span>
          <a 
            href={`https://wa.me/${business.whatsapp}?text=Halo, saya lihat usaha Anda di Bizga: ${business.name}`} 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#075E54] transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            CHAT
          </a>
        </div>
      </div>
    </motion.div>
  );
}
