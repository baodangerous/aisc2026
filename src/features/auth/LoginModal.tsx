import { useEffect, useRef, useState } from 'react';
import { X, LockKeyhole, AlertCircle, LogIn, LoaderCircle, Smartphone, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';

const authFlags = import.meta.env as ImportMetaEnv & {
  readonly VITE_SUPABASE_GOOGLE_AUTH_ENABLED?: string;
  readonly VITE_SUPABASE_PHONE_AUTH_ENABLED?: string;
};
const googleAuthEnabled = authFlags.VITE_SUPABASE_GOOGLE_AUTH_ENABLED === 'true';
const phoneAuthEnabled = authFlags.VITE_SUPABASE_PHONE_AUTH_ENABLED === 'true';

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { loginWithGoogle, signInWithPassword, signUpWithPassword, sendPhoneOtp, verifyPhoneOtp, isSupabaseReady } = useAuth();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && ref.current && !ref.current.open) { setError(''); ref.current.showModal(); }
    if (!isOpen) ref.current?.close();
  }, [isOpen]);
  const login = async () => {
    if (pending) return;
    setPending(true); setError('');
    try { await loginWithGoogle(); onClose(); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : 'Chưa thể hoàn tất đăng nhập. Vui lòng thử lại sau.'); }
    finally { setPending(false); }
  };
  const submitEmail = async () => {
    if (pending) return;
    setPending(true); setError('');
    try {
      if (isSignUp) await signUpWithPassword(email, password);
      else await signInWithPassword(email, password);
      onClose();
    } catch (error: unknown) { setError(error instanceof Error ? error.message : 'Chưa thể xác thực tài khoản.'); }
    finally { setPending(false); }
  };
  const requestOtp = async () => {
    setPending(true); setError('');
    try { await sendPhoneOtp(phone); setOtpSent(true); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : 'Chưa thể gửi mã xác nhận.'); }
    finally { setPending(false); }
  };
  const confirmOtp = async () => {
    setPending(true); setError('');
    try { await verifyPhoneOtp(phone, otp); onClose(); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : 'Mã xác nhận không đúng hoặc đã hết hạn.'); }
    finally { setPending(false); }
  };
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="login-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-surface p-0 font-sans text-foreground shadow-xl backdrop:bg-foreground/60">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between"><LockKeyhole className="size-8 text-primary" aria-hidden="true" /><button type="button" onClick={onClose} aria-label="Đóng cửa sổ" className="flex size-11 items-center justify-center rounded-full bg-background text-foreground"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="flex flex-col gap-2"><h2 id="login-title" className="text-2xl font-bold">{isSignUp ? 'Tạo tài khoản GoldenMinutes' : 'Chào mừng trở lại'}</h2><p className="text-base leading-relaxed text-muted">{isSignUp ? 'Tạo tài khoản để lưu kết quả luyện tập.' : 'Đăng nhập để lưu kết quả luyện tập.'}</p></div>
        {error && <p role="alert" className="flex items-start gap-2 text-sm text-primary"><AlertCircle className="size-5 shrink-0" aria-hidden="true" />{error}</p>}
        {isSupabaseReady ? <div className="flex flex-col gap-3">
          {googleAuthEnabled && <>
            <button type="button" disabled={pending} onClick={login} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-base font-semibold text-foreground disabled:opacity-60">{pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}{pending ? 'Đang đăng nhập…' : 'Tiếp tục với Google'}</button>
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>
          </>}
          <label className="text-sm font-semibold" htmlFor="email-login">Email</label>
          <input id="email-login" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" className="min-h-12 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
          <label className="text-sm font-semibold" htmlFor="password-login">Mật khẩu</label>
          <input id="password-login" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tối thiểu 8 ký tự" className="min-h-12 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
          <button type="button" disabled={pending || !email || !password} onClick={submitEmail} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold disabled:opacity-50"><Mail className="size-5" aria-hidden="true" />{isSignUp ? 'Tạo tài khoản bằng email' : 'Đăng nhập bằng email'}</button>
          <button type="button" onClick={() => { setIsSignUp((value) => !value); setError(''); }} className="text-left text-sm font-semibold text-primary underline underline-offset-4">{isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Tạo tài khoản'}</button>
          {phoneAuthEnabled && <>
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>
            <label className="text-sm font-semibold" htmlFor="phone-login">Số điện thoại</label>
            <input id="phone-login" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+84…" className="min-h-12 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
            {!otpSent ? <button type="button" disabled={pending || !phone} onClick={requestOtp} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold disabled:opacity-50"><Smartphone className="size-5" aria-hidden="true" />Gửi mã SMS</button> : <><label className="text-sm font-semibold" htmlFor="phone-otp">Mã xác nhận</label><input id="phone-otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" className="min-h-12 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" /><button type="button" disabled={pending || otp.length < 4} onClick={confirmOtp} className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">Xác nhận số điện thoại</button></>}
          </>}
        </div> : <p role="status" className="text-sm leading-relaxed text-muted">Dịch vụ tài khoản chưa được kết nối. Bạn vẫn có thể xem học liệu và gọi 115.</p>}
        <p className="text-sm leading-relaxed text-muted">Không cần đăng nhập để mở cuộc gọi khẩn cấp.</p>
      </div>
    </dialog>
  );
}
