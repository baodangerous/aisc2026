import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Building2, MapPin, Newspaper, Search, ShoppingBag, Sparkles, X, Zap } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { useFixtures } from '../config/dataSource';

type SearchResult = { id: string; title: string; detail: string; href: string; kind: string; icon: typeof BookOpen };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const term = normalize(query);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    setActiveIndex(0);
    if (term.length < 1) { setLocalResults([]); setRemoteResults([]); setLoading(false); return; }
    let cancelled = false;
    void Promise.all([
      import('../content/curatedLearningCatalog'), import('../content/approvedScenarios'),
      import('../data/demo/facilities'), import('../data/demo/healthNews'),
    ]).then(([learning, scenariosData, facilityData, newsData]) => {
      if (cancelled) return;
      const resources = learning.getApprovedLearningResources().filter((item) => normalize(`${item.title} ${item.description} ${item.sourceOrganization}`).includes(term)).slice(0, 4).map((item) => ({ id: item.id, title: item.title, detail: `${item.sourceOrganization} · Thư viện`, href: `/library?lesson=${encodeURIComponent(item.slug)}`, kind: 'Học liệu', icon: BookOpen }));
      const scenarios = scenariosData.APPROVED_SCENARIOS.filter((item) => normalize(`${item.title} ${item.description}`).includes(term)).slice(0, 4).map((item) => ({ id: item.id, title: item.title, detail: 'Tình huống luyện tập · 3 phút', href: `/training?scenario=${encodeURIComponent(item.id)}`, kind: 'Luyện tập', icon: Zap }));
      const facilities = useFixtures ? facilityData.FIXTURE_FACILITIES.filter((item) => normalize(`${item.name} ${item.address} ${item.province ?? ''}`).includes(term)).slice(0, 4).map((item) => ({ id: item.id, title: item.name, detail: `${item.address} · ${item.province ?? 'Cơ sở y tế'}`, href: `/nearby?q=${encodeURIComponent(query.trim())}`, kind: 'Gần bạn', icon: MapPin })) : [];
      const news = newsData.HEALTH_NEWS.filter((item) => normalize(`${item.title} ${item.summary} ${item.category}`).includes(term)).slice(0, 3).map((item) => ({ id: item.id, title: item.title, detail: `${item.category} · Trang chủ`, href: '/#health-news-title', kind: 'Tin tức', icon: Newspaper }));
      setLocalResults([...resources, ...scenarios, ...facilities, ...news]);
    });
    if (!supabase || term.length < 2) { setRemoteResults([]); setLoading(false); return () => { cancelled = true; }; }
    const safeTerm = query.trim().replace(/[,%()\\]/g, ' ').slice(0, 80);
    const pattern = `%${safeTerm}%`;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const [productResponse, postResponse, facilityResponse] = await Promise.all([
        supabase!.from('store_products').select('id,name,short_description,store_id').eq('is_published', true).or(`name.ilike.${pattern},short_description.ilike.${pattern}`).limit(4),
        supabase!.from('forum_posts').select('id,title,body').eq('status', 'published').or(`title.ilike.${pattern},body.ilike.${pattern}`).limit(4),
        supabase!.from('medical_facilities').select('id,name,address,province').or(`name.ilike.${pattern},address.ilike.${pattern},province.ilike.${pattern}`).limit(4),
      ]);
      if (!cancelled) {
        const productRows = (productResponse.data ?? []) as { id: string; name: string; short_description: string; store_id: string }[];
        const postRows = (postResponse.data ?? []) as { id: string; title: string; body: string }[];
        const facilityRows = (facilityResponse.data ?? []) as { id: string; name: string; address: string; province: string }[];
        setRemoteResults([
          ...productRows.map((item) => ({ id: item.id, title: item.name, detail: `${item.short_description || 'Sản phẩm sơ cứu'} · Cửa hàng`, href: `/store?q=${encodeURIComponent(query.trim())}`, kind: 'Cửa hàng', icon: ShoppingBag })),
          ...postRows.map((item) => ({ id: item.id, title: item.title, detail: `${item.body.slice(0, 100)} · Cộng đồng`, href: `/community?q=${encodeURIComponent(query.trim())}`, kind: 'Cộng đồng', icon: Building2 })),
          ...facilityRows.map((item) => ({ id: item.id, title: item.name, detail: `${item.address} · ${item.province}`, href: `/nearby?q=${encodeURIComponent(query.trim())}`, kind: 'Gần bạn', icon: MapPin })),
        ]);
        setLoading(false);
      }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [term, query]);

  const results = [...localResults, ...remoteResults];
  const openResult = (result?: SearchResult) => {
    onClose();
    if (result) navigate(result.href);
    else if (query.trim()) navigate(`/library?q=${encodeURIComponent(query.trim())}`);
  };
  const handleKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
    if (event.key === 'Enter') { event.preventDefault(); openResult(results[activeIndex]); }
  };

  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/55 px-3 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Tìm kiếm toàn ứng dụng" className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <form onSubmit={(event) => { event.preventDefault(); openResult(results[activeIndex]); }} className="flex items-center gap-3 border-b border-slate-200 px-5"><Search className="size-5 shrink-0 text-blue-800"/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeys} placeholder="Tìm kỹ năng, tình huống, bệnh viện, AED…" aria-label="Tìm kiếm GoldenMinutes" className="min-h-16 min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-500"/><kbd className="hidden rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-600 sm:inline">ESC</kbd><button type="button" aria-label="Đóng tìm kiếm" onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="size-5"/></button></form>
      <div className="max-h-[65vh] overflow-auto p-3">
        {!term ? <div className="p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Sparkles className="size-4 text-red-700"/>Tìm trên toàn ứng dụng</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{[{ label: 'Kỹ năng sơ cứu', href: '/library', icon: BookOpen }, { label: 'Tình huống luyện tập', href: '/training', icon: Zap }, { label: 'Bệnh viện và AED', href: '/nearby', icon: MapPin }, { label: 'Sản phẩm và khóa học', href: '/store', icon: ShoppingBag }].map(({ label, href, icon: Icon }) => <button key={href} onClick={() => { onClose(); navigate(href); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 text-left text-sm font-semibold text-slate-800 hover:border-blue-800 hover:bg-blue-50"><Icon className="size-4 text-blue-800"/>{label}</button>)}</div><p className="mt-4 text-xs text-slate-500">Nhập từ khóa để tìm học liệu, tình huống, cơ sở y tế, bài đăng và sản phẩm.</p></div> : results.length ? <><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">{results.length} kết quả{loading ? ' · đang tìm thêm…' : ''}</p>{results.map((result, index) => { const Icon = result.icon; return <button key={`${result.kind}-${result.id}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => openResult(result)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ${index === activeIndex ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}><span className="mt-0.5 rounded-lg bg-blue-100 p-2 text-blue-900"><Icon className="size-4"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-950">{result.title}</span><span className="mt-1 block line-clamp-2 text-xs text-slate-700">{result.detail}</span></span><span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">{result.kind}</span></button>; })}</> : <div className="p-7 text-center"><Search className="mx-auto size-8 text-slate-400"/><p className="mt-2 font-semibold text-slate-900">Chưa có kết quả phù hợp</p><p className="mt-1 text-sm text-slate-600">Thử từ khóa khác hoặc mở trực tiếp một khu vực.</p><button onClick={() => openResult()} className="mt-4 rounded-xl bg-blue-900 px-4 py-2 text-sm font-bold text-white">Tìm trong thư viện</button></div>}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600"><span>Enter để mở · ↑↓ để di chuyển</span><span>Gọi 115 trong tình huống khẩn cấp</span></footer>
    </section>
  </div>;
}
