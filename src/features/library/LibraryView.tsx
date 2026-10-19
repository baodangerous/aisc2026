import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { searchApprovedResources, getLearningResourceBySlugOrId } from '../../content/curatedLearningCatalog';
import { LessonDetailModal } from './LessonDetailModal';
import { LearningResourceCard } from './LearningResourceCard';

export function LibraryView() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') || '');
  useEffect(() => { setQuery(params.get('q') || ''); }, [params]);
  const resources = useMemo(() => searchApprovedResources(query), [query]);
  const selected = getLearningResourceBySlugOrId(params.get('lesson') || '') || null;
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-sm text-primary"><BookOpen className="size-5" aria-hidden="true" />Thư viện</span>
          <h1 className="text-balance text-3xl font-bold">Học từ nguồn đáng tin cậy</h1>
          <p className="text-base leading-relaxed text-muted">Video và tài liệu do các tổ chức y khoa phát hành.</p>
        </header>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 text-muted">
          <Search className="size-5 shrink-0" aria-hidden="true" /><span className="sr-only">Tìm học liệu</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm CPR, đột quỵ, cầm máu…" className="min-h-12 w-full bg-transparent text-base text-foreground outline-none" />
        </label>
        <p aria-live="polite" className="text-sm text-muted">{resources.length} nguồn tham khảo</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{resources.map((resource) => <LearningResourceCard key={resource.id} resource={resource} onOpen={() => setParams({ lesson: resource.slug })} />)}</div>
        {!resources.length && <p className="text-base text-muted">Không tìm thấy học liệu. Thử một từ khóa khác.</p>}
        <p className="text-sm leading-relaxed text-muted">Nội dung tiếng Anh. Media mở tại website của đơn vị phát hành để giữ đúng nguồn và bản quyền. Nguồn tham khảo không đồng nghĩa với ứng dụng đã được thẩm định y khoa.</p>
      </div>
      <LessonDetailModal key={selected?.id || 'closed'} resource={selected} onClose={() => setParams({})} />
    </div>
  );
}
