import { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, Send, Users } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

type Post = { id: string; title: string; body: string; category: string; created_at: string };
type Alert = { id: string; title: string; description: string | null; kind: string; radius_m: number; created_at: string };
const postCategories = [{ value: 'general', label: 'Chia sẻ chung' }, { value: 'training', label: 'Luyện tập' }, { value: 'community', label: 'Cộng đồng' }, { value: 'question', label: 'Câu hỏi' }];
const alertKinds = [{ value: 'cardiac_arrest', label: 'Ngừng tim' }, { value: 'stroke', label: 'Đột quỵ' }, { value: 'bleeding', label: 'Chảy máu nặng' }, { value: 'accident', label: 'Tai nạn' }, { value: 'other', label: 'Khác' }];

export function CommunityView() {
  const { firebaseUser, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertKind, setAlertKind] = useState('other');
  const [alertRadius, setAlertRadius] = useState('1000');
  const [alertDescription, setAlertDescription] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!supabase) return;
    const [{ data: postData }, { data: alertData }] = await Promise.all([
      supabase.from('forum_posts').select('id,title,body,category,created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('community_alerts').select('id,title,description,kind,radius_m,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(20),
    ]);
    setPosts(postData || []); setAlerts(alertData || []);
  };
  useEffect(() => {
    void load();
    if (!supabase) return;
    const channel = supabase.channel('community-live-alerts').on('postgres_changes', { event: '*', schema: 'public', table: 'community_alerts' }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const createPost = async () => {
    if (!supabase || !firebaseUser) return;
    if (title.trim().length < 5 || body.trim().length < 10) { setError('Tiêu đề cần ít nhất 5 ký tự và nội dung cần ít nhất 10 ký tự.'); return; }
    setError(''); setNotice('');
    const { error: insertError } = await supabase.from('forum_posts').insert({ author_uid: firebaseUser.id, title: title.trim(), body: body.trim(), category });
    if (insertError) setError(insertError.message); else { setTitle(''); setBody(''); setNotice('Bài viết đã được đăng.'); await load(); }
  };
  const respondToAlert = async (alertId: string) => {
    if (!supabase || !firebaseUser) return;
    const { error: responseError } = await supabase.from('community_alert_responses').insert({ alert_id: alertId, responder_uid: firebaseUser.id, response_type: 'called_115' });
    if (responseError && responseError.code !== '23505') setError(responseError.message);
  };

  const createAlert = async () => {
    if (!supabase || !firebaseUser || alertTitle.trim().length < 5) return;
    if (!navigator.geolocation) { setError('Thiết bị không hỗ trợ vị trí. Hãy gọi 115 thay vì gửi cảnh báo cộng đồng.'); return; }
    setError('');
    const radius = Number(alertRadius);
    if (!Number.isInteger(radius) || radius < 100 || radius > 10000) { setError('Bán kính phải từ 100 đến 10.000 mét.'); return; }
    if (alertDescription.trim().length > 1000) { setError('Mô tả không được dài quá 1.000 ký tự.'); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { error: insertError } = await supabase.from('community_alerts').insert({ reporter_uid: firebaseUser.id, kind: alertKind, title: alertTitle.trim(), description: alertDescription.trim() || 'Hãy gọi 115 trước và mô tả rõ tình huống.', latitude: coords.latitude, longitude: coords.longitude, radius_m: radius });
      if (insertError) setError(insertError.message); else { setAlertTitle(''); setAlertDescription(''); setNotice('Cảnh báo đã được gửi trong bán kính đã chọn.'); await load(); }
    }, () => setError('Chưa lấy được vị trí. Hãy cấp quyền vị trí hoặc gọi 115 trực tiếp.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };

  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 pb-24">
    <header><p className="text-sm font-semibold text-primary">GOLDENMINUTES</p><h1 className="mt-1 text-3xl font-bold">Cộng đồng hỗ trợ nhau</h1><p className="mt-2 text-sm leading-relaxed text-muted">Chia sẻ kinh nghiệm sơ cứu và thông báo tình huống khẩn cấp trong khu vực. Đây không phải kênh điều phối cấp cứu.</p></header>
    {!isAuthenticated && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Đăng nhập để đăng bài hoặc gửi cảnh báo cho cộng đồng.</div>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"><h2 className="font-bold">Đăng chia sẻ</h2><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{postCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bạn muốn chia sẻ điều gì?" className="min-h-12 rounded-xl border border-border bg-background px-3" /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Viết nội dung tối thiểu 10 ký tự" rows={3} className="rounded-xl border border-border bg-background p-3" /><button type="button" onClick={createPost} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Send className="size-4" aria-hidden="true" />Đăng bài</button></section>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Thông báo khẩn cấp</h2><p className="text-xs leading-relaxed text-muted">Gọi 115 trước. Ứng dụng chỉ chia sẻ cảnh báo với người dùng đã đăng nhập và không thay thế tổng đài.</p><select value={alertKind} onChange={(event) => setAlertKind(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{alertKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} placeholder="Ví dụ: Cần hỗ trợ CPR" className="min-h-11 rounded-xl border border-border bg-background px-3" /><textarea value={alertDescription} onChange={(event) => setAlertDescription(event.target.value)} placeholder="Mô tả ngắn tình huống và điểm nhận biết" rows={2} className="rounded-xl border border-border bg-background p-3" /><label className="text-xs font-semibold">Bán kính chia sẻ<select value={alertRadius} onChange={(event) => setAlertRadius(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3"><option value="500">500 mét</option><option value="1000">1 km</option><option value="3000">3 km</option><option value="5000">5 km</option></select></label><button type="button" onClick={createAlert} className="min-h-11 rounded-xl bg-primary px-3 font-semibold text-primary-foreground">Gửi cảnh báo và chia sẻ vị trí</button></section>}
    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    <section className="flex flex-col gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Cảnh báo đang hoạt động</h2>{alerts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Chưa có cảnh báo đang hoạt động.</p> : alerts.map((alert) => <article key={alert.id} className="rounded-2xl border border-primary/30 bg-surface p-4"><h3 className="font-bold">{alert.title}</h3><p className="mt-1 text-sm text-muted">Bán kính dự kiến {alert.radius_m} m. {alert.description}</p>{isAuthenticated && <button type="button" onClick={() => void respondToAlert(alert.id)} className="mt-3 min-h-10 rounded-lg border border-primary px-3 text-sm font-semibold text-primary">Tôi đã gọi 115</button>}</article>)}</section>
    <section className="flex flex-col gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><MessageCircle className="size-5" aria-hidden="true" />Bài đăng mới</h2>{posts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Chưa có bài đăng. Hãy là người đầu tiên chia sẻ.</p> : posts.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-surface p-4"><h3 className="font-bold">{post.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p></article>)}</section>
    <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted"><Users className="size-4 shrink-0" aria-hidden="true" />Không đăng thông tin nhận diện người bệnh hoặc địa chỉ riêng tư. Cảnh báo giả sẽ bị gỡ.</p>
  </main>;
}

export default CommunityView;
