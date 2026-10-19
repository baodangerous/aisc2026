import { useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import type { Coords } from './geo';

type ResourceType = 'aed' | 'first_aid_kit' | 'bleeding_control_kit' | 'emergency_cabinet';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base sm:text-sm';

export function SubmitResourceModal({ coords, onClose }: { coords: Coords; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', resourceType: 'aed' as ResourceType, address: '', evidenceUrl: '', managingOrgName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = data?.session?.access_token;
      const res = await fetch('/api/resources/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...form, lat: coords.lat, lng: coords.lng }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Không thể gửi đề xuất. Vui lòng đăng nhập.');
      }
      setSuccess(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi gửi đề xuất.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="submit-resource-title">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="submit-resource-title" className="text-xl font-bold">Đề xuất điểm AED / tủ cấp cứu</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex size-10 items-center justify-center rounded-full hover:bg-background"><X className="size-5" aria-hidden="true" /></button>
        </div>
        <p className="text-sm text-muted">Đội ngũ thẩm định sẽ kiểm tra thực địa trước khi điểm này được đánh dấu là đã xác minh.</p>
        {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft p-3 text-sm font-semibold text-success"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />Cảm ơn bạn! Đề xuất đã vào hàng đợi thẩm định.</p>}
        {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm font-semibold text-danger"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{error}</p>}
        <label className="block text-sm font-semibold">Tên địa điểm đặt thiết bị
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ví dụ: Sảnh tòa nhà văn phòng" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Loại thiết bị
            <select value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value as ResourceType })} className={inputClass}>
              <option value="aed">Máy sốc tim tự động (AED)</option>
              <option value="first_aid_kit">Hộp sơ cấp cứu</option>
              <option value="bleeding_control_kit">Bộ cầm máu khẩn cấp</option>
              <option value="emergency_cabinet">Tủ cấp cứu công cộng</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Đơn vị quản lý
            <input value={form.managingOrgName} onChange={(e) => setForm({ ...form, managingOrgName: e.target.value })} className={inputClass} placeholder="Ban quản lý tòa nhà…" />
          </label>
        </div>
        <label className="block text-sm font-semibold">Địa chỉ chi tiết
          <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="Số nhà, đường, phường, quận…" />
        </label>
        <label className="block text-sm font-semibold">Link ảnh thiết bị / bằng chứng
          <input type="url" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} className={inputClass} placeholder="https://…" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted">Đóng</button>
          <button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi đề xuất'}</button>
        </div>
      </form>
    </div>
  );
}
