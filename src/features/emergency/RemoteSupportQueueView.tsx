import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, PhoneCall, Video } from 'lucide-react';
import { isDemoMode, supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

type SupportRequest = { id: string; emergency_type: string; status: string; latitude: number | null; longitude: number | null; location_shared: boolean; created_at: string };
type ActiveRoom = { id: string; roomUrl: string; token: string };
const labels: Record<string, string> = { ohca: 'Bất tỉnh / nghi ngừng tim', stroke: 'Dấu hiệu đột quỵ', bleeding: 'Chảy máu nghiêm trọng', choking: 'Nghẹn / tắc thở', other: 'Tình huống khác' };

export const RemoteSupportQueueView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const api = async (path: string, method = 'GET') => {
    const { data } = await supabase!.auth.getSession();
    const response = await fetch(`/api${path}`, { method, headers: { ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}), 'Content-Type': 'application/json' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Không thể tải hàng chờ hỗ trợ.');
    return body;
  };

  const refresh = useCallback(async () => {
    if (!supabase || !isAuthenticated) return;
    if (isDemoMode) {
      setRequests((current) => current.length ? current : Array.from({ length: 5 }, (_, i) => ({ id: `demo-support-${i + 1}`, emergency_type: ['ohca','stroke','bleeding','choking','other'][i], status: i === 4 ? 'accepted' : 'queued', latitude: 10.77 + i * 0.004, longitude: 106.69 + i * 0.003, location_shared: true, created_at: new Date(Date.now() - i * 6 * 60000).toISOString() })));
      setError(''); return;
    }
    try { const result = await api('/remote-assistance/queue'); setRequests(result.requests ?? []); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Bạn cần quyền người hướng dẫn đã được cấp để xem hàng chờ.'); }
  }, [isAuthenticated]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 10000); return () => window.clearInterval(timer); }, [refresh]);

  const accept = async (request: SupportRequest) => {
    setBusy(true); setError('');
    try {
      if (isDemoMode) {
        setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: 'accepted' } : item));
        setRoom({ id: request.id, roomUrl: `https://meet.jit.si/goldenminutes-preview-${request.id}`, token: 'demo-session' });
        return;
      }
      const result = await api(`/remote-assistance/${request.id}/accept`, 'POST'); setRoom({ id: request.id, roomUrl: result.roomUrl, token: result.token }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa thể nhận hỗ trợ.'); }
    finally { setBusy(false); }
  };

  const complete = async () => {
    if (!room) return;
    try {
      if (isDemoMode) { setRoom(null); setRequests((current) => current.filter((item) => item.id !== room.id)); return; }
      await api(`/remote-assistance/${room.id}/complete`, 'POST'); setRoom(null); await refresh(); }
    catch { setError('Chưa thể kết thúc phiên hỗ trợ.'); }
  };

  if (!isAuthenticated) return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border bg-white p-8 text-center"><Video className="mx-auto size-10 text-blue-700"/><h1 className="mt-3 text-2xl font-bold">Hàng chờ hỗ trợ từ xa</h1><p className="mt-2 text-slate-600">Đăng nhập bằng tài khoản đã được cấp quyền người hướng dẫn.</p></div></main>;

  return <main className="mx-auto max-w-5xl px-4 py-8 pb-24"><header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-300">Điều phối tình nguyện viên / chuyên môn</p><h1 className="mt-2 text-3xl font-black">Hỗ trợ từ xa</h1><p className="mt-2 max-w-2xl text-slate-300">Chỉ nhận yêu cầu đã xác nhận gọi 115. Phòng video riêng có thời hạn 30 phút, tối đa hai người và không ghi hình.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mr-2 inline size-4"/>{error}</p>}
    {room && <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-4"><div><h2 className="font-bold">Đang hỗ trợ yêu cầu #{room.id.slice(0, 8)}</h2><p className="text-sm text-slate-600">Nhắc người gọi tiếp tục làm theo hướng dẫn 115.</p></div><button onClick={() => void complete()} className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white">Kết thúc phiên</button></div><iframe title="Phòng hỗ trợ video GoldenMinutes" src={`${room.roomUrl}?t=${encodeURIComponent(room.token)}`} allow="camera; microphone; fullscreen; display-capture" className="h-[min(70vh,720px)] w-full border-0"/></section>}
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Yêu cầu đang chờ</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">{requests.filter((r) => r.status === 'queued').length}</span></div>{requests.length ? <div className="grid gap-3 md:grid-cols-2">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{labels[request.emergency_type] || labels.other}</p><p className="mt-1 text-sm text-slate-600">Gửi lúc {new Date(request.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · đã gọi 115</p>{request.location_shared && request.latitude != null && request.longitude != null && <a className="mt-2 inline-block text-xs font-semibold text-blue-700" href={`https://www.openstreetmap.org/?mlat=${request.latitude}&mlon=${request.longitude}#map=16/${request.latitude}/${request.longitude}`} target="_blank" rel="noreferrer">Mở vị trí đã được chia sẻ</a>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${request.status === 'queued' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{request.status === 'queued' ? 'Đang chờ' : 'Đã tiếp nhận'}</span></div>{request.status === 'queued' && <button disabled={busy || Boolean(room)} onClick={() => void accept(request)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin"/> : <Video className="size-4"/>}Tiếp nhận và mở video</button>}</article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto size-9 text-emerald-600"/><p className="mt-3 font-semibold">Chưa có yêu cầu hỗ trợ đang hoạt động.</p><p className="mt-1 text-sm text-slate-500">Hàng chờ tự làm mới mỗi 10 giây.</p></div>}</section>
    <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"><PhoneCall className="mr-2 inline size-4"/>Video hướng dẫn không thay thế điều phối cấp cứu hoặc tư vấn y khoa. Người hỗ trợ cần xác thực danh tính và phạm vi chuyên môn ngoài hệ thống trước khi được cấp vai trò.</p>
  </main>;
};
