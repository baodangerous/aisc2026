import { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, Send, Users } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';
import { ALERT_KINDS, ALERT_RADII, COMMUNITY_COPY, COMMUNITY_TABLES, POST_CATEGORIES, CommunityAlert, CommunityPost, distanceInMeters } from '../../config/communityContent';
import { defaultLocationOptions, getCurrentPosition } from '../../services/location/geolocation';

type Post = CommunityPost;
type Alert = CommunityAlert;

export function CommunityView() {
  const { authUser, isAuthenticated } = useAuth();
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
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);

  const load = async () => {
    if (!supabase) return;
    const [{ data: postData, error: postsError }, { data: alertData, error: alertsError }] = await Promise.all([
      supabase.from(COMMUNITY_TABLES.posts).select('id,title,body,category,created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from(COMMUNITY_TABLES.alerts).select('id,title,description,kind,radius_m,latitude,longitude,created_at').order('created_at', { ascending: false }).limit(20),
    ]);
    if (postsError || alertsError) { setError('Chưa thể tải dữ liệu cộng đồng. Vui lòng thử lại.'); return; }
    setPosts(postData || []);
    setAlerts((alertData || []).filter((alert) => !nearbyOnly || !currentPosition || distanceInMeters(currentPosition, alert.latitude, alert.longitude) <= alert.radius_m));
  };
  useEffect(() => {
    void load();
    if (!supabase) return;
    const channel = supabase.channel('community-live-alerts').on('postgres_changes', { event: '*', schema: 'public', table: 'community_alerts' }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [nearbyOnly, currentPosition]);

  const createPost = async () => {
    if (!supabase || !authUser) return;
    if (title.trim().length < 5 || body.trim().length < 10) { setError('Tiêu đề cần ít nhất 5 ký tự và nội dung cần ít nhất 10 ký tự.'); return; }
    setError(''); setNotice('');
    const { error: insertError } = await supabase.from(COMMUNITY_TABLES.posts).insert({ author_uid: authUser.id, title: title.trim(), body: body.trim(), category });
    if (insertError) setError(insertError.code === '42501' ? 'Tài khoản chưa có quyền đăng bài.' : 'Không thể đăng bài lúc này. Vui lòng thử lại.'); else { setTitle(''); setBody(''); setNotice('Bài viết đã được đăng.'); await load(); }
  };
  const enableNearbyAlerts = () => {
    if (!navigator.geolocation) { setError('Thiết bị không hỗ trợ vị trí.'); return; }
    void getCurrentPosition(defaultLocationOptions).then(({ coords }) => { setCurrentPosition(coords); setNearbyOnly(true); }).catch(() => setError('Chưa lấy được vị trí để lọc cảnh báo gần bạn.'));
  };

  const respondToAlert = async (alertId: string) => {
    if (!supabase || !authUser) return;
    const { error: responseError } = await supabase.from(COMMUNITY_TABLES.responses).insert({ alert_id: alertId, responder_uid: authUser.id, response_type: 'called_115' });
    if (responseError && responseError.code !== '23505') setError(responseError.message);
  };

  const createAlert = async () => {
    if (!supabase || !authUser || alertTitle.trim().length < 5) return;
    if (!navigator.geolocation) { setError('Thiết bị không hỗ trợ vị trí. Hãy gọi 115 thay vì gửi cảnh báo cộng đồng.'); return; }
    setError('');
    const radius = Number(alertRadius);
    if (!Number.isInteger(radius) || radius < 100 || radius > 10000) { setError('Bán kính phải từ 100 đến 10.000 mét.'); return; }
    if (alertDescription.trim().length > 1000) { setError('Mô tả không được dài quá 1.000 ký tự.'); return; }
    void getCurrentPosition(defaultLocationOptions).then(async ({ coords }) => {
      const { error: insertError } = await supabase.from(COMMUNITY_TABLES.alerts).insert({ reporter_uid: authUser.id, kind: alertKind, title: alertTitle.trim(), description: alertDescription.trim() || 'Hãy gọi 115 trước và mô tả rõ tình huống.', latitude: coords.latitude, longitude: coords.longitude, radius_m: radius });
      if (insertError) setError(insertError.message); else { setAlertTitle(''); setAlertDescription(''); setNotice('Cảnh báo đã được gửi trong bán kính đã chọn.'); await load(); }
    }).catch(() => setError('Chưa lấy được vị trí. Hãy cấp quyền vị trí hoặc gọi 115 trực tiếp.'));
  };

  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 pb-24">
    <header><p className="text-sm font-semibold text-primary">GOLDENMINUTES</p><h1 className="mt-1 text-3xl font-bold">{COMMUNITY_COPY.title}</h1><p className="mt-2 text-sm leading-relaxed text-muted">{COMMUNITY_COPY.description}</p></header>
    {!isAuthenticated && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Đăng nhập để đăng bài hoặc gửi cảnh báo cho cộng đồng.</div>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"><h2 className="font-bold">Đăng chia sẻ</h2><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{POST_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bạn muốn chia sẻ điều gì?" className="min-h-12 rounded-xl border border-border bg-background px-3" /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Viết nội dung tối thiểu 10 ký tự" rows={3} className="rounded-xl border border-border bg-background p-3" /><button type="button" onClick={createPost} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Send className="size-4" aria-hidden="true" />Đăng bài</button></section>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Thông báo khẩn cấp</h2><p className="text-xs leading-relaxed text-muted">Gọi 115 trước. Ứng dụng chỉ chia sẻ cảnh báo với người dùng đã đăng nhập và không thay thế tổng đài.</p><select value={alertKind} onChange={(event) => setAlertKind(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{ALERT_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} placeholder="Ví dụ: Cần hỗ trợ CPR" className="min-h-11 rounded-xl border border-border bg-background px-3" /><textarea value={alertDescription} onChange={(event) => setAlertDescription(event.target.value)} placeholder="Mô tả ngắn tình huống và điểm nhận biết" rows={2} className="rounded-xl border border-border bg-background p-3" /><label className="text-xs font-semibold">Bán kính chia sẻ<select value={alertRadius} onChange={(event) => setAlertRadius(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3">{ALERT_RADII.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" onClick={createAlert} className="min-h-11 rounded-xl bg-primary px-3 font-semibold text-primary-foreground">Gửi cảnh báo và chia sẻ vị trí</button></section>}
    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    <section className="flex flex-col gap-3"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Cảnh báo đang hoạt động</h2><button type="button" onClick={nearbyOnly ? () => { setNearbyOnly(false); setCurrentPosition(null); } : enableNearbyAlerts} className="min-h-10 rounded-lg border border-border px-3 text-xs font-semibold">{nearbyOnly ? 'Hiện tất cả' : 'Gần tôi'}</button></div>{alerts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">{nearbyOnly ? 'Không có cảnh báo trong bán kính của cảnh báo gần bạn.' : 'Chưa có cảnh báo đang hoạt động.'}</p> : alerts.map((alert) => <article key={alert.id} className="rounded-2xl border border-primary/30 bg-surface p-4"><h3 className="font-bold">{alert.title}</h3><p className="mt-1 text-sm text-muted">Bán kính chia sẻ {alert.radius_m} mét. {alert.description}</p>{isAuthenticated && <button type="button" onClick={() => void respondToAlert(alert.id)} className="mt-3 min-h-10 rounded-lg border border-primary px-3 text-sm font-semibold text-primary">Tôi đã gọi 115</button>}</article>)}</section>
    <section className="flex flex-col gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><MessageCircle className="size-5" aria-hidden="true" />Bài đăng mới</h2>{posts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Chưa có bài đăng. Hãy là người đầu tiên chia sẻ.</p> : posts.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-surface p-4"><h3 className="font-bold">{post.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p></article>)}</section>
    <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted"><Users className="size-4 shrink-0" aria-hidden="true" />Không đăng thông tin nhận diện người bệnh hoặc địa chỉ riêng tư. Cảnh báo giả sẽ bị gỡ.</p>
  </main>;
}

export default CommunityView;
