import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;
      
      setTimeout(() => navigate(from, { replace: true }), 500);
    } catch (err: any) {
      console.error("Auth error:", err);
      setError("Email atau sandi salah. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-8 border border-black/5"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1F3D2B]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#1F3D2B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">
            Masuk Admin
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Hanya untuk pengelola Bizga
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bizga.com"
                className="w-full pl-12 pr-4 py-4 bg-[#F5F5F5] border-none rounded-2xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-12 pr-4 py-4 bg-[#F5F5F5] border-none rounded-2xl focus:ring-2 focus:ring-[#1F3D2B]/10 font-medium transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 bg-[#1F3D2B] text-white font-bold rounded-2xl shadow-xl hover:bg-[#1F3D2B]/90 transition-all flex items-center justify-center gap-2",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-gray-300 font-medium uppercase tracking-widest border-t border-gray-50 pt-6">
          Bizga © 2026 Admin Portal
        </p>
      </motion.div>
    </div>
  );
}
