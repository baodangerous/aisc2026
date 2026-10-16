import { useEffect, useRef } from 'react';
import { X, BookOpen, Video, Info } from 'lucide-react';
import type { MedicalLearningResource } from '../../domain/schemas';

interface LessonDetailModalProps { resource: MedicalLearningResource | null; onClose: () => void; onOpenCall115?: () => void }

export function LessonDetailModal({ resource, onClose }: LessonDetailModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (resource && dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, [resource]);
  if (!resource) return null;
  const Icon = resource.mediaType === 'video' ? Video : BookOpen;
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="resource-title" className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-surface p-0 font-sans text-foreground shadow-xl backdrop:bg-foreground/60">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between"><Icon className="size-8 text-primary" aria-hidden="true" /><button autoFocus type="button" onClick={onClose} aria-label="Đóng học liệu" className="flex size-11 items-center justify-center rounded-full bg-background text-foreground"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="flex flex-col gap-2"><h2 id="resource-title" className="text-2xl font-bold">{resource.title}</h2><p className="text-base leading-relaxed text-muted">{resource.description}</p></div>
        <dl className="flex flex-col gap-3 text-sm">
          <div><dt className="text-muted">Đơn vị phát hành</dt><dd className="font-semibold">{resource.sourceOrganization}</dd></div>
          <div><dt className="text-muted">Kiểm tra liên kết</dt><dd>{resource.sourceCheckedAt} · Không phải duyệt chuyên môn</dd></div>
          <div><dt className="text-muted">Bản quyền</dt><dd className="leading-relaxed">{resource.copyrightStatus}</dd></div>
        </dl>
        <div className="rounded-2xl bg-primary-soft p-4 text-sm leading-relaxed text-foreground"><p className="font-bold">Bài học đã sẵn sàng offline</p><p className="mt-1">Đọc hướng dẫn, ghi nhớ thứ tự xử trí và luyện lại trong phần Tập luyện. Không cần mở ứng dụng hay tài khoản khác.</p></div>
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted"><Info className="size-5 shrink-0" aria-hidden="true" />{resource.emergencyWarning}</p>
      </div>
    </dialog>
  );
}
