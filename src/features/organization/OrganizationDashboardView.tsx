import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, CheckCircle2, ChevronRight, KeyRound, MapPinned, Plus, ShieldCheck, Users, X } from 'lucide-react';
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
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', organization_type: 'enterprise' });

  const canManage = role === 'owner' || role === 'admin' || role === 'site_manager';
  const activeSites = sites.filter((site) => site.status === 'active').length;
  const activePartnerships = partnerships.filter((item) => item.status === 'active').length;

  const loadData = async () => {
    if (!supabase || !authUser) return;
    setLoading(true); setError('');
    const { data: memberships, error: memberError } = await supabase.from('organization_members').select('organization_id,role').eq('user_id', authUser.id);
    if (memberError) { setError('Chưa thể tải không gian tổ chức. Vui lòng thử lại.'); setLoading(false); return; }
    const orgIds = (memberships ?? []).map((item) => item.organization_id);
    if (!orgIds.length) { setOrganizations([]); setLoading(false); return; }
    const [{ data: orgs }, { data: siteRows }, { data: partnershipRows }, { count }] = await Promise.all([
      supabase.from('organizations').select('id,name,organization_type,plan,status').in('id', orgIds).order('created_at'),
      supabase.from('sites').select('id,organization_id,name,site_type,address,province,status').in('organization_id', orgIds).order('name'),
      supabase.from('data_partnerships').select('id,name,partnership_type,status').in('organization_id', orgIds).order('created_at', { ascending: false }),
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).in('organization_id', orgIds),
    ]);
    const nextOrgs = (orgs ?? []) as Organization[];
    setOrganizations(nextOrgs); setSites((siteRows ?? []) as Site[]); setPartnerships((partnershipRows ?? []) as Partnership[]); setMemberCount(count ?? 0);
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

  if (!isAuthenticated) return <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12"><div className="w-full rounded-3xl border border-border bg-surface p-8 text-center shadow-sm"><ShieldCheck className="mx-auto size-12 text-primary" /><h1 className="mt-4 text-3xl font-bold">Cổng quản lý tổ chức</h1><p className="mx-auto mt-3 max-w-lg text-muted">Đăng nhập để quản lý an toàn, cấp cứu và các cơ sở thuộc tổ chức của bạn.</p><Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">Về trang chủ</Link></div></main>;

  return <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GoldenMinutes for organizations</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Quản lý an toàn & cấp cứu</h1><p className="mt-2 max-w-2xl text-muted">Theo dõi mức độ sẵn sàng, quản lý site và xây dựng năng lực ứng phó cho cộng đồng.</p></div><button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground"><Plus className="size-4" />Tạo tổ chức</button></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <div className="flex min-h-64 items-center justify-center text-muted">Đang tải không gian quản lý…</div> : organizations.length === 0 ? <section className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-10 text-center"><Building2 className="mx-auto size-12 text-muted" /><h2 className="mt-4 text-xl font-bold">Chưa có tổ chức</h2><p className="mt-2 text-muted">Tạo không gian đầu tiên cho trường học, doanh nghiệp, cơ sở y tế hoặc cơ quan công.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Bắt đầu quản lý</button></section> : <>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{organizations.map((organization) => <button type="button" key={organization.id} onClick={() => { setSelectedOrg(organization); setRole('viewer'); }} className={`min-w-[220px] rounded-2xl border p-4 text-left transition-colors ${selectedOrg?.id === organization.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}><p className="text-xs font-bold uppercase tracking-wide text-muted">{typeLabels[organization.organization_type]}</p><p className="mt-1 font-bold">{organization.name}</p><p className="mt-2 text-xs text-muted">Gói {organization.plan} · {roleLabels[role]}</p></button>)}</div>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Site đang hoạt động', value: activeSites, icon: MapPinned }, { label: 'Thành viên tổ chức', value: memberCount, icon: Users }, { label: 'Đối tác dữ liệu', value: activePartnerships, icon: Activity }, { label: 'Trạng thái hệ thống', value: 'Ổn định', icon: CheckCircle2 }].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-border bg-surface p-5"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></article>)}</section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-3xl border border-border bg-surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Các cơ sở thuộc hệ thống</h2><p className="mt-1 text-sm text-muted">Theo dõi site, điểm an toàn và năng lực ứng phó.</p></div><button type="button" className="rounded-lg border border-border p-2 text-muted" aria-label="Thêm site"><Plus className="size-4" /></button></div><div className="mt-5 space-y-3">{filteredSites.length ? filteredSites.map((site) => <div key={site.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4"><div className="min-w-0"><p className="font-bold">{site.name}</p><p className="mt-1 truncate text-sm text-muted">{site.address || site.province || 'Chưa cập nhật địa chỉ'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${site.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{site.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</span></div>) : <p className="rounded-2xl bg-background p-5 text-sm text-muted">Chưa có site. Tạo site để bắt đầu theo dõi an toàn theo địa điểm.</p>}</div></section><section className="space-y-6"><article className="rounded-3xl bg-[#14213d] p-6 text-white"><KeyRound className="size-6 text-[#fda4af]" /><h2 className="mt-5 text-xl font-bold">API & Data Partnership</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">Kết nối dữ liệu an toàn, API theo tổ chức và bộ nhận diện co-branding cho đối tác.</p><button type="button" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-white">Quản lý kết nối <ChevronRight className="size-4" /></button></article><article className="rounded-3xl border border-border bg-surface p-6"><p className="text-xs font-bold uppercase tracking-wide text-primary">Lộ trình mở rộng</p><h2 className="mt-2 text-xl font-bold">B2B · B2B2C · B2G</h2><ul className="mt-4 space-y-3 text-sm text-muted"><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Subscription theo site</li><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Phân tích khu vực và quy hoạch AED</li><li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" />Co-branding cho bảo hiểm và y tế tư nhân</li></ul></article></section></div>
    </>}
    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createOrganization} className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Tạo tổ chức</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Đóng"><X className="size-5" /></button></div><label className="mt-6 block text-sm font-semibold">Tên tổ chức<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3" placeholder="Ví dụ: Trường THPT GoldenMinutes" /></label><label className="mt-4 block text-sm font-semibold">Loại hình<select value={form.organization_type} onChange={(event) => setForm({ ...form, organization_type: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">Tạo không gian quản lý</button></form></div>}
  </main>;
};
