import {
  TrainingSession,
  DailyAggregate,
  UserProfile,
  Scenario,
  CommunityFacility,
  ResponderSimulation,
  AuditLog,
  DeletionRequest,
  DataOrigin,
  VolunteerApplication,
  ResponderProfile,
  VolunteerStatus,
} from '../src/domain/schemas';
import { APPROVED_SCENARIOS } from '../src/content/approvedScenarios';
import { aggregateSessions, calculateDelayFunnel } from '../src/domain/metrics/calculator';

// In-memory data structures with seed fixtures
export class ServerDataStore {
  public users: Map<string, UserProfile> = new Map();
  public userTokens: Map<string, string> = new Map(); // token -> uid
  public phoneOtpStore: Map<string, { code: string; expiresAt: number; phoneMasked: string }> = new Map();
  public scenarios: Map<string, Scenario> = new Map();
  public sessions: Map<string, TrainingSession> = new Map();
  public facilities: Map<string, CommunityFacility> = new Map();
  public volunteerApplications: Map<string, VolunteerApplication> = new Map();
  public auditLogs: AuditLog[] = [];
  public deletionRequests: Map<string, DeletionRequest> = new Map();

  constructor() {
    this.initScenarios();
    this.initFacilities();
  }

  private initScenarios() {
    for (const sc of APPROVED_SCENARIOS) {
      this.scenarios.set(sc.id, JSON.parse(JSON.stringify(sc)));
    }
  }

  private initFacilities() {
    const seedFacilities: CommunityFacility[] = [
      {
        id: 'fac_station_115_hcm',
        name: 'Trung Tâm Cấp Cứu 115 TP. Hồ Chí Minh',
        type: 'emergency_station',
        address: '524 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
        lat: 10.7733,
        lng: 106.6603,
        regionCell: 'hcm_q10',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'verified',
        disclaimer: 'Cơ sở cấp cứu 115 công lập. Khi có nạn nhân cần cấp cứu khẩn cấp, vui lòng bấm gọi 115 trực tiếp.',
      },
      {
        id: 'fac_hosp_nd115',
        name: 'Bệnh viện Nhân Dân 115 (Khoa Cấp cứu)',
        type: 'hospital',
        address: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
        lat: 10.7725,
        lng: 106.6612,
        regionCell: 'hcm_q10',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'verified',
        disclaimer: 'Bệnh viện tuyến cuối đa khoa. Dữ liệu phục vụ tham khảo cộng đồng.',
      },
      {
        id: 'fac_hosp_01',
        name: 'Bệnh viện Đa khoa Sài Gòn',
        type: 'hospital',
        address: '125 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        lat: 10.7725,
        lng: 106.6985,
        regionCell: 'hcm_q1_central',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'verified',
        disclaimer: 'Bệnh viện công lập khu vực trung tâm TP.HCM.',
      },
      {
        id: 'fac_hosp_02',
        name: 'Bệnh viện Nhân dân Gia Định',
        type: 'hospital',
        address: '01 Nơ Trang Long, Phường 7, Bình Thạnh, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Bình Thạnh',
        lat: 10.8035,
        lng: 106.6953,
        regionCell: 'hcm_binhthanh_core',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'verified',
        disclaimer: 'Bệnh viện đa khoa hạng 1 TP.HCM.',
      },
      {
        id: 'fac_aed_01',
        name: 'Điểm AED Tham Khảo — Công viên 23/9',
        type: 'aed',
        address: 'Đường Lê Lai, Phường Bến Thành, Quận 1, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        lat: 10.7702,
        lng: 106.6934,
        regionCell: 'hcm_q1_central',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'synthetic_simulation',
        disclaimer: 'Dữ liệu vị trí tham khảo theo đề xuất trang bị AED nơi công cộng.',
      },
      {
        id: 'fac_aed_02',
        name: 'Điểm AED Tham Khảo — Nhà thi đấu Nguyễn Du',
        type: 'aed',
        address: '116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        lat: 10.7745,
        lng: 106.6922,
        regionCell: 'hcm_q1_central',
        isPublicAccess: true,
        operatingHours: '06:00 - 22:00',
        status: 'synthetic_simulation',
        disclaimer: 'Dữ liệu vị trí tham khảo theo đề xuất trang bị AED nơi công cộng.',
      },
      {
        id: 'fac_aed_03',
        name: 'Điểm AED Tham Khảo — Co.opmart Cống Quỳnh',
        type: 'aed',
        address: '189C Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        lat: 10.7656,
        lng: 106.6872,
        regionCell: 'hcm_q1_west',
        isPublicAccess: true,
        operatingHours: '08:00 - 22:00',
        status: 'synthetic_simulation',
        disclaimer: 'Dữ liệu vị trí tham khảo theo đề xuất trang bị AED nơi công cộng.',
      },
      {
        id: 'fac_aed_nha_trang',
        name: 'Điểm AED Tham Khảo — Quảng Trường 2/4 Nha Trang',
        type: 'aed',
        address: 'Đường Trần Phú, Lộc Thọ, TP. Nha Trang, Khánh Hòa',
        province: 'Khánh Hòa',
        district: 'Nha Trang',
        lat: 12.2388,
        lng: 109.1967,
        regionCell: 'cell_nt',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'synthetic_simulation',
        disclaimer: 'Dữ liệu tham khảo theo Đề án số hóa thiết bị sơ cấp cứu công cộng tỉnh Khánh Hòa.',
      },
    ];

    for (const f of seedFacilities) {
      this.facilities.set(f.id, f);
    }
  }

  // Session Query Filters
  public getSessions(options: {
    dataOrigin?: DataOrigin;
    scenarioId?: string;
    regionCell?: string;
    startDate?: string;
    endDate?: string;
    ownerUid?: string;
  }): TrainingSession[] {
    const list: TrainingSession[] = [];
    for (const session of this.sessions.values()) {
      if (options.dataOrigin && session.dataOrigin !== options.dataOrigin) continue;
      if (options.scenarioId && session.scenarioId !== options.scenarioId) continue;
      if (options.regionCell && session.regionCell !== options.regionCell) continue;
      if (options.ownerUid && session.ownerUid !== options.ownerUid) continue;

      if (options.startDate && session.startedAt < options.startDate) continue;
      if (options.endDate && session.startedAt > options.endDate) continue;

      list.push(session);
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // Daily Aggregates Computation
  public getDailyAggregates(options: {
    dataOrigin?: DataOrigin;
    scenarioId?: string;
    days?: number;
  }): DailyAggregate[] {
    const dataOrigin = options.dataOrigin || 'synthetic_seed';
    const days = options.days || 30;
    const allMatching = this.getSessions({ dataOrigin, scenarioId: options.scenarioId });

    // Group by Date
    const byDate = new Map<string, TrainingSession[]>();
    for (const s of allMatching) {
      const d = s.startedAt.split('T')[0];
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(s);
    }

    const aggregates: DailyAggregate[] = [];
    for (const [d, sessList] of byDate.entries()) {
      aggregates.push(aggregateSessions(sessList, d, dataOrigin));
    }

    return aggregates
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }

  // Anonymized Region Cells Aggregates for Map (enforcing k-anonymity >= 5)
  public getRegionAggregates(dataOrigin: DataOrigin = 'synthetic_seed') {
    const sessions = this.getSessions({ dataOrigin });
    const regionMap = new Map<string, { sessions: TrainingSession[]; name: string; lat: number; lng: number }>();

    const knownRegions: Record<string, { name: string; lat: number; lng: number }> = {
      hcm_q1_central: { name: 'Quận 1 — Bến Thành / Lê Lợi', lat: 10.7725, lng: 106.698 },
      hcm_q1_west: { name: 'Quận 1 — Cống Quỳnh / Nguyễn Trãi', lat: 10.766, lng: 106.688 },
      hcm_q3_core: { name: 'Quận 3 — Võ Văn Tần / Trương Định', lat: 10.779, lng: 106.689 },
      hcm_q5_chợlớn: { name: 'Quận 5 — Hải Thượng Lãn Ông / An Đông', lat: 10.755, lng: 106.666 },
      hcm_binhthanh_core: { name: 'Bình Thạnh — Bạch Đằng / Nơ Trang Long', lat: 10.802, lng: 106.696 },
      hcm_thuduc_tech: { name: 'TP. Thủ Đức — ĐHQG / Khu Công nghệ cao', lat: 10.852, lng: 106.772 },
    };

    for (const s of sessions) {
      const cellId = s.regionCell || 'hcm_q1_central';
      if (!regionMap.has(cellId)) {
        const info = knownRegions[cellId] || { name: 'Khu vực đô thị TP.HCM', lat: 10.776, lng: 106.7 };
        regionMap.set(cellId, { sessions: [], name: info.name, lat: info.lat, lng: info.lng });
      }
      regionMap.get(cellId)!.sessions.push(s);
    }

    const results = [];
    for (const [cellId, item] of regionMap.entries()) {
      // Enforce K-Anonymity rule: hide or aggregate if session count < 5
      if (item.sessions.length < 5) {
        continue;
      }
      const agg = aggregateSessions(item.sessions, 'aggregated_all', dataOrigin);
      results.push({
        regionCell: cellId,
        regionName: item.name,
        lat: item.lat,
        lng: item.lng,
        sessionCount: item.sessions.length,
        medianAdiSec: agg.medianAdiSec,
        mroRate: agg.mroRate,
        medianTimeToGuidanceSec: agg.medianTimeToGuidanceSec,
        avgReadinessScore: agg.avgReadinessScore,
        dataOrigin,
      });
    }

    return results;
  }

  // ====================================================
  // Phase D: Volunteer & First Responder Management Store
  // ====================================================
  private initVolunteerApplications() {
    const seedApps: VolunteerApplication[] = [
      {
        id: 'VOL-2026-001',
        userId: 'usr_reviewer_01',
        displayName: 'Bs. Hoàng Long',
        email: 'long.hoang@hospital115.vn',
        phone: '0901234567',
        phoneMasked: '090***4567',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
        skills: ['cpr_chest_compressions', 'aed_operation', 'bleeding_control', 'airway_management'],
        cprTrained: true,
        certificationOrg: 'Bệnh viện Nhân Dân 115 / Hội Hồi Sức Cấp Cứu TP.HCM',
        certificateNumber: 'CERT-115-2025-089',
        availability: 'on_call_emergency',
        preferredRadiusKm: 5,
        safetyConsent: true,
        privacyConsent: true,
        status: 'verified',
        statusHistory: [
          { status: 'pending_review', timestamp: '2026-08-01T08:00:00Z', note: 'Nộp hồ sơ đăng ký tình nguyện viên chuyên môn y tế.', actorRole: 'volunteer' },
          { status: 'verified', timestamp: '2026-08-02T14:30:00Z', note: 'Đã đối soát chứng chỉ đào tạo Y khoa và thẻ công tác tại BV 115.', actorRole: 'clinical_reviewer' },
        ],
        reviewNote: 'Hồ sơ chuyên môn đầy đủ, đã xác minh chứng chỉ chuyên khoa HSCC.',
        reviewedBy: 'Admin Cấp Cứu 115',
        reviewedAt: '2026-08-02T14:30:00Z',
        createdAt: '2026-08-01T08:00:00Z',
        updatedAt: '2026-08-02T14:30:00Z',
      },
      {
        id: 'VOL-2026-002',
        userId: 'usr_demo_cpr_02',
        displayName: 'Trần Mai Hương',
        email: 'huong.tran@gmail.com',
        phone: '0912348822',
        phoneMasked: '091***8822',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        skills: ['cpr_chest_compressions', 'choking_heimlich'],
        cprTrained: true,
        certificationOrg: 'Hội Chữ Thập Đỏ TP.HCM',
        certificateNumber: 'CTD-HCM-2026-441',
        availability: 'evening_weekend',
        preferredRadiusKm: 3,
        safetyConsent: true,
        privacyConsent: true,
        status: 'pending_review',
        statusHistory: [
          { status: 'pending_review', timestamp: '2026-08-20T10:15:00Z', note: 'Đăng ký tham gia mạng lưới hỗ trợ sơ cứu khu phố.', actorRole: 'volunteer' },
        ],
        createdAt: '2026-08-20T10:15:00Z',
        updatedAt: '2026-08-20T10:15:00Z',
      },
      {
        id: 'VOL-2026-003',
        userId: 'usr_demo_cpr_03',
        displayName: 'Nguyễn Văn Hùng',
        email: 'hung.nguyen@firstaid.vn',
        phone: '0987651199',
        phoneMasked: '098***1199',
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
        skills: ['cpr_chest_compressions', 'bleeding_control', 'aed_operation'],
        cprTrained: true,
        certificationOrg: 'Trung Tâm Cấp Cứu 115 Hà Nội',
        certificateNumber: 'HN115-2026-908',
        availability: 'flexible_anytime',
        preferredRadiusKm: 4,
        safetyConsent: true,
        privacyConsent: true,
        status: 'pending_review',
        statusHistory: [
          { status: 'pending_review', timestamp: '2026-08-22T09:30:00Z', note: 'Đã hoàn thành khóa tập huấn First Aid 2026.', actorRole: 'volunteer' },
        ],
        createdAt: '2026-08-22T09:30:00Z',
        updatedAt: '2026-08-22T09:30:00Z',
      },
    ];

    for (const app of seedApps) {
      this.volunteerApplications.set(app.id, app);
    }
  }

  public createVolunteerApplication(appData: Omit<VolunteerApplication, 'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>): VolunteerApplication {
    // Check if user already has an active application
    for (const existing of this.volunteerApplications.values()) {
      if (existing.userId === appData.userId && existing.status !== 'withdrawn') {
        // Update existing application to pending_review
        const updated: VolunteerApplication = {
          ...existing,
          ...appData,
          status: 'pending_review',
          statusHistory: [
            ...existing.statusHistory,
            {
              status: 'pending_review',
              timestamp: new Date().toISOString(),
              note: 'Cập nhật lại hồ sơ đăng ký tình nguyện viên.',
              actorRole: 'volunteer',
            },
          ],
          updatedAt: new Date().toISOString(),
        };
        this.volunteerApplications.set(existing.id, updated);
        return updated;
      }
    }

    const appNumber = String(this.volunteerApplications.size + 1).padStart(3, '0');
    const newId = `VOL-2026-${appNumber}`;
    const now = new Date().toISOString();

    const application: VolunteerApplication = {
      ...appData,
      id: newId,
      status: 'pending_review',
      statusHistory: [
        {
          status: 'pending_review',
          timestamp: now,
          note: 'Nộp hồ sơ đăng ký tình nguyện viên ban đầu.',
          actorRole: 'volunteer',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.volunteerApplications.set(application.id, application);
    return application;
  }

  public getVolunteerApplicationByUserId(userId: string): VolunteerApplication | undefined {
    for (const app of this.volunteerApplications.values()) {
      if (app.userId === userId) {
        return app;
      }
    }
    return undefined;
  }

  public getVolunteerApplicationById(id: string): VolunteerApplication | undefined {
    return this.volunteerApplications.get(id);
  }

  public updateVolunteerStatusByUser(
    userId: string,
    action: 'pause' | 'resume' | 'withdraw'
  ): VolunteerApplication | null {
    const app = this.getVolunteerApplicationByUserId(userId);
    if (!app) return null;

    const now = new Date().toISOString();
    let newStatus: VolunteerStatus = app.status;
    let note = '';

    if (action === 'pause') {
      newStatus = 'suspended';
      note = 'Tình nguyện viên chủ động tạm dừng tiếp nhận thông báo.';
    } else if (action === 'resume') {
      newStatus = 'pending_review';
      note = 'Tình nguyện viên kích hoạt lại hồ sơ tham gia.';
    } else if (action === 'withdraw') {
      newStatus = 'withdrawn';
      note = 'Tình nguyện viên đã hủy/rút hồ sơ đăng ký.';
    }

    const updated: VolunteerApplication = {
      ...app,
      status: newStatus,
      statusHistory: [
        ...app.statusHistory,
        {
          status: newStatus,
          timestamp: now,
          note,
          actorRole: 'volunteer',
        },
      ],
      updatedAt: now,
    };

    this.volunteerApplications.set(app.id, updated);
    return updated;
  }

  public listVolunteerApplications(filters?: {
    status?: string;
    province?: string;
    cprTrained?: boolean;
    search?: string;
  }): VolunteerApplication[] {
    const list: VolunteerApplication[] = [];
    for (const app of this.volunteerApplications.values()) {
      if (filters?.status && filters.status !== 'all' && app.status !== filters.status) continue;
      if (filters?.province && filters.province !== 'all' && app.province !== filters.province) continue;
      if (filters?.cprTrained !== undefined && app.cprTrained !== filters.cprTrained) continue;
      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        const matches =
          app.displayName.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q) ||
          app.district.toLowerCase().includes(q) ||
          app.certificationOrg?.toLowerCase().includes(q);
        if (!matches) continue;
      }
      list.push(app);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public reviewVolunteerApplication(
    id: string,
    reviewerId: string,
    reviewerName: string,
    status: VolunteerStatus,
    reviewNote: string
  ): VolunteerApplication | null {
    const app = this.volunteerApplications.get(id);
    if (!app) return null;

    const now = new Date().toISOString();
    const updated: VolunteerApplication = {
      ...app,
      status,
      reviewNote,
      reviewedBy: reviewerName || reviewerId,
      reviewedAt: now,
      statusHistory: [
        ...app.statusHistory,
        {
          status,
          timestamp: now,
          note: reviewNote || `Thẩm định viên y tế đã cập nhật trạng thái thành: ${status}`,
          actorRole: 'clinical_reviewer',
        },
      ],
      updatedAt: now,
    };

    this.volunteerApplications.set(id, updated);
    return updated;
  }

  // Audit Logging
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
  }
}

export const serverStore = new ServerDataStore();
