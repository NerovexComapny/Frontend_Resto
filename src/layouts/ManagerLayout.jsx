import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import UtensilsCrossed from 'lucide-react/dist/esm/icons/utensils-crossed';
import Grid from 'lucide-react/dist/esm/icons/grid';
import Users from 'lucide-react/dist/esm/icons/users';
import BarChart2 from 'lucide-react/dist/esm/icons/bar-chart-2';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import logo from '../assets/logo.webp';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

const ManagerLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const navLinks = [
    { name: t('manager.layout.dashboard'), path: '/manager/dashboard', icon: LayoutDashboard },
    { name: t('manager.layout.orders'), path: '/manager/orders', icon: ShoppingBag },
    { name: t('manager.layout.menu'), path: '/manager/menu', icon: UtensilsCrossed },
    { name: t('manager.layout.tables'), path: '/manager/tables', icon: Grid },
    { name: t('manager.layout.staff'), path: '/manager/staff', icon: Users },
    { name: t('manager.layout.reports'), path: '/manager/reports', icon: BarChart2 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getLinkClasses = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
      isActive 
        ? 'bg-[#7c6af7]/10 text-[#7c6af7] border-l-4 border-[#7c6af7] pl-3 shadow-inner' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-[#132845] border-l-4 border-transparent pl-3'
    }`;
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-slate-100 flex font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <Motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 transform transition-transform duration-300 lg:translate-x-0 bg-[#0d1f3c] border-r border-[#1e3a5f] flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="p-6 flex items-center space-x-3">
          <img src={logo} alt="ليالي قرطاج" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-[#7c6af7]" 
                style={{ fontFamily: "'Playfair Display', serif" }}
                dir="rtl">
              ليالي قرطاج
            </h1>
            <p className="text-xs text-[#94a3b8]">{t('common.fineCuisine')}</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <LanguageSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={getLinkClasses(link.path)}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#1e3a5f] bg-[#0a1628]/50">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2 rounded-xl bg-[#132845] border border-[#1e3a5f]">
            <div className="w-10 h-10 rounded-xl bg-[#7c6af7]/20 text-[#7c6af7] flex items-center justify-center font-bold text-xl uppercase">
              {user?.name ? user.name.charAt(0) : 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{user?.name || 'Manager'}</p>
              <p className="text-xs font-bold text-slate-500 truncate uppercase tracking-widest">{user?.role || t('manager.layout.manager')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold tracking-wider uppercase text-sm">{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="flex lg:hidden items-center justify-between p-4 bg-[#0d1f3c] border-b border-[#1e3a5f] sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <img src={logo} alt="ليالي قرطاج" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-[#7c6af7]" style={{ fontFamily: "'Playfair Display', serif" }} dir="rtl">
              ليالي قرطاج
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <button 
              onClick={toggleMobileMenu}
              className="p-2 bg-[#132845] text-slate-200 rounded-lg hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
