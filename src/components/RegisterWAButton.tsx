import { MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { getWARegistrationLink } from "../constants";
import { cn } from "../lib/utils";

interface RegisterWAButtonProps {
  className?: string;
  showSubtext?: boolean;
}

export default function RegisterWAButton({ className, showSubtext = true }: RegisterWAButtonProps) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <motion.a
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        href={getWARegistrationLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#D4A373] text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-[#c49363] transition-all flex items-center justify-center gap-3 w-full"
      >
        <MessageCircle className="w-6 h-6" />
        <div className="text-left">
          <div className="text-sm md:text-base leading-none">Daftarkan Usaha Anda</div>
          {showSubtext && (
            <div className="text-[10px] opacity-80 font-medium mt-0.5 uppercase tracking-wider">
              Gratis & dibantu admin
            </div>
          )}
        </div>
      </motion.a>
      {showSubtext && (
        <p className="text-[10px] text-gray-400 font-medium italic mt-1 text-center max-w-[200px]">
          Cukup kirim data lewat WhatsApp, admin akan bantu upload ke katalog Bizga.
        </p>
      )}
    </div>
  );
}
