import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, CheckCircle2, ChevronRight, KeyRound, Mail, MapPinned, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../services/supabase/client';

type Organization = { id: string; name: string; organization_type: string; plan: string; status: string };
type Site = { id: string; organization_id: string; name: string; site_type: string; address: string | null; province: string | null; status: string };
type Partnership = { id: string; name: string; partnership_type: string; status: string };

const typeLabels: Record<string, string> = { healthcare: 'Cơ sở y tế', school: 'Trường học', enterprise: 'Doanh nghiệp', insurer: 'Bảo hiểm', private_healthcare: 'Y tế tư nhân', government: 'Cơ quan công' };
const roleLabels: Record<string, string> = { owner: 'Chủ sở hữu', admin: 'Quản trị viên', analyst: 'Phân tích viên', site_manager: 'Quản lý cơ sở', viewer: 'Người xem' };

export const OrganizationDashboardView: React.FC = () => {
  const { isAuthenticated, authUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [role, setRole] = useState('viewer');
  const [membershipRoles, setMembershipRoles] = useState<Record<string, string>>({});
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', organization_type: 'enterprise' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [analytics, setAnalytics] = useState({ completed: 0, consented: 0, adiMedian: null as number | null, mroRate: null as number | null });

  const canManage = role === 'owner' || role === 'admin' || role === 'site_manager';
  const activeSites = sites.filter((site) => site.status === 'active').length;
  const activePartnerships = partnerships.filter((item) => item.status === 'active').length;

  const loadData = async () => {
    if (!supabase || !authUser) return;
    setLoading(true); setError('');
    const { data: memberships, error: memberError } = await supabase.from('organization_members').select('organization_id,role').eq('user_id', authUser.id);
    if (memberError) { setError('Chưa thể tải không gian tổ chức. Vui lòng thử lại.'); setLoading(false); return; }
    const orgIds = (memberships ?? []).map((item) => item.organization_id);
    setMembershipRoles(Object.fromEntries((memberships ?? []).map((item) => [item.organization_id, item.role])));
    if (!orgIds.length) { setOrganizations([]); setLoading(false); return; }
    const [{ data: orgs }, { data: siteRows }, { data: partnershipRows }, { count }] = await Promise.all([
      supabase.from('organizations').select('id,name,organization_type,plan,status').in('id', orgIds).order('created_at'),
      supabase.from('sites').select('id,organization_id,name,site_type,address,province,status').in('organization_id', orgIds).order('name'),
      supabase.from('data_partnerships').select('id,name,partnership_type,status').in('organization_id', orgIds).order('created_at', { ascending: false }),
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).in('organization_id', orgIds),
    ]);
    const nextOrgs = (orgs ?? []) as Organization[];
    setOrganizations(nextOrgs); setSites((siteRows ?? []) as Site[]); setPartnerships((partnershipRows ?? []) as Partnership[]); setMemberCount(count ?? 0);
    const activeOrgId = selectedOrg?.id && orgIds.includes(selectedOrg.id) ? selectedOrg.id : nextOrgs[0]?.id ?? orgIds[0];
    if (activeOrgId) {
      const { data: sessionRows } = await supabase.from('training_sessions').select('status,consent_to_organization_analytics,metrics').eq('organization_id', activeOrgId).eq('consent_to_organization_analytics', true);
      const completedRows = (sessionRows ?? []).filter((row) => row.status === 'completed');
      const adiValues = completedRows.map((row) => Number((row.metrics as Record<string, unknown> | null)?.adi ?? (row.metrics as Record<string, unknown> | null)?.ADI)).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
      const mroValues = completedRows.map((row) => (row.metrics as Record<string, unknown> | null)?.mro).filter((value) => typeof value === 'boolean');
      setAnalytics({ completed: completedRows.length, consented: sessionRows?.length ?? 0, adiMedian: adiValues.length ? adiValues[Math.floor(adiValues.length / 2)] : null, mroRate: mroValues.length ? mroValues.filter(Boolean).length / mroValues.length : null });
    } else setAnalytics({ completed: 0, consented: 0, adiMedian: null, mroRate: null });
    setSelectedOrg((current) => current && nextOrgs.some((item) => item.id === current.id) ? current : nextOrgs[0] ?? null);
    setRole(memberships?.find((item) => item.organization_id === (nextOrgs[0]?.id ?? orgIds[0]))?.role ?? 'viewer');
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [authUser?.id]);

  const filteredSites = useMemo(() => selectedOrg ? sites.filter((site) => site.organization_id === selectedOrg.id) : [], [selectedOrg, sites]);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !authUser || !form.name.trim()) return;
    const { error: createError } = await supabase.from('organizations').insert({ name: form.name.trim(), organization_type: form.organization_type, created_by: authUser.id });
    if (createError) { setError('Không thể tạo tổ chức. Vui lòng kiểm tra quyền tài khoản.'); return; }
    setForm({ name: '', organization_type: 'enterprise' }); setShowCreate(false); await loadData();
  };

  const inviteMember = async () => {
    if (!supabase || !authUser || !selectedOrg || !canManage || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setError('Nhập email hợp lệ và chọn tổ chức mà bạn có quyền quản lý.'); return; }
    setInviting(true); setError('');
    const { error: inviteError } = await supabase.from('organization_invitations').upsert({ organization_id: selectedOrg.id, email: inviteEmail.trim().toLowerCase(), role: inviteRole, invited_by: authUser.id }, { onConflict: 'organization_id,email' });
    if (inviteError) setError('Không thể tạo lời mời. Kiểm tra quyền quản lý tổ chức.'); else { setInviteEmail(''); setNotice('Đã tạo lời mời trong CSDL. Có thể gửi email mời ở bước tiếp theo.'); }
    setInviting(false);
  };

  const createSampleWorkspace = async () => {
    if (!supabase || !authUser) return;
    setSeeding(true); setError('');
    const { data: organization, error: organizationError } = await supabase.from('organizations').insert({
      name: 'GoldenMinutes Demo Workspace', organization_type: 'enterprise', plan: 'pilot', created_by: authUser.id,
    }).select('id').single();
    if (organizationError || !organization) { setError('Không thể tạo không gian mẫu trong cơ sở dữ liệu.'); setSeeding(false); return; }
    const { data: createdSites, error: sitesError } = await supabase.from('sites').insert([
      { organization_id: organization.id, name: 'Văn phòng trung tâm', site_type: 'office', address: 'Dữ liệu mẫu — chưa dùng để điều hướng', province: 'Hồ Chí Minh', status: 'active' },
      { organization_id: organization.id, name: 'Điểm đào tạo cộng đồng', site_type: 'public_area', address: 'Dữ liệu mẫu — cần thay bằng địa chỉ thật', province: 'Hà Nội', status: 'active' },
    ]).select('id');
    const { error: partnershipError } = await supabase.from('data_partnerships').insert({ organization_id: organization.id, partnership_type: 'api', name: 'Kết nối dữ liệu mẫu', status: 'draft', config: { sample: true } });
    if (sitesError || partnershipError) { setError('Không gian đã tạo nhưng dữ liệu phụ chưa hoàn tất. Vui lòng tải lại để kiểm tra.'); }
    if (createdSites?.length) await supabase.from('site_subscriptions').insert(createdSites.map((site) => ({ organization_id: organization.id, site_id: site.id, plan: 'pilot', status: 'trial' })));
    await loadData(); setSeeding(false);
  };

  if (!isAuthenticated) return <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12"><div className="w-full rounded-3xl border border-border bg-surface p-8 text-center shadow-sm"><ShieldCheck className="mx-auto size-12 text-primary" /><h1 className="mt-4 text-3xl font-bold">Cổng quản lý tổ chức</h1><p className="mx-auto mt-3 max-w-lg text-muted">Đăng nhập để quản lý an toàn, cấp cứu và các cơ sở thuộc tổ chức của bạn.</p><Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">Về trang chủ</Link></div></main>;

  return <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GoldenMinutes for organizations</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Quản lý an toàn & cấp cứu</h1><p className="mt-2 max-w-2xl text-muted">Theo dõi mức độ sẵn sàng, quản lý site và xây dựng năng lực ứng phó cho cộng đồng.</p></div><button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground"><Plus className="size-4" />Tạo tổ chức</button></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {loading ? <div className="flex min-h-64 items-center justify-center text-muted">Đang tải không gian quản lý…</div> : organizations.length === 0 ? <section className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-10 text-center"><Building2 className="mx-auto size-12 text-muted" /><h2 className="mt-4 text-xl font-bold">Chưa có tổ chức</h2><p className="mt-2 text-muted">Tạo không gian đầu tiên cho trường học, doanh nghiệp, cơ sở y tế hoặc cơ quan công.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => setShowCreate(true)} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Tạo tổ chức thật</button><button type="button" disabled={seeding} onClick={() => void createSampleWorkspace()} className="rounded-xl border border-border px-5 py-3 font-bold text-foreground disabled:opacity-60">{seeding ? 'Đang tạo dữ liệu mẫu…' : 'Tạo workspace mẫu'}</button></div></section> : <>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{organizations.map((organization) => <button type="button" key={organization.id} onClick={() => { setSelectedOrg(organization); setRole(membershipRoles[organization.id] ?? 'viewer'); }} className={`min-w-[220px] rounded-2xl border p-4 text-left transition-colors ${selectedOrg?.id === organization.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}><p className="text-xs font-bold uppercase tracking-wide text-muted">{typeLabels[organization.organization_type]}</p><p className="mt-1 font-bold">{organization.name}</p><p className="mt-2 text-xs text-muted">Gói {organization.plan} · {roleLabels[membershipRoles[organization.id] ?? role]}</p>{organization.name.includes('Demo') && <p className="mt-2 text-[11px] font-semibold text-amber-700">Workspace mẫu trong CSDL</p>}</button>)}</div>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Site đang hoạt động', value: activeSites, icon: MapPinned }, { label: 'Thành viên tổ chức', value: memberCount, icon: Users }, { label: 'Đối tác dữ liệu', value: activePartnerships, icon: Activity }, { label: 'Trạng thái hệ thống', value: 'Ổn định', icon: CheckCircle2 }].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-border bg-surface p-5"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></article>)}</section>
      <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface"><div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Data-driven readiness</p><h2 className="mt-1 text-xl font-bold">Dòng thời gian cấp cứu → ADI/MRO</h2><p className="mt-1 max-w-2xl text-sm text-muted">Tổng hợp thời gian mở hướng dẫn, gọi 115 và bắt đầu hành động từ các phiên luyện tập của tổ chức.</p></div><span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${analytics.consented ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}><Activity className="size-3.5" />{analytics.consented ? `${analytics.consented} phiên có consent` : 'Đang chờ dữ liệu'}</span></div><div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6"><div className="rounded-2xl bg-background p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">ADI trung vị</p><p className="mt-3 text-3xl font-extrabold text-muted">{analytics.adiMedian !== null ? `${Math.round(analytics.adiMedian)} ms` : '—'}</p><p className="mt-1 text-xs text-muted">{analytics.completed ? `${analytics.completed} phiên hoàn tất có consent` : 'Chờ phiên đã hoàn tất'}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Tỷ lệ MRO</p><p className="mt-3 text-3xl font-extrabold text-muted">{analytics.mroRate !== null ? `${Math.round(analytics.mroRate * 100)}%` : '—'}</p><p className="mt-1 text-xs text-muted">{analytics.completed ? 'Tỷ lệ phiên đạt MRO' : 'Cần dữ liệu theo tổ chức'}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Điểm nóng</p><p className="mt-3 text-3xl font-extrabold text-muted">—</p><p className="mt-1 text-xs text-muted">Cần regionCell đã ẩn danh</p></div></div><div className="flex items-start gap-3 border-t border-border bg-primary/5 p-5 text-sm text-muted"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p>Chỉ hiển thị analytics khi đủ mẫu và có consent. Dữ liệu cá nhân không được suy ra từ dashboard tổ chức.</p></div></section>
      {canManage && selectedOrg && <section className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6"><div className="flex items-center gap-3"><Mail className="size-5 text-primary" /><div><h2 className="text-xl font-bold">Cấp tài khoản cho tổ chức</h2><p className="mt-1 text-sm text-muted">Tạo lời mời thành viên trong CSDL; người nhận sẽ đăng ký bằng email này.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@tochuc.vn" className="min-h-11 rounded-xl border border-border bg-background px-3" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={inviting} onClick={() => void inviteMember()} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60">{inviting ? 'Đang lưu…' : 'Tạo lời mời'}</button></div></section>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-3xl border border-border bg-surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Các cơ sở thuộc hệ thống</h2><p className="mt-1 text-sm text-muted">Theo dõi site, điểm an toàn và năng lực ứng phó.</p></div><button type="button" className="rounded-lg border border-border p-2 text-muted" aria-label="Thêm site"><Plus className="size-4" /></button></div><div className="mt-5 space-y-3">{filteredSites.length ? filteredSites.map((site) => <div key={site.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4"><div className="min-w-0"><p className="font-bold">{site.name}</p><p className="mt-1 truncate text-sm text-muted">{site.address || site.province || 'Chưa cập nhật địa chỉ'}</p>{site.address?.startsWith('Dữ liệu mẫu') && <p className="mt-1 text-[11px] font-semibold text-amber-700">Bản mẫu — thay bằng dữ liệu vận hành</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${site.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{site.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</span></div>) : <p className="rounded-2xl bg-background p-5 text-sm text-muted">Chưa có site. Tạo site để bắt đầu theo dõi an toàn theo địa điểm.</p>}</div></section><section className="space-y-6"><article className="rounded-3xl bg-[#14213d] p-6 text-white"><KeyRound className="size-6 text-[#fda4af]" /><h2 className="mt-5 text-xl font-bold">API & Data Partnership</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">Kết nối dữ liệu an toàn, API theo tổ chức và bộ nhận diện co-branding cho đối tác.</p><button type="button" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-white">Quản lý kết nối <ChevronRight className="size-4" /></button></article><article className="rounded-3xl border border-border bg-surface p-6"><p className="text-xs font-bold uppercase tracking-wide text-primary">Lộ trình mở rộng</p><h2 className="mt-2 text-xl font-bold">B2B · B2B2C · B2G</h2><ul className="mt-4 space-y-3 text-sm text-muted"><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Subscription theo site</li><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Phân tích khu vực và quy hoạch AED</li><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Co-branding cho bảo hiểm và y tế tư nhân</li></ul></article></section></div>
    </>}
    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createOrganization} className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Tạo tổ chức</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Đóng"><X className="size-5" /></button></div><label className="mt-6 block text-sm font-semibold">Tên tổ chức<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3" placeholder="Ví dụ: Trường THPT GoldenMinutes" /></label><label className="mt-4 block text-sm font-semibold">Loại hình<select value={form.organization_type} onChange={(event) => setForm({ ...form, organization_type: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">Tạo không gian quản lý</button></form></div>}
  </main>;
};
