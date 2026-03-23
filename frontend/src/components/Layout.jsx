import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, History, Search, User, LogOut, ChevronDown, Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

const SidebarItem = ({ icon: Icon, label, path, isActive, theme, onClick }) => {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link
      to={path}
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
        isActive
          ? theme === 'dark' 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow'
            : 'bg-blue-100 text-blue-900 shadow-sm'
          : theme === 'dark'
            ? 'text-slate-400 hover:text-white hover:bg-white/5'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{label}</span>
      {isActive && theme === 'dark' && (
        <motion.div
          layoutId="active-sidebar"
          className="absolute left-0 w-1 h-8 rounded-r-full bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Guest' };
  const userMenuRef = React.useRef(null);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleWorkspaceClick = () => {
    if (location.pathname === '/dashboard') {
      // Force re-render by updating key
      setResetKey(prev => prev + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-screen max-w-full overflow-x-hidden transition-colors ${
      theme === 'dark' 
        ? 'bg-[#0a0a0f] text-slate-50' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      
      {/* Mobile Header */}
      <div className={`md:hidden flex items-center justify-between p-4 border-b overflow-x-hidden ${
        theme === 'dark' ? 'border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl' : 'border-gray-200 bg-white shadow-sm'
      }`}>
        <Link to="/dashboard" onClick={handleWorkspaceClick} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-glow">
            <Search className="w-4 h-4 text-white font-bold" />
          </div>
          <span className={`text-xl font-bold tracking-tight ${
            theme === 'dark' ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-gray-900'
          }`}>
            VerifAI
          </span>
        </Link>
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className={`p-2 rounded-lg ${
            theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
          }`}
        >
          {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden border-b overflow-hidden ${
              theme === 'dark' ? 'border-white/5 bg-zinc-950/50' : 'border-gray-200 bg-white'
            }`}
          >
            <nav className="flex flex-col p-4 space-y-2">
              <Link
                to="/dashboard"
                onClick={() => { handleWorkspaceClick(); setShowMobileMenu(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === '/dashboard'
                    ? theme === 'dark' 
                      ? 'bg-zinc-800/80 text-white'
                      : 'bg-blue-100 text-blue-900'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium text-sm">Workspace</span>
              </Link>
              <Link
                to="/dashboard/history"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === '/dashboard/history'
                    ? theme === 'dark' 
                      ? 'bg-zinc-800/80 text-white'
                      : 'bg-blue-100 text-blue-900'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium text-sm">History</span>
              </Link>
              
              <div className={`border-t my-2 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`} />
              
              <button
                onClick={() => { toggleTheme(); setShowMobileMenu(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              
              <button
                onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                    : 'text-rose-600 hover:text-rose-700 hover:bg-rose-100'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`w-64 border-r flex flex-col p-4 relative z-10 hidden md:flex transition-colors min-h-screen overflow-visible ${
        theme === 'dark'
          ? 'border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-xl'
          : 'border-gray-200 bg-white'
      }`}>
        <Link to="/dashboard" onClick={handleWorkspaceClick} className="flex items-center gap-3 mb-10 px-2 mt-2 hover:opacity-80 transition-opacity group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <Search className="w-5 h-5 text-white font-bold" />
          </div>
          <span className={`text-2xl font-bold tracking-tight ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
              : 'text-gray-900'
          }`}>
            VerifAI
          </span>
        </Link>

        <nav className="flex-1 space-y-2 relative">
          <SidebarItem 
            icon={Home} 
            label="Workspace" 
            path="/dashboard" 
            isActive={location.pathname === '/dashboard'} 
            theme={theme}
            onClick={handleWorkspaceClick}
          />
          <SidebarItem icon={History} label="History" path="/dashboard/history" isActive={location.pathname === '/dashboard/history'} theme={theme} />
        </nav>

        <div className="mt-auto relative z-50 pb-2" ref={userMenuRef}>
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`mb-2 border rounded-xl shadow-2xl z-[100] ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-white/10'
                    : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={toggleTheme}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                    theme === 'dark'
                      ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                    theme === 'dark'
                      ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl border transition-colors ${
              theme === 'dark'
                ? 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'
                : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-300'
            }`}>
              <User className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
            </div>
            <div className="flex flex-col flex-1 text-left">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''} ${
              theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-x-hidden w-full min-w-0 max-w-full">
        {/* Decorative Gradients */}
        {theme === 'dark' ? (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none animate-float" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none animate-float" style={{ animationDelay: '3s' }} />
          </>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none" />
          </>
        )}
        
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 relative z-10 flex flex-col overflow-x-hidden">
          <Outlet key={resetKey} context={{ theme }} />
        </div>
      </main>
    </div>
  );
}