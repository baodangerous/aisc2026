import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../../services/api/client';
import { getLocalSessions, saveLocalSession } from '../../services/indexedDb';
import { UserProfile, AuthStatus } from '../../domain/schemas';
import { isDemoMode, isSupabaseConfigured, mapProfile, supabase, type SupabaseUser, getSupabaseProfile } from '../../services/supabase/client';
interface ProfileUpdateResult { status: 'synced' | 'offline' | 'failed'; profile: UserProfile }

interface AuthContextType {
  authStatus: AuthStatus;
  user: UserProfile | null;
  profile: UserProfile | null;
  authUser: SupabaseUser | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  isSynced: boolean;
  isSupabaseReady: boolean;
  loginWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName?: string, preferredLanguage?: string, phone?: string) => Promise<ProfileUpdateResult>;
  requestDeletion: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const hydrateUser = async (authUser: SupabaseUser) => {
    if (!supabase) throw new Error('Supabase chưa được cấu hình.');
    const profileRow = await getSupabaseProfile(authUser);
    const profile = mapProfile(profileRow) as UserProfile;
    setAuthUser(authUser);
    setUser(profile);
    setAuthStatus('authenticated_synced');
    void syncGuestSessionsToUser(profile.uid);
  };

  useEffect(() => {
    if (isDemoMode) {
      try {
        const saved = localStorage.getItem('goldenminutes.demo.account.v1');
        if (saved) {
          const account = JSON.parse(saved) as { email: string; id: string; name: string; role: string };
          const demoUser = makeDemoAuthUser(account);
          setAuthUser(demoUser);
          setUser({ uid: account.id, displayName: account.name, role: account.role, preferredLanguage: 'vi', onboardingCompleted: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as UserProfile);
          setAuthStatus('authenticated_synced');
        } else setAuthStatus('guest');
      } catch { setAuthStatus('guest'); }
      return;
    }
    if (!supabase || !isSupabaseConfigured) {
      setAuthStatus('guest');
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) { setAuthStatus('authentication_error'); return; }
      if (data.session?.user) void hydrateUser(data.session.user).catch(() => active && setAuthStatus('authentication_error'));
      else setAuthStatus('guest');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        window.setTimeout(() => {
          if (active) void hydrateUser(session.user).catch(() => active && setAuthStatus('authentication_error'));
        }, 0);
      } else { setAuthUser(null); setUser(null); setAuthStatus('guest'); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const loginWithGoogle = async () => {
    if (isDemoMode) throw new Error('Chọn một tài khoản mẫu để đăng nhập bản Demo.');
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase chưa được kết nối.');
    const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_URL || import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      if (error.message.toLowerCase().includes('provider') && error.message.toLowerCase().includes('enabled')) {
        throw new Error('Google chưa được bật trong Supabase Auth. Bạn vẫn có thể dùng email và mật khẩu bên dưới; hoặc bật Google tại Authentication > Providers > Google.');
      }
      throw error;
    }
    if (!data.url) throw new Error('Không nhận được liên kết đăng nhập Google. Vui lòng thử lại.');
    const isEmbeddedPreview = window.self !== window.top;
    if (isEmbeddedPreview) {
      const authWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
      if (!authWindow) throw new Error('Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.');
    } else {
      window.location.assign(data.url);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (isDemoMode) {
      const account = DEMO_ACCOUNTS.find((item) => item.email === email.trim().toLowerCase() && item.password === password);
      if (!account) throw new Error('Thông tin tài khoản demo không hợp lệ. Hãy chọn một tài khoản mẫu bên dưới.');
      const demoUser = makeDemoAuthUser(account);
      setAuthUser(demoUser);
      setUser({ uid: account.id, displayName: account.name, role: account.role, preferredLanguage: 'vi', onboardingCompleted: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as UserProfile);
      setAuthStatus('authenticated_synced');
      localStorage.setItem('goldenminutes.demo.account.v1', JSON.stringify({ email: account.email, id: account.id, name: account.name, role: account.role }));
      return;
    }
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase chưa được kết nối.');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || password.length < 8) throw new Error('Nhập email hợp lệ và mật khẩu tối thiểu 8 ký tự.');
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('email not confirmed')) throw new Error('Email chưa được xác nhận. Hãy kiểm tra hộp thư rồi thử lại.');
      if (message.includes('rate limit')) throw new Error('Bạn thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.');
      throw new Error('Email hoặc mật khẩu không đúng.');
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (isDemoMode) throw new Error('Bản Demo dùng tài khoản mẫu có sẵn.');
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase chưa được kết nối.');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || password.length < 8) throw new Error('Nhập email hợp lệ và mật khẩu tối thiểu 8 ký tự.');
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`,
        data: { display_name: normalizedEmail.split('@')[0] },
      },
    });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('already') || message.includes('registered')) throw new Error('Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.');
      if (message.includes('password')) throw new Error('Mật khẩu cần tối thiểu 8 ký tự và đủ an toàn.');
      if (message.includes('email address not authorized')) throw new Error('Email mặc định của Supabase hiện chỉ gửi thư xác nhận đến email thành viên dự án. Hãy cấu hình SMTP riêng trong Authentication > SMTP Settings để gửi đến người dùng khác.');
      if (message.includes('rate limit') || message.includes('too many requests')) throw new Error('Supabase đang giới hạn email xác nhận. Hãy chờ rồi thử lại, hoặc cấu hình SMTP riêng trong Authentication > SMTP Settings.');
      if ((message.includes('email provider') && (message.includes('disabled') || message.includes('not enabled'))) || message.includes('signups not allowed')) throw new Error('Đăng ký email đang bị tắt. Hãy bật Email provider và cho phép đăng ký trong Supabase Authentication settings.');
      throw new Error(`Supabase chưa tạo được tài khoản: ${error.message}`);
    }
    if (!data.session) throw new Error('Tạo tài khoản thành công. Hãy kiểm tra email xác nhận rồi đăng nhập.');
  };

  const sendPhoneOtp = async (phone: string) => {
    if (isDemoMode) throw new Error('Đăng nhập bằng OTP không dùng trong bản Demo.');
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase chưa được kết nối.');
    const normalized = normalizeVietnamesePhone(phone);
    if (!normalized) throw new Error('Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0901234567 hoặc +84901234567.');
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    if (error) throw error;
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    if (isDemoMode) throw new Error('Đăng nhập bằng OTP không dùng trong bản Demo.');
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase chưa được kết nối.');
    const normalized = normalizeVietnamesePhone(phone);
    if (!normalized || !/^\d{6}$/.test(token.trim())) throw new Error('Số điện thoại hoặc mã OTP không hợp lệ.');
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token: token.trim(), type: 'sms' });
    if (error) throw error;
  };

  const logout = async () => {
    if (isDemoMode) localStorage.removeItem('goldenminutes.demo.account.v1');
    if (supabase && !isDemoMode) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error('Chưa thể đăng xuất. Vui lòng thử lại.');
    }
    setAuthUser(null); setUser(null); setAuthStatus('guest');
  };

  const updateProfile = async (displayName?: string, preferredLanguage?: string, phone?: string): Promise<ProfileUpdateResult> => {
    if (!supabase || !authUser || !user) return { status: 'failed', profile: user || guestProfile() };
    const { data, error } = await supabase.from('profiles').update({
      display_name: displayName || user.displayName,
      preferred_language: preferredLanguage || user.preferredLanguage,
      updated_at: new Date().toISOString(),
    }).eq('id', authUser.id).select().single();
    if (error) return { status: 'failed', profile: user };
    const next = mapProfile(data) as UserProfile;
    setUser(next);
    return { status: 'synced', profile: next };
  };

  const requestDeletion = async (reason?: string) => {
    if (!authUser || !supabase) return;
    const { error } = await supabase.from('deletion_requests').upsert({ id: authUser.id, uid: authUser.id });
    if (error) throw error;
    await apiClient.requestAccountDeletion(reason).catch(() => undefined);
    if (user) setUser({ ...user, deletionRequestedAt: new Date().toISOString() });
  };

  const isAuth = authStatus === 'authenticated_synced' || authStatus === 'authenticated_offline';
  return <AuthContext.Provider value={{ authStatus, user, profile: user, authUser, isLoading: authStatus === 'initializing', isGuest: !isAuth, isAuthenticated: isAuth, isSynced: authStatus === 'authenticated_synced', isSupabaseReady: isSupabaseConfigured || isDemoMode, loginWithGoogle, signInWithPassword, signUpWithPassword, logout, updateProfile, requestDeletion, sendPhoneOtp, verifyPhoneOtp }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const DEMO_ACCOUNTS = [
  { email: 'citizen.demo@example.test', password: 'demo1234', id: 'citizen-001', name: 'Người dân Demo', role: 'user' },
  { email: 'volunteer.demo@example.test', password: 'demo1234', id: 'volunteer-001', name: 'Tình nguyện viên Demo', role: 'volunteer' },
  { email: 'staff.demo@example.test', password: 'demo1234', id: 'staff-001', name: 'Nhân viên cơ sở Demo', role: 'site_manager' },
  { email: 'manager.demo@example.test', password: 'demo1234', id: 'manager-001', name: 'Quản lý Demo', role: 'admin' },
  { email: 'admin.demo@example.test', password: 'demo1234', id: 'admin-001', name: 'Quản trị viên Demo', role: 'owner' },
];
function makeDemoAuthUser(account: { email: string; id: string; name: string; role: string }) {
  return { id: account.id, aud: 'authenticated', role: 'authenticated', email: account.email, phone: '', app_metadata: { provider: 'demo', providers: ['demo'] }, user_metadata: { display_name: account.name, full_name: account.name, role: account.role }, identities: [], created_at: new Date().toISOString() } as unknown as SupabaseUser;
}

function normalizeVietnamesePhone(value: string) {
  const digits = value.trim().replace(/[\s().-]/g, '');
  if (/^0\d{9}$/.test(digits)) return `+84${digits.slice(1)}`;
  if (/^84\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+84\d{9}$/.test(digits)) return digits;
  return null;
}

function guestProfile(): UserProfile {
  const now = new Date().toISOString();
  return { uid: 'guest', displayName: 'Khách', role: 'guest', preferredLanguage: 'vi', onboardingCompleted: false, createdAt: now, updatedAt: now };
}

async function syncGuestSessionsToUser(uid: string) {
  const localSessions = await getLocalSessions().catch(() => []);
  for (const sess of localSessions.filter((item) => !item.ownerUid && item.status === 'completed')) {
    try {
      const result = await apiClient.saveTrainingSession({ clientSessionId: sess.clientSessionId, scenarioId: sess.scenarioId, scenarioTitle: sess.scenarioTitle || 'Luyện tập tình huống', events: sess.events || [], dataOrigin: 'training_user', notes: 'Đồng bộ từ phiên ngoại tuyến trên thiết bị' });
      if (!('isLocalOnly' in result) || !result.isLocalOnly) { sess.ownerUid = uid; await saveLocalSession(sess); }
    } catch { /* Retry on the next authenticated session. */ }
  }
}
