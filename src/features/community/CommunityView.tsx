import { useEffect, useState } from 'react';
import { AlertTriangle, Flag, Heart, ImagePlus, MessageCircle, Send, Users, X } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';
import { ALERT_KINDS, ALERT_RADII, COMMUNITY_COPY, COMMUNITY_TABLES, POST_CATEGORIES, CommunityAlert, CommunityMedia, CommunityPost, distanceInMeters } from '../../config/communityContent';
import { defaultLocationOptions, getCurrentPosition } from '../../services/location/geolocation';
import { HEALTH_NEWS } from '../../data/demo/healthNews';

type Post = CommunityPost;
type Alert = CommunityAlert;

export function CommunityView() {
  const { authUser, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertKind, setAlertKind] = useState('other');
  const [alertRadius, setAlertRadius] = useState('1000');
  const [alertDescription, setAlertDescription] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplies, setOpenReplies] = useState<Record<string, { id: string; author_uid: string; body: string }[]>>({});

  const load = async () => {
    if (!supabase) return;
    const [{ data: postData, error: postsError }, { data: alertData, error: alertsError }] = await Promise.all([
      supabase.from(COMMUNITY_TABLES.posts).select('id,author_uid,title,body,category,media,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(20),
      supabase.from(COMMUNITY_TABLES.alerts).select('id,title,description,kind,radius_m,latitude,longitude,created_at').order('created_at', { ascending: false }).limit(20),
    ]);
    if (postsError || alertsError) setError('Một số nội dung cộng đồng chưa tải được. Vui lòng thử lại sau.');
    else setError('');
    setPosts(postData || []);
    const postIds = (postData || []).map((post) => post.id);
    if (postIds.length > 0) {
      const [{ data: reactions }, { data: replies }] = await Promise.all([
        supabase.from('post_reactions').select('post_id,user_id,reaction_type').in('post_id', postIds),
        supabase.from('forum_comments').select('id,post_id,author_uid,content,created_at').in('post_id', postIds).eq('status', 'published').order('created_at', { ascending: true }),
      ]);
      const counts: Record<string, number> = {};
      (reactions || []).forEach((reaction) => { counts[reaction.post_id] = (counts[reaction.post_id] || 0) + 1; });
      setReactionCounts(counts);
      if (authUser) setLikedPosts(Object.fromEntries((reactions || []).filter((reaction) => reaction.user_id === authUser.id).map((reaction) => [reaction.post_id, true])));
      const grouped: Record<string, { id: string; author_uid: string; body: string }[]> = {};
      (replies || []).forEach((reply) => { (grouped[reply.post_id] ||= []).push({ id: reply.id, author_uid: reply.author_uid, body: reply.content }); });
      setOpenReplies(grouped);
    }
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
    setError(''); setNotice(''); setIsUploading(true);
    try {
      const media: CommunityMedia[] = [];
      for (const file of mediaFiles) {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${authUser.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('community-media').upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('community-media').getPublicUrl(path);
        media.push({ url: data.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name });
      }
      const { error: insertError } = await supabase.from(COMMUNITY_TABLES.posts).insert({ author_uid: authUser.id, author_id: authUser.id, title: title.trim(), content: body.trim(), body: body.trim(), category, media });
      if (insertError) throw insertError;
      setTitle(''); setBody(''); setMediaFiles([]); setNotice('Bài viết đã được đăng.'); await load();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Không thể đăng bài lúc này. Vui lòng thử lại.'); } finally { setIsUploading(false); }
  };
  const startEditingPost = (post: Post) => { setEditingPostId(post.id); setEditingTitle(post.title); setEditingBody(post.body); };
  const cancelEditingPost = () => { setEditingPostId(null); setEditingTitle(''); setEditingBody(''); };
  const updatePost = async (postId: string) => {
    if (!supabase || !authUser || editingTitle.trim().length < 5 || editingBody.trim().length < 10) { setError('Tiêu đề cần ít nhất 5 ký tự và nội dung cần ít nhất 10 ký tự.'); return; }
    const { error: updateError } = await supabase.from(COMMUNITY_TABLES.posts).update({ title: editingTitle.trim(), content: editingBody.trim(), body: editingBody.trim() }).eq('id', postId).eq('author_uid', authUser.id);
    if (updateError) { setError('Không thể cập nhật bài đăng.'); return; }
    cancelEditingPost(); setNotice('Bài đăng đã được cập nhật.'); await load();
  };
  const toggleReaction = async (postId: string) => {
    if (!supabase || !authUser) return;
    const liked = likedPosts[postId];
    const query = liked
      ? supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', authUser.id).eq('reaction_type', 'like')
      : supabase.from('post_reactions').insert({ post_id: postId, user_id: authUser.id, reaction_type: 'like' });
    const { error: reactionError } = await query;
    if (reactionError) { setError('Không thể cập nhật lượt thích.'); return; }
    setLikedPosts((current) => ({ ...current, [postId]: !liked }));
    setReactionCounts((current) => ({ ...current, [postId]: Math.max(0, (current[postId] || 0) + (liked ? -1 : 1)) }));
  };
  const addReply = async (postId: string) => {
    if (!supabase || !authUser || !replyDrafts[postId]?.trim()) return;
    const { error: replyError } = await supabase.from('forum_comments').insert({ post_id: postId, author_uid: authUser.id, author_id: authUser.id, content: replyDrafts[postId].trim() });
    if (replyError) { setError('Không thể gửi bình luận.'); return; }
    setReplyDrafts((current) => ({ ...current, [postId]: '' })); setNotice('Bình luận đã được gửi.'); await load();
  };
  const reportPost = async (postId: string) => {
    if (!supabase || !authUser) return;
    const reason = window.prompt('Lý do báo cáo bài đăng?');
    if (!reason?.trim()) return;
    const { error: reportError } = await supabase.from('forum_reports').insert({ target_type: 'post', target_id: postId, reporter_id: authUser.id, reason: reason.trim() });
    if (reportError?.code === '23505') setNotice('Bạn đã báo cáo bài đăng này.'); else if (reportError) setError('Không thể gửi báo cáo.'); else setNotice('Báo cáo đã được gửi để kiểm duyệt.');
  };
  const deletePost = async (post: Post) => {
    if (!supabase || !authUser || !window.confirm('Xóa bài đăng này?')) return;
    const mediaPaths = (post.media || []).map((item) => item.url.split('/community-media/')[1]).filter(Boolean);
    if (mediaPaths.length > 0) await supabase.storage.from('community-media').remove(mediaPaths);
    const { error: deleteError } = await supabase.from(COMMUNITY_TABLES.posts).delete().eq('id', post.id).eq('author_uid', authUser.id);
    if (deleteError) { setError('Không thể xóa bài đăng.'); return; }
    setNotice('Bài đăng đã được xóa.'); await load();
  };

  const selectMedia = (files: FileList | null) => {
    const selected = Array.from(files || []);
    if (selected.length > 4 || selected.some((file) => !/^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(file.type) || file.size > 25 * 1024 * 1024)) { setError('Chọn tối đa 4 ảnh/video, mỗi file không quá 25 MB.'); return; }
    setError(''); setMediaFiles(selected);
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

  return <main className="community-shell mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
    <header className="community-hero"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">GOLDENMINUTES · CỘNG ĐỒNG</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{COMMUNITY_COPY.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{COMMUNITY_COPY.description}</p></div><div className="community-hero__mark" aria-hidden="true"><Users className="size-8" /></div></header>
    {!isAuthenticated && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Đăng nhập để đăng bài hoặc gửi cảnh báo cho cộng đồng.</div>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"><h2 className="font-bold">Đăng chia sẻ</h2><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{POST_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bạn muốn chia sẻ điều gì?" className="min-h-12 rounded-xl border border-border bg-background px-3" /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Viết nội dung tối thiểu 10 ký tự" rows={3} className="rounded-xl border border-border bg-background p-3" /><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary"><ImagePlus className="size-5" aria-hidden="true" />Thêm ảnh hoặc video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={(event) => selectMedia(event.target.files)} /></label>{mediaFiles.length > 0 && <div className="flex flex-wrap gap-2">{mediaFiles.map((file, index) => <span key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">{file.name}<button type="button" onClick={() => setMediaFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa ${file.name}`}><X className="size-3" /></button></span>)}</div>}<button type="button" disabled={isUploading} onClick={createPost} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"><Send className="size-4" aria-hidden="true" />{isUploading ? 'Đang đăng…' : 'Đăng bài'}</button></section>}
    {isAuthenticated && <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Thông báo khẩn cấp</h2><p className="text-xs leading-relaxed text-muted">Gọi 115 trước. Ứng dụng chỉ chia sẻ cảnh báo với người dùng đã đăng nhập và không thay thế tổng đài.</p><select value={alertKind} onChange={(event) => setAlertKind(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{ALERT_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} placeholder="Ví dụ: Cần hỗ trợ CPR" className="min-h-11 rounded-xl border border-border bg-background px-3" /><textarea value={alertDescription} onChange={(event) => setAlertDescription(event.target.value)} placeholder="Mô tả ngắn tình huống và điểm nhận biết" rows={2} className="rounded-xl border border-border bg-background p-3" /><label className="text-xs font-semibold">Bán kính chia sẻ<select value={alertRadius} onChange={(event) => setAlertRadius(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3">{ALERT_RADII.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" onClick={createAlert} className="min-h-11 rounded-xl bg-primary px-3 font-semibold text-primary-foreground">Gửi cảnh báo và chia sẻ vị trí</button></section>}
    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    <section className="flex flex-col gap-3"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><AlertTriangle className="size-5 text-primary" aria-hidden="true" />Cảnh báo đang hoạt động</h2><button type="button" onClick={nearbyOnly ? () => { setNearbyOnly(false); setCurrentPosition(null); } : enableNearbyAlerts} className="min-h-10 rounded-lg border border-border px-3 text-xs font-semibold">{nearbyOnly ? 'Hiện tất cả' : 'Gần tôi'}</button></div>{alerts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">{nearbyOnly ? 'Không có cảnh báo trong bán kính của cảnh báo gần bạn.' : 'Chưa có cảnh báo đang hoạt động.'}</p> : alerts.map((alert) => <article key={alert.id} className="rounded-2xl border border-primary/30 bg-surface p-4"><h3 className="font-bold">{alert.title}</h3><p className="mt-1 text-sm text-muted">Bán kính chia sẻ {alert.radius_m} mét. {alert.description}</p>{isAuthenticated && <button type="button" onClick={() => void respondToAlert(alert.id)} className="mt-3 min-h-10 rounded-lg border border-primary px-3 text-sm font-semibold text-primary">Tôi đã gọi 115</button>}</article>)}</section>
    <section className="flex flex-col gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><MessageCircle className="size-5" aria-hidden="true" />Bài đăng mới</h2>{posts.length === 0 ? <><p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Chưa có bài chia sẻ mới. Bạn có thể xem các hướng dẫn cộng đồng bên dưới.</p><div className="grid gap-3 sm:grid-cols-2">{HEALTH_NEWS.slice(0, 4).map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs font-semibold text-primary">{item.category}</p><h3 className="mt-1 font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.summary}</p></article>)}</div></> : posts.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-surface p-4">{editingPostId === post.id ? <div className="flex flex-col gap-3"><input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3" aria-label="Tiêu đề bài đăng" /><textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} rows={4} className="rounded-xl border border-border bg-background p-3" aria-label="Nội dung bài đăng" /><div className="flex gap-2"><button type="button" onClick={() => void updatePost(post.id)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu thay đổi</button><button type="button" onClick={cancelEditingPost} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Hủy</button></div></div> : <><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{post.title}</h3>{post.author_uid === authUser?.id && <div className="flex gap-2"><button type="button" onClick={() => startEditingPost(post)} className="text-xs font-semibold text-primary">Sửa</button><button type="button" onClick={() => void deletePost(post)} className="text-xs font-semibold text-destructive">Xóa</button></div>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p>{post.media && post.media.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{post.media.map((item) => item.type === 'video' ? <video key={item.url} src={item.url} controls preload="metadata" className="aspect-video w-full rounded-xl object-cover" aria-label={item.name} /> : <img key={item.url} src={item.url} alt={item.name} loading="lazy" className="aspect-video w-full rounded-xl object-cover" />)}</div>}<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3"><button type="button" onClick={() => void toggleReaction(post.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${likedPosts[post.id] ? 'bg-primary/10 text-primary' : 'border border-border text-muted'}`}><Heart className="size-4" fill={likedPosts[post.id] ? 'currentColor' : 'none'} />{reactionCounts[post.id] || 0}</button><button type="button" onClick={() => setOpenReplies((current) => ({ ...current, [post.id]: current[post.id] ? [] : (current[post.id] || []) }))} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted"><MessageCircle className="size-4" />{openReplies[post.id]?.length || 0}</button>{authUser && <button type="button" onClick={() => void reportPost(post.id)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted"><Flag className="size-4" />Báo cáo</button>}</div>{openReplies[post.id] && <div className="mt-3 flex flex-col gap-2">{openReplies[post.id].map((reply) => <p key={reply.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="font-semibold">Thành viên</span> {reply.body}</p>)}{authUser && <div className="flex gap-2"><input value={replyDrafts[post.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Viết bình luận..." className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm" /><button type="button" onClick={() => void addReply(post.id)} className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Gửi</button></div>}</div>}</>}</article>)}</section>
    <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted"><Users className="size-4 shrink-0" aria-hidden="true" />Không đăng thông tin nhận diện người bệnh hoặc địa chỉ riêng tư. Cảnh báo giả sẽ bị gỡ.</p>
  </main>;
}

export default CommunityView;
