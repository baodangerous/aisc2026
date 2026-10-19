import { Building2, Clock, HeartPulse, Navigation, PhoneCall, Stethoscope } from 'lucide-react';
import { formatDistance } from './geo';
import { FACILITY_TYPE_LABEL, VERIFICATION_LABEL, type CareFacility } from './types';

const TYPE_ICON = { aed: HeartPulse, hospital: Building2, emergency_station: Building2, clinic: Stethoscope, pharmacy: Stethoscope };
const TYPE_TONE = {
  aed: 'bg-success-soft text-success',
  hospital: 'bg-danger-soft text-danger',
  emergency_station: 'bg-danger-soft text-danger',
  clinic: 'bg-primary-soft text-primary',
  pharmacy: 'bg-primary-soft text-primary',
};
const VERIFY_TONE = {
  verified: 'border-success/30 bg-success-soft text-success',
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  unverified: 'border-border bg-background text-muted',
};

function formatUpdated(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function FacilityListItem({ facility, selected, rank, onSelect }: { facility: CareFacility; selected: boolean; rank: number; onSelect: () => void }) {
  const Icon = TYPE_ICON[facility.type];
  const updated = formatUpdated(facility.updatedAt);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;

  return (
    <li>
      <article className={`rounded-2xl border bg-surface p-4 transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}>
        <button type="button" onClick={onSelect} aria-pressed={selected} className="flex w-full items-start gap-3 text-left focus-visible:outline-none">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TYPE_TONE[facility.type]}`}><Icon className="size-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted">
              <span>{FACILITY_TYPE_LABEL[facility.type]}</span>
              {rank === 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">Gần nhất</span>}
            </span>
            <span className="mt-1 block text-base font-bold leading-snug text-pretty">{facility.name}</span>
            {facility.address && <span className="mt-1 block text-sm leading-5 text-muted">{facility.address}</span>}
          </span>
          {facility.distanceKm !== undefined && <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">{formatDistance(facility.distanceKm)}</span>}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[3.25rem] text-xs">
          <span className={`rounded-full border px-2 py-0.5 font-semibold ${VERIFY_TONE[facility.verification]}`}>{VERIFICATION_LABEL[facility.verification]}</span>
          <span className="inline-flex items-center gap-1 text-muted"><Clock className="size-3.5" aria-hidden="true" />{facility.operatingHours}</span>
        </div>
        {selected && (
          <div className="mt-3 space-y-3 border-t border-border pt-3 pl-[3.25rem]">
            {facility.type === 'aed' && <p className="text-xs leading-5 text-muted">Tình trạng thiết bị chưa được xác nhận theo thời gian thực. Khi đến nơi, hãy kiểm tra đèn trạng thái và hỏi nhân viên tại chỗ.</p>}
            <p className="text-xs text-muted">Nguồn: {facility.sourceLabel}{updated ? ` · Cập nhật ${updated}` : ''}</p>
            <div className="flex flex-wrap gap-2">
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark"><Navigation className="size-4" aria-hidden="true" />Chỉ đường</a>
              {facility.phone && <a href={`tel:${facility.phone}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold"><PhoneCall className="size-4" aria-hidden="true" />{facility.phone}</a>}
            </div>
          </div>
        )}
      </article>
    </li>
  );
}
