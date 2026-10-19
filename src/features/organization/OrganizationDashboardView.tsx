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
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../services/supabase/client';
import { useFacilities } from '../nearby/useFacilities';
import { findProvince } from '../nearby/geo';
import { calculateMedian } from '../../domain/metrics/calculator';

type Organization = { id: string; name: string; organization_type: string; plan: string; status: string };
type Site = { id: string; organization_id: string; name: string; address: string | null; is_active: boolean };
type Partnership = { id: string; name: string; agreement_type: string; status: string };
type TrainingEvent = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  delivery_mode: 'onsite' | 'online' | 'hybrid';
  meeting_url: string | null;
  capacity: number | null;
  registeredCount: number;
  registeredByMe: boolean;
};

interface RegionMetric {
  region_id: string;
  name: string;
  district: string;
  province?: string;
  incident_date?: string;
  origin?: string;
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
  beforeADI: number | null;
  afterADI: number | null;
  beforeMRO: number | null;
  afterMRO: number | null;
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

const escapeIcsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const toIcsDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function downloadTrainingEvent(event: TrainingEvent) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GoldenMinutes//Training Events//VI', 'BEGIN:VEVENT',
    `UID:${event.id}@goldenminutes`, `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.starts_at)}`, `DTEND:${toIcsDate(event.ends_at)}`,
    `SUMMARY:${escapeIcsText(event.title)}`, `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.venue || event.meeting_url || '')}`,
    ...(event.meeting_url ? [`URL:${event.meeting_url}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  const file = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${event.title.trim().replace(/[^\p{L}\p{N}-]+/gu, '-') || 'goldenminutes-training'}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const OrganizationDashboardView: React.FC = () => {
  const { isAuthenticated, authUser } = useAuth();
  const { data: facilityData, isLoading: facilityLoading } = useFacilities();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [role, setRole] = useState('viewer');
  const [membershipRoles, setMembershipRoles] = useState<Record<string, string>>({});
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', organization_type: 'enterprise' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const [regionalMetrics, setRegionalMetrics] = useState<RegionMetric[]>([]);
  const [regionalLoading, setRegionalLoading] = useState(true);
  const [regionalError, setRegionalError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  const [interventionForm, setInterventionForm] = useState({
    title: '',
    type: 'cpr_training',
    description: '',
    regionId: '',
  });

  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    venue: '',
    deliveryMode: 'onsite' as TrainingEvent['delivery_mode'],
    meetingUrl: '',
    capacity: '',
  });

  const [analytics, setAnalytics] = useState({
    completed: 0,
    consented: 0,
    adiMedian: null as number | null,
    mroRate: null as number | null,
    medianRecognitionSeconds: null as number | null,
  });

  const publicOverview = useMemo(() => {
    const facilities = facilityData?.facilities ?? [];
    const provinces = new Map<string, number>();
    for (const facility of facilities) {
      const province = findProvince(facility.province ?? '')?.name ?? facility.province ?? 'Khác';
      provinces.set(province, (provinces.get(province) ?? 0) + 1);
    }
    const ranked = [...provinces.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      total: facilities.length,
      aed: facilities.filter((facility) => facility.type === 'aed').length,
      medical: facilities.filter((facility) => facility.type !== 'aed').length,
      verifiedAed: facilities.filter((facility) => facility.type === 'aed' && facility.verification === 'verified').length,
      provinces: ranked,
      max: Math.max(1, ...ranked.map(([, count]) => count)),
    };
  }, [facilityData]);

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
      const [{ data: sessionRows }] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('status,consent_to_organization_analytics,metrics')
          .eq('organization_id', activeOrgId)
          .eq('consent_to_organization_analytics', true),
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
        adiMedian: adiValues.length ? calculateMedian(adiValues) : null,
        mroRate: mroValues.length ? mroValues.filter(Boolean).length / mroValues.length : null,
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

  useEffect(() => {
    let cancelled = false;
    const loadInterventions = async () => {
      if (!supabase || !selectedOrg) {
        setInterventions([]);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/analytics/interventions?orgId=${encodeURIComponent(selectedOrg.id)}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!response.ok) throw new Error(`interventions ${response.status}`);
        const { interventions: rows } = await response.json();
        if (cancelled) return;
        setInterventions((rows ?? []).map((row: Record<string, any>) => {
          const evaluations = Array.isArray(row.intervention_evaluations) ? row.intervention_evaluations : [];
          const adi = evaluations.find((item: Record<string, unknown>) => item.metric_key === 'adi');
          const mro = evaluations.find((item: Record<string, unknown>) => item.metric_key === 'mro_rate');
          return {
            id: row.id,
            title: row.title,
            type: row.type,
            description: row.description ?? '',
            startedAt: row.started_at ?? row.startedAt,
            beforeADI: adi ? Number(adi.value_before) : null,
            afterADI: adi ? Number(adi.value_after) : null,
            beforeMRO: mro ? Number(mro.value_before) : null,
            afterMRO: mro ? Number(mro.value_after) : null,
          };
        }));
      } catch {
        if (!cancelled) setError('Không thể tải các can thiệp đã ghi nhận.');
      }
    };
    void loadInterventions();
    return () => { cancelled = true; };
  }, [authUser?.id, selectedOrg?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      if (!supabase || !selectedOrg) {
        setTrainingEvents([]);
        setEventLoading(false);
        return;
      }
      setEventLoading(true);
      setEventError('');
      const { data, error: queryError } = await supabase
        .from('organization_training_events')
        .select('id,organization_id,title,description,starts_at,ends_at,venue,delivery_mode,meeting_url,capacity')
        .eq('organization_id', selectedOrg.id)
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(12);
      if (cancelled) return;
      if (queryError) setEventError('Chưa tải được lịch tập huấn. Hãy áp dụng migration lịch tập huấn rồi thử lại.');
      else {
        const rows = data ?? [];
        const eventIds = rows.map((row) => row.id);
        let attendeeRows: Array<{ event_id: string }> = [];
        let ownEventIds = new Set<string>();
        if (eventIds.length) {
          const [attendeesResult, ownResult] = await Promise.all([
            supabase.from('organization_training_event_attendees').select('event_id').in('event_id', eventIds),
            supabase.from('organization_training_event_attendees').select('event_id').in('event_id', eventIds).eq('user_id', authUser?.id ?? ''),
          ]);
          attendeeRows = (attendeesResult.data ?? []) as Array<{ event_id: string }>;
          ownEventIds = new Set((ownResult.data ?? []).map((row) => row.event_id));
        }
        if (cancelled) return;
        setTrainingEvents(rows.map((row) => ({
          ...row,
          registeredCount: attendeeRows.filter((attendee) => attendee.event_id === row.id).length,
          registeredByMe: ownEventIds.has(row.id),
        })) as TrainingEvent[]);
      }
      setEventLoading(false);
    };
    void loadEvents();
    return () => { cancelled = true; };
  }, [authUser?.id, selectedOrg?.id]);

  const createTrainingEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !authUser || !selectedOrg || !canManage) return;
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      setEventError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    const meetingUrl = eventForm.meetingUrl.trim();
    if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) {
      setEventError('Liên kết phòng họp phải bắt đầu bằng http:// hoặc https://.');
      return;
    }
    setEventError('');
    const { data, error: insertError } = await supabase.from('organization_training_events').insert({
      organization_id: selectedOrg.id,
      created_by: authUser.id,
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      venue: eventForm.venue.trim(),
      delivery_mode: eventForm.deliveryMode,
      meeting_url: meetingUrl || null,
      capacity: eventForm.capacity ? Number(eventForm.capacity) : null,
    }).select('id,organization_id,title,description,starts_at,ends_at,venue,delivery_mode,meeting_url,capacity').single();
    if (insertError || !data) {
      setEventError('Không thể lưu lịch. Kiểm tra quyền quản lý và cấu hình cơ sở dữ liệu.');
      return;
    }
    setTrainingEvents((current) => [...current, { ...data, registeredCount: 0, registeredByMe: false } as TrainingEvent].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setEventForm({ title: '', description: '', startsAt: '', endsAt: '', venue: '', deliveryMode: 'onsite', meetingUrl: '', capacity: '' });
    setShowEventModal(false);
    setNotice('Đã lên lịch tập huấn. Tải lịch để thêm lời nhắc vào ứng dụng lịch của bạn.');
  };

  const toggleEventRegistration = async (event: TrainingEvent) => {
    if (!supabase || !authUser) return;
    setEventError('');
    if (event.registeredByMe) {
      const { error: deleteError } = await supabase.from('organization_training_event_attendees').delete().eq('event_id', event.id).eq('user_id', authUser.id);
      if (deleteError) {
        setEventError('Chưa thể hủy đăng ký. Vui lòng thử lại.');
        return;
      }
      setTrainingEvents((current) => current.map((item) => item.id === event.id ? { ...item, registeredByMe: false, registeredCount: Math.max(0, item.registeredCount - 1) } : item));
      return;
    }
    const { data, error: registerError } = await supabase.rpc('register_for_training_event', { p_event_id: event.id });
    if (registerError) {
      setEventError(registerError.message.includes('EVENT_FULL') ? 'Buổi tập huấn đã đủ chỗ.' : 'Chưa thể đăng ký. Kiểm tra tư cách thành viên tổ chức và thử lại.');
      return;
    }
    setTrainingEvents((current) => current.map((item) => item.id === event.id ? { ...item, registeredByMe: true, registeredCount: Number(data ?? item.registeredCount + 1) } : item));
  };

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

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedOrg) {
      setError('Chọn tổ chức trước khi tạo can thiệp.');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/analytics/interventions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          regionId: interventionForm.regionId || null,
          type: interventionForm.type,
          title: interventionForm.title.trim(),
          description: interventionForm.description.trim(),
          startedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error(`intervention ${response.status}`);
      const { intervention } = await response.json();
      setInterventions((current) => [{
        id: intervention.id,
        title: intervention.title,
        type: intervention.type,
        description: intervention.description ?? '',
        startedAt: intervention.startedAt ?? intervention.started_at ?? new Date().toISOString(),
        beforeADI: null,
        afterADI: null,
        beforeMRO: null,
        afterMRO: null,
      }, ...current]);
      setShowInterventionModal(false);
      setInterventionForm({ title: '', type: 'cpr_training', description: '', regionId: '' });
      setNotice('Đã ghi nhận can thiệp. Chỉ số trước và sau sẽ xuất hiện khi có đủ dữ liệu đánh giá.');
    } catch {
      setError('Không thể lưu can thiệp. Kiểm tra quyền quản lý tổ chức và thử lại.');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-var(--header-height))] w-full max-w-6xl flex-col gap-6 px-4 py-8 pb-24 font-sans sm:px-6">
        <header className="rounded-3xl border border-border bg-gradient-to-br from-primary-soft via-surface to-surface p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GoldenMinutes · Toàn quốc</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mạng lưới hỗ trợ cộng đồng</h1>
          <p className="mt-3 max-w-2xl leading-6 text-muted">Tổng quan danh bạ cơ sở y tế và AED, cùng khả năng khám phá theo tỉnh, thành phố.</p>
        </header>
        <section aria-label="Tổng quan danh bạ" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Điểm trong danh bạ', publicOverview.total],
            ['Điểm AED', publicOverview.aed],
            ['Cơ sở y tế', publicOverview.medical],
            ['AED đã xác minh', publicOverview.verifiedAed],
          ].map(([label, value]) => <article key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-foreground">{facilityLoading ? '—' : Number(value).toLocaleString('vi-VN')}</p>
          </article>)}
        </section>
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Phân bố địa lý</p><h2 className="mt-1 text-xl font-bold">Điểm hỗ trợ theo tỉnh, thành</h2></div>
            <Link to="/nearby" className="text-sm font-bold text-primary hover:underline">Mở bản đồ toàn quốc <ChevronRight className="inline size-4" aria-hidden="true" /></Link>
          </div>
          {publicOverview.provinces.length ? <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {publicOverview.provinces.map(([province, count]) => <li key={province}>
              <Link to={`/nearby?province=${encodeURIComponent(province)}`} className="group block rounded-xl bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold group-hover:text-primary">{province}</span><span className="font-mono tabular-nums text-muted">{count}</span></div>
                <span className="block h-2 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(count / publicOverview.max) * 100}%` }} /></span>
              </Link>
            </li>)}
          </ul> : <p className="mt-5 rounded-xl bg-background p-4 text-sm text-muted">Danh bạ đang được cập nhật.</p>}
        </section>
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="font-bold">Dành cho tổ chức</h2><p className="mt-1 text-sm text-muted">Đăng nhập để xem dữ liệu riêng, quản lý cơ sở và theo dõi chỉ số tổ chức.</p></div>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:border-primary">Về trang chủ</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-6 lg:px-8 font-sans">
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex items-start gap-3">
          <Layers className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Phạm vi dữ liệu tổ chức</p>
            <p className="mt-1 leading-relaxed">Chỉ số bên dưới được tính từ phiên luyện tập hoàn tất có đồng thuận chia sẻ trong tổ chức; không đại diện cho ca cấp cứu thực tế.</p>
          </div>
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
          {canManage && <button
            type="button"
            onClick={() => setShowInterventionModal(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-2xs hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Thiết lập can thiệp
          </button>}
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
                {analytics.completed.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-sm text-muted">
                Phiên luyện tập hoàn tất
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
                <h2 className="mt-1 text-xl font-bold">Phân tích ADI theo khu vực có dữ liệu</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Dữ liệu hiện có được ghi nhận tại các khu vực TP.HCM. Mỗi dòng là một ngày và nguồn dữ liệu; các ô dưới 5 ca được ẩn để bảo vệ quyền riêng tư.
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
                  <option value="all">Tất cả khu vực ({regionalMetrics.length} điểm)</option>
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
                    <th className="px-5 py-3.5">Khu vực / Ngày</th>
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
                    <tr key={`${r.region_id}-${r.incident_date ?? ''}-${r.origin ?? ''}`} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-bold">
                        <span className="font-mono text-xs text-muted mr-2">{r.region_id}</span>
                        <span>{r.name || 'Khu vực chưa định danh'}</span>
                        {r.incident_date && <span className="mt-1 block text-xs font-normal text-muted">{new Date(`${r.incident_date}T00:00:00`).toLocaleDateString('vi-VN')}{r.origin ? ` · ${r.origin}` : ''}</span>}
                      </td>
                      <td className="px-5 py-4 text-muted">{r.district || '—'}</td>
                      <td className="px-5 py-4 text-right font-semibold">{r.suppressed ? 'Đã ẩn' : `${r.incident_count} ca`}</td>
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

          <section className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><CalendarDays className="size-4" aria-hidden="true" />Hoạt động tổ chức</p>
                <h2 className="mt-1 text-xl font-bold">Lịch tập huấn sắp tới</h2>
                <p className="mt-1 text-sm text-muted">Lên lịch CPR, sử dụng AED và diễn tập; thêm buổi tập huấn vào lịch cá nhân chỉ với một tệp.</p>
              </div>
              {canManage && <button type="button" onClick={() => { setEventError(''); setShowEventModal(true); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark"><Plus className="size-4" aria-hidden="true" />Lên lịch tập huấn</button>}
            </div>
            {eventError && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{eventError}</p>}
            {eventLoading ? <p className="mt-4 animate-pulse rounded-xl bg-background p-5 text-sm text-muted">Đang tải lịch…</p> : trainingEvents.length ? (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {trainingEvents.map((item) => <li key={item.id} className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">{item.delivery_mode === 'online' ? 'Trực tuyến' : item.delivery_mode === 'hybrid' ? 'Kết hợp' : 'Trực tiếp'}</span>
                      <h3 className="mt-3 font-bold">{item.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void toggleEventRegistration(item)} disabled={!item.registeredByMe && item.capacity != null && item.registeredCount >= item.capacity} className="min-h-10 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">{item.registeredByMe ? 'Hủy đăng ký' : 'Đăng ký'}</button>
                      <button type="button" onClick={() => downloadTrainingEvent(item)} className="min-h-10 rounded-lg border border-border bg-surface px-3 text-xs font-semibold hover:border-primary">Thêm vào lịch</button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{new Date(item.starts_at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <p className="mt-1 text-sm text-muted">{item.venue || (item.meeting_url ? 'Liên kết tham gia được cung cấp bởi tổ chức' : 'Địa điểm đang cập nhật')} · {item.registeredCount}{item.capacity ? `/${item.capacity}` : ''} người đăng ký</p>
                  {item.description && <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>}
                  {item.meeting_url && <a href={item.meeting_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-4">Mở phòng tập huấn trực tuyến</a>}
                </li>)}
              </ul>
            ) : <p className="mt-4 rounded-xl bg-background p-5 text-sm text-muted">Chưa có buổi tập huấn sắp tới được lên lịch.</p>}
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
              {canManage && <button
                type="button"
                onClick={() => setShowInterventionModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
              >
                <span>+ Thêm can thiệp mới</span>
                <ChevronRight className="size-3.5" />
              </button>}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {interventions.length ? interventions.map((itv) => (
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
                        {itv.beforeADI != null && itv.afterADI != null ? <>
                          <span className="text-sm font-semibold text-slate-400 line-through">{itv.beforeADI}s</span>
                          <ArrowRight className="size-3 text-slate-400" />
                          <span className="text-lg font-extrabold text-emerald-700">{itv.afterADI}s</span>
                          <span className="text-xs font-bold text-emerald-600">(-{Math.round(((itv.beforeADI - itv.afterADI) / Math.max(itv.beforeADI, 1)) * 100)}%)</span>
                        </> : <span className="text-sm text-muted">Chưa có đủ dữ liệu đánh giá</span>}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-border">
                      <p className="text-[11px] font-semibold text-muted uppercase">Tỷ lệ MRO (Trước → Sau)</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        {itv.beforeMRO != null && itv.afterMRO != null ? <>
                          <span className="text-sm font-semibold text-slate-400 line-through">{itv.beforeMRO}%</span>
                          <ArrowRight className="size-3 text-slate-400" />
                          <span className="text-lg font-extrabold text-emerald-700">{itv.afterMRO}%</span>
                          <span className="text-xs font-bold text-emerald-600">(-{itv.beforeMRO - itv.afterMRO}%)</span>
                        </> : <span className="text-sm text-muted">Chưa có đủ dữ liệu đánh giá</span>}
                      </div>
                    </div>
                  </div>
                </article>
              )) : <p className="col-span-full rounded-xl bg-background p-5 text-sm text-muted">Chưa có can thiệp nào được ghi nhận.</p>}
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

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={createTrainingEvent} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Lịch tổ chức</p><h2 className="mt-1 text-xl font-bold">Lên lịch tập huấn</h2></div>
              <button type="button" onClick={() => setShowEventModal(false)} aria-label="Đóng" className="flex size-10 items-center justify-center rounded-full bg-background"><X className="size-5" /></button>
            </div>
            <label className="block text-sm font-semibold">Tên buổi tập huấn<input required minLength={3} maxLength={160} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" placeholder="CPR và sử dụng AED cơ bản" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Bắt đầu<input required type="datetime-local" value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" /></label>
              <label className="block text-sm font-semibold">Kết thúc<input required type="datetime-local" value={eventForm.endsAt} onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Hình thức<select value={eventForm.deliveryMode} onChange={(e) => setEventForm({ ...eventForm, deliveryMode: e.target.value as TrainingEvent['delivery_mode'] })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3"><option value="onsite">Trực tiếp</option><option value="online">Trực tuyến</option><option value="hybrid">Kết hợp</option></select></label>
              <label className="block text-sm font-semibold">Số chỗ<input type="number" min={1} max={10000} value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" placeholder="Không giới hạn" /></label>
            </div>
            <label className="block text-sm font-semibold">Địa điểm<input value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" placeholder="Địa chỉ hoặc tên cơ sở" /></label>
            {eventForm.deliveryMode !== 'onsite' && <label className="block text-sm font-semibold">Liên kết phòng tập huấn<input type="url" value={eventForm.meetingUrl} onChange={(e) => setEventForm({ ...eventForm, meetingUrl: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" placeholder="https://…" /></label>}
            <label className="block text-sm font-semibold">Nội dung<textarea rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-background p-3" placeholder="Mục tiêu, nội dung và điều cần chuẩn bị" /></label>
            {eventError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{eventError}</p>}
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowEventModal(false)} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold">Hủy</button><button type="submit" className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Lưu lịch tập huấn</button></div>
          </form>
        </div>
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
                  <option value="">Chọn khu vực</option>
                  {[...new Map(regionalMetrics.map((r) => [r.region_id, r])).values()].map((r) => (
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
