import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  PhoneCall,
  Zap,
  BookOpen,
  MapPin,
  MoreHorizontal,
  ShieldAlert,
  UserCheck,
  User,
  X,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

interface NavigationProps {
  onOpenCall115: () => void;
  onOpenLogin: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenCall115, onOpenLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, logout } = useAuth();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainDesktopLinks = [
    { path: '/', label: 'Trang chủ' },
    { path: '/emergency', label: 'Tình huống thật' },
    { path: '/training', label: 'Luyện 3 phút' },
    { path: '/nearby', label: 'Gần bạn' },
    { path: '/library', label: 'Thư viện' },
  ];

  const bottomNavItems = [
    { path: '/', label: 'Trang chủ', icon: Heart },
    { path: '/emergency', label: 'Cấp cứu', icon: ShieldAlert },
    { path: '/training', label: 'Luyện tập', icon: Zap },
    { path: '/nearby', label: 'Gần bạn', icon: MapPin },
    { path: '/library', label: 'Thư viện', icon: BookOpen },
  ];

  const handleNavigateFromSheet = (path: string) => {
    setIsMoreMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Top Header Bar — Strict 3-zone contract, h-14 (56px) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 h-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-8">
          
          {/* Zone 1: Brand Title (Single text element wordmark, whitespace-nowrap shrink-0) */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 fill-current" aria-hidden="true" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
              GoldenMinutes
            </span>
          </Link>

          {/* Zone 2: Navigation Links (4-5 single-line links, whitespace-nowrap shrink-0) */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Điều hướng chính">
            {mainDesktopLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-xs font-semibold whitespace-nowrap transition-colors py-1 ${
                    isActive
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions (Single primary 115 action + auth trigger) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick 115 Emergency Trigger */}
            <button
              type="button"
              onClick={onOpenCall115}
              className="py-1.5 px-3 sm:px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Gọi cấp cứu 115 khẩn cấp"
            >
              <PhoneCall className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>GỌI 115</span>
            </button>

            {/* Desktop Auth */}
            <div className="hidden sm:flex items-center gap-2">
              {isGuest ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Đăng nhập</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 text-xs text-slate-700">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span className="font-semibold max-w-[90px] truncate">
                      {user?.displayName || user?.phoneMasked}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1 text-slate-400 hover:text-slate-700 text-xs transition-colors cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Profile Trigger (Icon only) */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className="sm:hidden p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
              aria-label="Menu tài khoản"
            >
              {isGuest ? <User className="w-4 h-4" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (5 items, safe-area padded, 44px+ hitboxes) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-pb shadow-lg"
        aria-label="Điều hướng di động"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all rounded-lg select-none active:scale-95 ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="relative flex flex-col items-center">
                  <Icon className={`w-5 h-5 mb-1 shrink-0 ${isActive ? 'stroke-[2.5] text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-[11px] leading-tight truncate max-w-[68px]">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" aria-hidden="true" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-250 safe-area-pb"
            role="dialog"
            aria-modal="true"
            aria-label="Tài khoản & Tiện ích"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Tài Khoản &amp; Cài Đặt</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auth Profile Section */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              {isGuest ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Khách vãng lai</div>
                    <div className="text-[11px] text-slate-500">Đăng nhập để lưu hồ sơ luyện tập</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    Đăng nhập
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-200">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{user?.displayName}</div>
                      <div className="text-[11px] text-slate-500">
                        {user?.phoneMasked} · <span className="font-semibold text-blue-600">{user?.role}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMoreMenuOpen(false);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Route Links List */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Chức năng nâng cao</div>

              <button
                type="button"
                onClick={() => handleNavigateFromSheet('/emergency')}
                className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Chế độ Cấp cứu Thực tế</div>
                    <div className="text-[11px] text-slate-500">Đồng hồ đếm ngược, quy trình xử trí khẩn cấp</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigateFromSheet('/library')}
                className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Thư viện Kỹ năng Cấp cứu</div>
                    <div className="text-[11px] text-slate-500">Video chuẩn hóa AHA &amp; Bộ Y Tế</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Legal Notice */}
            <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nghị định 13/2023/NĐ-CP &amp; 279/2025/NĐ-CP</span>
              </div>
              <p className="leading-relaxed">
                GoldenMinutes lưu trữ ngoại tuyến ưu tiên trên thiết bị. Mọi dữ liệu phân tích đều ẩn danh hóa theo ngưỡng an toàn.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
