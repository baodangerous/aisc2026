import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

type AppRole = 'user' | 'volunteer' | 'site_manager' | 'admin' | 'owner' | 'analyst' | 'viewer' | 'clinical_reviewer' | 'platform_admin';

const labels: Record<string, string> = {
  user: 'Người dân', volunteer: 'Tình nguyện viên', site_manager: 'Nhân viên cơ sở',
  admin: 'Quản lý tổ chức', owner: 'Quản trị viên hệ thống', analyst: 'Phân tích viên',
  viewer: 'Người xem', clinical_reviewer: 'Người duyệt chuyên môn', platform_admin: 'Quản trị nền tảng',
};

export const RoleRoute: React.FC<{ allowed: AppRole[]; children: React.ReactNode; moduleName: string }> = ({ allowed, children, moduleName }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <main className="mx-auto max-w-3xl p-8 text-sm text-slate-600">Đang kiểm tra quyền truy cập…</main>;
  const role = (user?.role || 'user') as AppRole;
  if (!isAuthenticated || !allowed.includes(role)) {
    return <main className="mx-auto max-w-2xl px-4 py-16 pb-24">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Không đủ quyền truy cập</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{moduleName}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{!isAuthenticated ? 'Bạn cần đăng nhập bằng tài khoản được cấp quyền để mở mô-đun này.' : `Tài khoản hiện tại thuộc vai trò “${labels[role] || role}”, không có quyền truy cập mô-đun này.`}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Về trang chủ</Link>
          <Link to="/community" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Mở cộng đồng</Link>
        </div>
      </section>
    </main>;
  }
  return <>{children}</>;
};
