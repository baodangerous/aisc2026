import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Clock, X } from 'lucide-react';
import { HEALTH_NEWS, type HealthNewsItem } from '../../data/demo/healthNews';

export function HealthNewsSection() {
  const [open, setOpen] = useState<HealthNewsItem | null>(null);
  const [featured, ...rest] = HEALTH_NEWS;

  return (
    <section aria-labelledby="health-news-title" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Hướng dẫn sức khỏe</p>
        <h2 id="health-news-title" className="mt-1 text-2xl font-bold">Kiến thức sơ cứu cần nhớ</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <NewsCard item={featured} featured onOpen={() => setOpen(featured)} />
        <div className="flex flex-col gap-3">
          {rest.map((item) => <NewsCard key={item.id} item={item} onOpen={() => setOpen(item)} />)}
        </div>
      </div>
      <AnimatePresence>{open && <NewsModal item={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  );
}

function NewsCard({ item, featured, onOpen }: { item: HealthNewsItem; featured?: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`group flex overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${featured ? 'flex-col' : 'flex-row'}`}>
      <div className={`shrink-0 overflow-hidden bg-background ${featured ? 'aspect-[16/9] w-full' : 'w-28 sm:w-36'}`}>
        <img src={item.image} alt={item.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
      </div>
      <div className={`flex flex-col gap-1.5 ${featured ? 'p-5' : 'p-3.5'}`}>
        <span className="flex items-center gap-2 text-xs font-semibold text-muted">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{item.category}</span>
          <span>{item.readMinutes} phút đọc</span>
        </span>
        <h3 className={`font-bold leading-snug text-pretty ${featured ? 'text-xl' : 'text-sm sm:text-base'}`}>{item.title}</h3>
        {featured && <p className="text-sm leading-6 text-muted">{item.summary}</p>}
      </div>
    </button>
  );
}

function NewsModal({ item, onClose }: { item: HealthNewsItem; onClose: () => void }) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.article
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-modal-title"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="relative aspect-[16/8] w-full bg-background">
          <img src={item.image} alt={item.imageAlt} className="h-full w-full object-cover" />
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng bài viết" className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-surface/95 text-foreground shadow"><X className="size-5" aria-hidden="true" /></button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <span className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{item.category}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{item.readMinutes} phút đọc</span>
          </span>
          <h2 id="news-modal-title" className="text-2xl font-bold leading-tight text-balance">{item.title}</h2>
          <p className="text-base font-medium leading-7">{item.summary}</p>
          {item.body.map((p) => <p key={p} className="text-sm leading-7 text-muted">{p}</p>)}
          <p className="border-t border-border pt-4 text-xs text-muted">Nội dung giáo dục cộng đồng, không thay thế chỉ định của nhân viên y tế. Khi khẩn cấp, gọi 115.</p>
        </div>
      </motion.article>
    </motion.div>
  );
}
