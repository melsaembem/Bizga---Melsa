/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useLocation 
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import { User } from "@supabase/supabase-js";

// Pages
import Home from "./pages/Home";
import Katalog from "./pages/Katalog";
import BusinessDetail from "./pages/Detail";
import Upload from "./pages/Upload";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Riwayat from "./pages/Riwayat";

// Components
import Navbar from "./components/Navbar";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Consider as admin if logged in (since only admin account will be created by user manually in this app context)
  const isAdmin = user?.email === 'melsaembem@gmail.com';

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F3D2B]"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      <Router>
        <div className="min-h-screen bg-[#F5F5F5] pb-20 md:pb-0 font-sans">
          <Navbar />
          <div className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/katalog" element={<Katalog />} />
              <Route path="/bisnis/:id" element={<BusinessDetail />} />
              <Route path="/riwayat" element={<Riwayat />} />
              
              {/* Auth Route */}
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<Navigate to="/login" replace />} /> {/* Deprecated route mapping */}

              {/* Both Admin and User can upload, it depends on status */}
              <Route path="/upload" element={
                <Upload />
              } />
              {/* Fallback for old route */}
              <Route path="/admin/upload" element={<Navigate to="/upload" replace />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/edit/:id" element={
                <RequireAuth>
                  <Upload />
                </RequireAuth>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  
  if (!user || !isAdmin) {
    if (user && !isAdmin) {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}
