import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Store, Search, Home, LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../App";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Stealth Admin Trigger Logic
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (showAdminLogin) {
      setShowAdminLogin(false);
      setLogoClicks(0);
      navigate("/");
      return;
    }

    if (logoClicks === 0) {
      navigate("/");
    }

    setLogoClicks(prev => prev + 1);
    
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    
    clickTimerRef.current = setTimeout(() => {
      if (!showAdminLogin) setLogoClicks(0);
    }, 3000); 
  };

  useEffect(() => {
    if (logoClicks >= 3) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    }
  }, [logoClicks]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const dashboardPath = isAdmin ? "/admin/dashboard" : "/user/dashboard";

  const navLinks = [
    { name: "Beranda", path: "/", icon: Home },
    { name: "Katalog", path: "/katalog", icon: Search },
    { name: "Riwayat", path: "/riwayat", icon: Store },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1F3D2B] text-white px-6 h-16 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group transition-all active:scale-95"
          >
            <Store className="w-6 h-6 text-[#D4A373] group-hover:animate-pulse transition-transform" />
            <h1 className="text-xl font-bold tracking-tight italic select-none">Bizga</h1>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-bold transition-colors hover:text-[#D4A373]",
                  location.pathname === link.path ? "text-[#D4A373]" : "text-white/70"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showAdminLogin && !user && (
            <Link 
              to="/login"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#D4A373] text-white hover:bg-[#c29161] rounded-xl text-xs font-bold transition-all shadow"
            >
              <UserIcon className="w-4 h-4" />
              Login Admin
            </Link>
          )}
          {user && isAdmin && (
            <div className="flex items-center gap-2">
              <Link 
                to={dashboardPath} 
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard Admin
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-white/50 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-6 h-16 flex justify-around items-center md:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === link.path ? "text-[#1F3D2B]" : "text-gray-300"
            )}
          >
            <link.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{link.name}</span>
          </Link>
        ))}
        {showAdminLogin && !user && (
          <Link
            to="/login"
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === "/login" ? "text-[#1F3D2B]" : "text-gray-300"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Login</span>
          </Link>
        )}
        {user && isAdmin && (
          <Link
            to={dashboardPath}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname.includes("dashboard") ? "text-[#1F3D2B]" : "text-gray-300"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
