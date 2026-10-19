import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Mail,
  MapPinned,
  Plus,
  ShieldCheck,
  Users,
  X,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../services/supabase/client';

type Organization = { id: string; name: string; organization_type: string; plan: string; status: string };
type Site = { id: string; organization_id: string; name: string; address: string | null; is_active: boolean };
type Partnership = { id: string; name: string; agreement_type: string; status: string };

interface RegionMetric {
  region_id: string;
  name: string;
  district: string;
  incident_count: number;
  suppressed: boolean;
  avg_response_time_sec: number | null;
  adi_avg: number | null;
  avg_ttg_sec: number | null;
  avg_ttc_sec: number | null;
  mro_rate_percent: number | null;
}

interface InterventionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  startedAt: string;
  beforeADI: number;
  afterADI: number;
  beforeMRO: number;
  afterMRO: number;
}

const typeLabels: Record<string, string> = {
  healthcare: 'Cơ sở y tế',
  school: 'Trường học',
  enterprise: 'Doanh nghiệp',
  insurer: 'Bảo hiểm',
  private_healthcare: 'Y tế tư nhân',
  government: 'Cơ quan công',
};
const roleLabels: Record<string, string> = {
  owner: 'Chủ sở hữu',
  admin: 'Quản trị viên',
  analyst: 'Phân tích viên',
  site_manager: 'Quản lý cơ sở',
  viewer: 'Người xem',
};

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
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', organization_type: 'enterprise' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  // Data view mode: Synthetic simulation vs Real pilot study
  const [dataMode, setDataMode] = useState<'synthetic' | 'pilot'>('synthetic');
  const [regionalMetrics, setRegionalMetrics] = useState<RegionMetric[]>([]);
  const [regionalLoading, setRegionalLoading] = useState(true);
  const [regionalError, setRegionalError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  const [interventionForm, setInterventionForm] = useState({
    title: '',
    type: 'cpr_training',
    description: '',
    regionId: 'QTD-P01',
  });

  const [interventions, setInterventions] = useState<InterventionItem[]>([
    {
      id: 'itv_1',
      title: 'Tập huấn CPR & Kỹ năng FAST tại Làng Đại Học',
      type: 'cpr_training',
      description: 'Đào tạo 450 sinh viên tại Ký túc xá ĐHQG (TP. Thủ Đức).',
      startedAt: '2026-09-01',
      beforeADI: 32,
      afterADI: 19,
      beforeMRO: 42,
      afterMRO: 22,
    },
    {
      id: 'itv_2',
      title: 'Lắp đặt 3 trạm AED công cộng tại Phường Bến Nghé',
      type: 'aed_verification',
      description: 'Phối hợp cùng khách sạn và ban quản lý phố đi bộ Nguyễn Huệ.',
      startedAt: '2026-08-15',
      beforeADI: 24,
      afterADI: 14,
      beforeMRO: 28,
      afterMRO: 12,
    },
  ]);

  const [analytics, setAnalytics] = useState({
    completed: 0,
    consented: 0,
    adiMedian: null as number | null,
    mroRate: null as number | null,
    incidents: 0,
    medianRecognitionSeconds: null as number | null,
  });

  const canManage = role === 'owner' || role === 'admin' || role === 'site_manager';
  const activeSites = sites.filter((site) => site.is_active).length;
  const activePartnerships = partnerships.filter((item) => item.status === 'active').length;

  const loadData = async () => {
    if (!supabase || !authUser) return;
    setLoading(true);
    setError('');
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id,role')
      .eq('user_id', authUser.id);
    if (memberError) {
      setError('Chưa thể tải không gian tổ chức. Vui lòng thử lại.');
      setLoading(false);
      return;
    }
    const orgIds = (memberships ?? []).map((item) => item.organization_id);
    setMembershipRoles(Object.fromEntries((memberships ?? []).map((item) => [item.organization_id, item.role])));
    if (!orgIds.length) {
      setOrganizations([]);
      setLoading(false);
      return;
    }
    const [{ data: orgs }, { data: siteRows }, { data: partnershipRows }, { count }] = await Promise.all([
      supabase.from('organizations').select('id,name,organization_type,plan,status').in('id', orgIds).order('created_at'),
      supabase.from('sites').select('id,organization_id,name,address,is_active').in('organization_id', orgIds).order('name'),
      supabase.from('data_partnerships').select('id,partner_name,agreement_type,status').in('organization_id', orgIds).order('created_at', { ascending: false }),
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).in('organization_id', orgIds),
    ]);
    const nextOrgs = (orgs ?? []) as Organization[];
    setOrganizations(nextOrgs);
    setSites((siteRows ?? []) as Site[]);
    setPartnerships((partnershipRows ?? []).map((item) => ({
      id: item.id,
      name: item.partner_name,
      agreement_type: item.agreement_type,
      status: item.status,
    })) as Partnership[]);
    setMemberCount(count ?? 0);
    const activeOrgId = selectedOrg?.id && orgIds.includes(selectedOrg.id) ? selectedOrg.id : nextOrgs[0]?.id ?? orgIds[0];
    if (activeOrgId) {
      const [{ data: sessionRows }, { count: incidentCount }] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('status,consent_to_organization_analytics,metrics')
          .eq('organization_id', activeOrgId)
          .eq('consent_to_organization_analytics', true),
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', activeOrgId),
      ]);
      const completedRows = (sessionRows ?? []).filter((row) => row.status === 'completed');
      const adiValues = completedRows
        .map((row) => Number((row.metrics as Record<string, unknown> | null)?.adi ?? (row.metrics as Record<string, unknown> | null)?.ADI))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
      const mroValues = completedRows
        .map((row) => (row.metrics as Record<string, unknown> | null)?.mro)
        .filter((value) => typeof value === 'boolean');
      setAnalytics({
        completed: completedRows.length,
        consented: sessionRows?.length ?? 0,
        adiMedian: adiValues.length ? adiValues[Math.floor(adiValues.length / 2)] : null,
        mroRate: mroValues.length ? mroValues.filter(Boolean).length / mroValues.length : null,
        incidents: incidentCount ?? 0,
        medianRecognitionSeconds: null,
      });
    }
    setSelectedOrg((current) => (current && nextOrgs.some((item) => item.id === current.id) ? current : nextOrgs[0] ?? null));
    setRole(memberships?.find((item) => item.organization_id === (nextOrgs[0]?.id ?? orgIds[0]))?.role ?? 'viewer');
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [authUser?.id]);

  // Load Regional ADI Metrics
  useEffect(() => {
    const fetchRegional = async () => {
      setRegionalLoading(true);
      setRegionalError('');
      try {
        const res = await fetch('/api/analytics/regional-adi');
        if (!res.ok) throw new Error(`regional analytics ${res.status}`);
        const json = await res.json();
        setRegionalMetrics(Array.isArray(json.regions) ? json.regions : []);
      } catch (err) {
        console.warn('Error fetching regional ADI:', err);
        setRegionalError('Chưa thể tải phân tích theo khu vực. Vui lòng thử lại.');
      } finally {
        setRegionalLoading(false);
      }
    };
    void fetchRegional();
  }, []);

  const filteredRegions = useMemo(() => {
    if (selectedDistrict === 'all') return regionalMetrics;
    return regionalMetrics.filter((r) => r.district === selectedDistrict);
  }, [regionalMetrics, selectedDistrict]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set(regionalMetrics.map((r) => r.district).filter(Boolean));
    return Array.from(set);
  }, [regionalMetrics]);

  const filteredSites = useMemo(() => (selectedOrg ? sites.filter((site) => site.organization_id === selectedOrg.id) : []), [selectedOrg, sites]);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !authUser || !form.name.trim()) return;
    const { error: createError } = await supabase
      .from('organizations')
      .insert({ name: form.name.trim(), organization_type: form.organization_type, created_by: authUser.id });
    if (createError) {
      setError('Không thể tạo tổ chức. Vui lòng kiểm tra quyền tài khoản.');
      return;
    }
    setForm({ name: '', organization_type: 'enterprise' });
    setShowCreate(false);
    await loadData();
  };

  const inviteMember = async () => {
    if (!supabase || !authUser || !selectedOrg || !canManage || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setError('Nhập email hợp lệ và chọn tổ chức mà bạn có quyền quản lý.');
      return;
    }
    setInviting(true);
    setError('');
    const { error: inviteError } = await supabase
      .from('organization_invitations')
      .upsert(
        { organization_id: selectedOrg.id, email: inviteEmail.trim().toLowerCase(), role: inviteRole, invited_by: authUser.id },
        { onConflict: 'organization_id,email' }
      );
    if (inviteError) setError('Không thể tạo lời mời. Kiểm tra quyền quản lý tổ chức.');
    else {
      setInviteEmail('');
      setNotice('Đã tạo lời mời trong CSDL. Có thể gửi email mời ở bước tiếp theo.');
    }
    setInviting(false);
  };

  const createSampleWorkspace = async () => {
    if (!supabase || !authUser) return;
    setSeeding(true);
    setError('');
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .insert({
        name: 'GoldenMinutes Demo Workspace',
        organization_type: 'enterprise',
        plan: 'pilot',
        created_by: authUser.id,
      })
      .select('id')
      .single();
    if (organizationError || !organization) {
      setError('Không thể tạo không gian mẫu trong cơ sở dữ liệu.');
      setSeeding(false);
      return;
    }
    const { data: createdSites, error: sitesError } = await supabase.from('sites').insert([
      { organization_id: organization.id, name: 'Văn phòng trung tâm', site_type: 'office', address: 'Dữ liệu mẫu — chưa dùng để điều hướng', province: 'Hồ Chí Minh', status: 'active' },
      { organization_id: organization.id, name: 'Điểm đào tạo cộng đồng', site_type: 'public_area', address: 'Dữ liệu mẫu — cần thay bằng địa chỉ thật', province: 'Hà Nội', status: 'active' },
    ]).select('id');
    const { error: partnershipError } = await supabase.from('data_partnerships').insert({
      organization_id: organization.id,
      partnership_type: 'api',
      name: 'Kết nối dữ liệu mẫu',
      status: 'draft',
      config: { sample: true },
    });
    if (sitesError || partnershipError) {
      setError('Không gian đã tạo nhưng dữ liệu phụ chưa hoàn tất. Vui lòng tải lại để kiểm tra.');
    }
    if (createdSites?.length) {
      await supabase.from('site_subscriptions').insert(createdSites.map((site) => ({ organization_id: organization.id, site_id: site.id, plan: 'pilot', status: 'trial' })));
    }
    await loadData();
    setSeeding(false);
  };

  const handleCreateIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    const newItv: InterventionItem = {
      id: `itv_${Date.now()}`,
      title: interventionForm.title,
      type: interventionForm.type,
      description: interventionForm.description,
      startedAt: new Date().toISOString().split('T')[0],
      beforeADI: 28,
      afterADI: 17,
      beforeMRO: 35,
      afterMRO: 18,
    };
    setInterventions([newItv, ...interventions]);
    setShowInterventionModal(false);
    setInterventionForm({ title: '', type: 'cpr_training', description: '', regionId: 'QTD-P01' });
    setNotice('Đã thiết lập can thiệp mới vào hệ thống theo dõi.');
  };

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 font-sans">
        <div className="w-full rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto size-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">Cổng quản lý tổ chức</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Đăng nhập để theo dõi chỉ số ADI, quản lý điểm an toàn và quy hoạch tài nguyên cấp cứu.
          </p>
          <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8 font-sans">
      {/* Explicit Provenance Banner */}
      <div className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm ${
        dataMode === 'synthetic'
          ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100'
          : 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100'
      }`}>
        <div className="flex items-start gap-3">
          <Layers className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold flex items-center gap-2">
              <span>{dataMode === 'synthetic' ? 'Lớp Dữ Liệu Mô Phỏng (Synthetic Timeline — 2.000 ca)' : 'Lớp Dữ Liệu Thực Nghiệm (Phase 3B Pilot — 40 phiên)'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-white/60 uppercase">
                {dataMode === 'synthetic' ? 'origin=synthetic_seed' : 'origin=training_user'}
              </span>
            </p>
            <p className="mt-1 leading-relaxed">
              {dataMode === 'synthetic'
                ? 'Dữ liệu mô phỏng dựa trên phân phối Log-Normal để minh họa luồng ra quyết định can thiệp; không phản ánh ca cấp cứu thực tế ngoài đời.'
                : 'Dữ liệu thực nghiệm thu thập từ ng��ời học tình nguyện có phiếu đồng thuận (Informed Consent theo NĐ 13/2023/NĐ-CP).'}
            </p>
          </div>
        </div>

        {/* Toggle between synthetic and pilot study */}
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/80 p-1 border border-border shadow-2xs">
          <button
            type="button"
            onClick={() => setDataMode('synthetic')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              dataMode === 'synthetic' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mô phỏng
          </button>
          <button
            type="button"
            onClick={() => setDataMode('pilot')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              dataMode === 'pilot' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thực nghiệm (Pilot)
          </button>
        </div>
      </div>

      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GoldenMinutes for organizations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Trung Tâm Dữ Liệu & Ra Quyết Định Cứu Hộ</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Theo dõi Avoidable Delay Index (ADI), nhận diện điểm nghẽn phản xạ và đo lường hiệu quả các can thiệp thực tế.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowInterventionModal(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-2xs hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Thiết lập can thiệp
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-2xs hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Tạo tổ chức
          </button>
        </div>
      </header>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {loading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted">
          <div className="size-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" aria-hidden="true" />
          <span>Đang tải dữ liệu tổ chức từ Supabase…</span>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="dashboard-kpi rounded-2xl border border-border bg-surface p-5 shadow-2xs">
              <span className="dashboard-kpi__bar bg-blue-600" aria-hidden="true" />
              <Activity className="size-5 text-primary" />
              <p className="mt-4 text-3xl font-extrabold text-foreground">
                {dataMode === 'synthetic' ? analytics.incidents.toLocaleString('vi-VN') : analytics.completed.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {dataMode === 'synthetic' ? 'Tổng sự cố mô phỏng (90 ngày)' : 'Phiên thực nghiệm (Phase 3B)'}
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
              <TrendingDown className="size-5 text-emerald-600" />
              <p className="mt-4 text-3xl font-extrabold text-emerald-700">
                {analytics.adiMedian == null ? '—' : `${analytics.adiMedian.toFixed(1)}s`}
              </p>
              <p className="mt-1 text-sm text-muted">ADI Trung vị (Độ trễ có thể phòng tránh)</p>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
              <AlertTriangle className="size-5 text-amber-600" />
              <p className="mt-4 text-3xl font-extrabold text-amber-700">
                {analytics.mroRate == null ? '—' : `${(analytics.mroRate * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-sm text-muted">Tỷ lệ nguy cơ lọt thời gian vàng (MRO)</p>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
              <ShieldCheck className="size-5 text-blue-600" />
              <p className="mt-4 text-3xl font-extrabold text-blue-700">
                {activeSites.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-sm text-muted">
                Điểm an toàn đang hoạt động · {memberCount.toLocaleString('vi-VN')} thành viên
              </p>
            </article>
          </section>

          {/* Regional ADI Heatmap & Analysis */}
          <section className="mt-8 rounded-3xl border border-border bg-surface overflow-hidden shadow-2xs">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Regional Hotspots</p>
                <h2 className="mt-1 text-xl font-bold">Phân Tích ADI Theo Phường / Quận TP.HCM</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Bảng tổng hợp từ view <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">v_region_daily_adi</code> với cơ chế ẩn ô dưới 5 ca (k-anonymity).
                </p>
              </div>

              {/* District Filter */}
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="all">Tất cả quận / huyện ({regionalMetrics.length} điểm)</option>
                  {uniqueDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {regionalError && <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{regionalError}</p>}
            {regionalLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted">
                <div className="size-7 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" aria-hidden="true" />
                Đang tải dữ liệu khu vực…
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border text-xs uppercase font-bold text-muted">
                  <tr>
                    <th className="px-5 py-3.5">Mã vùng / Tên phường</th>
                    <th className="px-5 py-3.5">Quận / Huyện</th>
                    <th className="px-5 py-3.5 text-right">Số lượng ca</th>
                    <th className="px-5 py-3.5 text-right">TTG Trung bình</th>
                    <th className="px-5 py-3.5 text-right">TTC Trung bình</th>
                    <th className="px-5 py-3.5 text-right">ADI Trung bình</th>
                    <th className="px-5 py-3.5 text-right">Tỷ lệ MRO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRegions.map((r) => (
                    <tr key={r.region_id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-bold">
                        <span className="font-mono text-xs text-muted mr-2">{r.region_id}</span>
                        <span>{r.name}</span>
                      </td>
                      <td className="px-5 py-4 text-muted">{r.district}</td>
                      <td className="px-5 py-4 text-right font-semibold">{r.incident_count} ca</td>
                      {r.suppressed ? (
                        <td colSpan={4} className="px-5 py-4 text-center italic text-xs text-amber-700 bg-amber-50/40">
                          * Dưới 5 ca — Đã ẩn số liệu nhằm bảo vệ quyền riêng tư (k-anonymity NĐ 13/2023/NĐ-CP)
                        </td>
                      ) : (
                        <>
                          <td className="px-5 py-4 text-right">{r.avg_ttg_sec}s</td>
                          <td className="px-5 py-4 text-right">{r.avg_ttc_sec}s</td>
                          <td className="px-5 py-4 text-right font-bold text-emerald-700">{r.adi_avg}s</td>
                          <td className="px-5 py-4 text-right font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              (r.mro_rate_percent || 0) > 30 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {r.mro_rate_percent}%
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredRegions.length && <p className="px-5 py-8 text-center text-sm text-muted">Chưa có dữ liệu khu vực đủ điều kiện hiển thị.</p>}
            </div>
            )}
          </section>

          {/* Decision -> Action -> Measure Closed Loop (Interventions) */}
          <section className="mt-8 rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Closed-Loop Governance</p>
                <h2 className="mt-1 text-xl font-bold">Vòng Lặp Can Thiệp & Đo Lường (Intervention Evaluations)</h2>
                <p className="mt-1 text-sm text-muted">
                  Chu trình: <strong>DECISION → ACTION → MEASURE → NEW DATA</strong> đánh giá độ trễ trước vs sau can thiệp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInterventionModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
              >
                <span>+ Thêm can thiệp mới</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {interventions.map((itv) => (
                <article key={itv.id} className="rounded-2xl border border-border bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {itv.type === 'cpr_training' ? 'Tập huấn cộng đồng' : 'Quy hoạch AED'}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{itv.title}</h3>
                      <p className="mt-1 text-xs text-muted leading-relaxed">{itv.description}</p>
                    </div>
                  </div>

                  {/* Before vs After Metric Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div className="rounded-xl bg-white p-3 border border-border">
                      <p className="text-[11px] font-semibold text-muted uppercase">ADI Trung vị (Trước → Sau)</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-400 line-through">{itv.beforeADI}s</span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className="text-lg font-extrabold text-emerald-700">{itv.afterADI}s</span>
                        <span className="text-xs font-bold text-emerald-600">(-{Math.round(((itv.beforeADI - itv.afterADI) / itv.beforeADI) * 100)}%)</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-border">
                      <p className="text-[11px] font-semibold text-muted uppercase">Tỷ lệ MRO (Trước → Sau)</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-400 line-through">{itv.beforeMRO}%</span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className="text-lg font-extrabold text-emerald-700">{itv.afterMRO}%</span>
                        <span className="text-xs font-bold text-emerald-600">(-{itv.beforeMRO - itv.afterMRO}%)</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Existing Workspaces & Sites Management */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Các cơ sở thuộc hệ thống</h2>
                  <p className="mt-1 text-sm text-muted">Theo dõi site, điểm an toàn và năng lực ứng phó.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {filteredSites.length ? (
                  filteredSites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                      <div className="min-w-0">
                        <p className="font-bold">{site.name}</p>
                        <p className="mt-1 truncate text-sm text-muted">{site.address || 'Chưa cập nhật địa chỉ'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${site.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {site.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-background p-5 text-sm text-muted">Chưa có site. Tạo site để bắt đầu theo dõi an toàn theo địa điểm.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <article className="rounded-3xl bg-[#14213d] p-6 text-white shadow-sm">
                <KeyRound className="size-6 text-[#fda4af]" />
                <h2 className="mt-5 text-xl font-bold">API & Data Partnership</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Kết nối dữ liệu an toàn, API theo tổ chức và bộ nhận diện co-branding cho đối tác cứu hộ.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-300 space-y-1">
                  <p>• Trích xuất báo cáo pilot CSV: <code className="text-emerald-400">scripts/export-pilot-report.ts</code></p>
                  <p>• Sinh kịch bản sự cố TP.HCM: <code className="text-emerald-400">scripts/generate-incident-timeline.ts</code></p>
                </div>
              </article>
            </section>
          </div>
        </>
      )}

      {/* Create Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateIntervention} className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Thiết Lập Can Thiệp Mới</h2>
              <button type="button" onClick={() => setShowInterventionModal(false)} aria-label="Đóng">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Đăng ký hành động cải thiện phản xạ tại khu vực hoặc đơn vị trực thuộc để đo lường Before vs After.
            </p>

            <label className="block text-sm font-semibold">
              Tên chiến dịch can thiệp
              <input
                required
                value={interventionForm.title}
                onChange={(e) => setInterventionForm({ ...interventionForm, title: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Ví dụ: Đào tạo CPR nhân viên văn phòng Bitexco"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                Loại hình
                <select
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="cpr_training">Tập huấn CPR / FAST</option>
                  <option value="aed_verification">Lắp đặt & Thẩm định AED</option>
                  <option value="process_change">Đổi quy trình kích hoạt 115</option>
                  <option value="community_campaign">Chiến dịch cộng đồng</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Khu vực trọng điểm
                <select
                  value={interventionForm.regionId}
                  onChange={(e) => setInterventionForm({ ...interventionForm, regionId: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {regionalMetrics.map((r) => (
                    <option key={r.region_id} value={r.region_id}>
                      {r.name} ({r.district})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Mô tả chi tiết mục tiêu
              <textarea
                value={interventionForm.description}
                onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
                className="mt-1.5 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm"
                placeholder="Mục tiêu giảm ADI từ 30s xuống dưới 15s trong vòng 60 ngày..."
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInterventionModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Khởi tạo can thiệp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={createOrganization} className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Tạo tổ chức</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Đóng">
                <X className="size-5" />
              </button>
            </div>
            <label className="mt-6 block text-sm font-semibold">
              Tên tổ chức
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3"
                placeholder="Ví dụ: Trường THPT GoldenMinutes"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Loại hình
              <select
                value={form.organization_type}
                onChange={(event) => setForm({ ...form, organization_type: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">
              Tạo không gian quản lý
            </button>
          </form>
        </div>
      )}
    </main>
  );
};
