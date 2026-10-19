import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ImagePlus, Package, Plus, Search, ShoppingBag, Store, Trash2, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

type StoreRow = { id: string; organization_id: string; brand_name: string; description: string; logo_url: string | null; is_published: boolean };
type Product = { id: string; store_id: string; sku: string | null; name: string; short_description: string; description: string; category_slug: string | null; image_url: string | null; image_alt: string; price_vnd: number; stock_quantity: number; specifications: Record<string, string | number>; tags: string[]; is_published: boolean; is_featured: boolean };
type Category = { slug: string; name: string };
type CartItem = { product: Product; quantity: number };
type OrderRow = { id: string; store_id: string; buyer_id: string; status: string; total_vnd: number; created_at: string; buyer_name?: string; buyer_phone?: string; shipping_address?: string };
type Org = { id: string; name: string; role: string };
const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const PRODUCT_FIELDS = 'id,store_id,sku,name,short_description,description,category_slug,image_url,image_alt,price_vnd,stock_quantity,specifications,tags,is_published,is_featured';
const PRODUCT_BUCKET = 'store-products';

export const StoreView: React.FC = () => {
  const { authUser, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [managedProducts, setManagedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myOrders, setMyOrders] = useState<OrderRow[]>([]);
  const [storeOrders, setStoreOrders] = useState<OrderRow[]>([]);
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [ownedStores, setOwnedStores] = useState<StoreRow[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyer, setBuyer] = useState({ name: '', phone: '', address: '' });
  const [brand, setBrand] = useState({ brand_name: '', description: '' });
  const [product, setProduct] = useState({ name: '', sku: '', short_description: '', description: '', category_slug: '', price: '', stock: '', image_alt: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productRefresh, setProductRefresh] = useState(0);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'shop' | 'manage'>('shop');
  const canManage = organizations.some((org) => org.id === selectedOrg && ['owner', 'admin'].includes(org.role));

  const load = async () => {
    if (!supabase) return;
    const [storeResult, categoryResult] = await Promise.all([
      supabase.from('organization_stores').select('id,organization_id,brand_name,description,logo_url,is_published').eq('is_published', true).order('brand_name'),
      supabase.from('store_product_categories').select('slug,name').eq('is_active', true).order('sort_order'),
    ]);
    const storeRows = (storeResult.data ?? []) as StoreRow[];
    setStores(storeRows);
    setCategories((categoryResult.data ?? []) as Category[]);
    setSelectedStore((prev) => storeRows.some((s) => s.id === prev) ? prev : storeRows[0]?.id ?? '');
    if (!authUser) { setOrganizations([]); setOwnedStores([]); setStoreOrders([]); setManagedProducts([]); return; }
    const [buyerResult, membershipResult] = await Promise.all([
      supabase.from('store_orders').select('id,store_id,buyer_id,status,total_vnd,created_at').eq('buyer_id', authUser.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('organization_members').select('organization_id,role,is_active,organizations(id,name)').eq('user_id', authUser.id).eq('is_active', true),
    ]);
    setMyOrders((buyerResult.data ?? []) as OrderRow[]);
    const orgRows = (membershipResult.data ?? []).map((m: any) => {
      const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
      return org ? { id: org.id, name: org.name, role: m.role } : null;
    }).filter(Boolean) as Org[];
    setOrganizations(orgRows);
    setSelectedOrg((prev) => orgRows.some((o) => o.id === prev) ? prev : orgRows.find((o) => ['owner', 'admin'].includes(o.role))?.id ?? '');
    const writableOrgs = orgRows.filter((o) => ['owner', 'admin'].includes(o.role));
    if (!writableOrgs.length) { setOwnedStores([]); setStoreOrders([]); setManagedProducts([]); return; }
    const { data: managed } = await supabase.from('organization_stores').select('id,organization_id,brand_name,description,logo_url,is_published').in('organization_id', writableOrgs.map((o) => o.id));
    const managedRows = (managed ?? []) as StoreRow[];
    setOwnedStores(managedRows);
    const ids = managedRows.map((s) => s.id);
    if (!ids.length) { setStoreOrders([]); setManagedProducts([]); return; }
    const [ordersResult, productsResult] = await Promise.all([
      supabase.from('store_orders').select('id,store_id,buyer_id,status,total_vnd,created_at,buyer_name,buyer_phone,shipping_address').in('store_id', ids).order('created_at', { ascending: false }).limit(50),
      supabase.from('store_products').select(PRODUCT_FIELDS).in('store_id', ids).order('created_at', { ascending: false }),
    ]);
    setStoreOrders((ordersResult.data ?? []) as OrderRow[]);
    setManagedProducts((productsResult.data ?? []) as Product[]);
  };

  useEffect(() => { void load(); }, [authUser?.id]);
  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);
  useEffect(() => {
    const current = ownedStores.find((s) => s.organization_id === selectedOrg);
    setBrand({ brand_name: current?.brand_name ?? '', description: current?.description ?? '' });
  }, [selectedOrg, ownedStores]);
  useEffect(() => {
    if (!supabase || !selectedStore) { setProducts([]); return; }
    void supabase.from('store_products').select(PRODUCT_FIELDS).eq('store_id', selectedStore).eq('is_published', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).then(({ data }) => setProducts((data ?? []) as Product[]));
  }, [selectedStore, productRefresh]);

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('vi');
    const result = products.filter((p) => (categoryFilter === 'all' || p.category_slug === categoryFilter) && (!search || `${p.name} ${p.short_description} ${p.description} ${p.sku ?? ''} ${(p.tags ?? []).join(' ')}`.toLocaleLowerCase('vi').includes(search)));
    return result.sort((a, b) => sort === 'price-asc' ? a.price_vnd - b.price_vnd : sort === 'price-desc' ? b.price_vnd - a.price_vnd : sort === 'name' ? a.name.localeCompare(b.name, 'vi') : Number(b.is_featured) - Number(a.is_featured));
  }, [products, query, categoryFilter, sort]);
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.product.price_vnd * item.quantity, 0), [cart]);
  const addToCart = (item: Product) => setCart((current) => {
    const found = current.find((entry) => entry.product.id === item.id);
    return found ? current.map((entry) => entry.product.id === item.id ? { ...entry, quantity: Math.min(item.stock_quantity, entry.quantity + 1) } : entry) : [...current, { product: item, quantity: 1 }];
  });
  const checkout = async () => {
    setError(''); setNotice(''); setOrderId('');
    if (!supabase || !authUser) { setError('Đăng nhập để đặt hàng.'); return; }
    if (!selectedStore || !cart.length) { setError('Giỏ hàng đang trống.'); return; }
    setBusy(true);
    const { data, error: checkoutError } = await supabase.rpc('place_store_order', { p_store_id: selectedStore, p_items: cart.map(({ product: item, quantity }) => ({ product_id: item.id, quantity })), p_buyer_name: buyer.name, p_buyer_phone: buyer.phone, p_shipping_address: buyer.address });
    setBusy(false);
    if (checkoutError) { setError(checkoutError.message.includes('PRODUCT_UNAVAILABLE') ? 'Một sản phẩm vừa hết hàng. Hãy tải lại danh sách và cập nhật giỏ.' : 'Chưa thể tạo đơn. Kiểm tra thông tin giao hàng rồi thử lại.'); return; }
    setOrderId(String(data)); setCart([]); setNotice('Đã ghi nhận yêu cầu đặt hàng. Đơn đang chờ thanh toán; chưa có khoản tiền nào được thu.'); await load();
  };
  const saveStore = async () => {
    if (!supabase || !canManage || !selectedOrg || brand.brand_name.trim().length < 2) return;
    setBusy(true); setError('');
    const current = ownedStores.find((s) => s.organization_id === selectedOrg);
    const result = current ? await supabase.from('organization_stores').update({ ...brand, updated_at: new Date().toISOString() }).eq('id', current.id).select().single() : await supabase.from('organization_stores').insert({ organization_id: selectedOrg, ...brand }).select().single();
    setBusy(false);
    if (result.error) { setError('Chưa thể lưu gian hàng. Kiểm tra vai trò quản trị và migration cửa hàng.'); return; }
    setNotice('Đã lưu thương hiệu gian hàng.'); await load();
  };
  const createProduct = async () => {
    if (!supabase || !canManage) return;
    const store = ownedStores.find((s) => s.organization_id === selectedOrg);
    const price = Number(product.price), stock = Number(product.stock);
    if (!store || product.name.trim().length < 2 || !Number.isInteger(price) || price < 1000 || !Number.isInteger(stock) || stock < 0) { setError('Nhập tên, giá từ 1.000 ₫ và tồn kho hợp lệ.'); return; }
    if (imageFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type) || imageFile.size > 6 * 1024 * 1024)) { setError('Ảnh phải là JPG, PNG hoặc WebP và tối đa 6 MB.'); return; }
    setBusy(true); setError('');
    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${selectedOrg}/${store.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, imageFile, { contentType: imageFile.type, upsert: false });
      if (uploadError) { setBusy(false); setError('Chưa tải được ảnh. Áp dụng migration catalog và kiểm tra quyền quản trị tổ chức.'); return; }
      imageUrl = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    const { error: insertError } = await supabase.from('store_products').insert({ store_id: store.id, name: product.name.trim(), sku: product.sku.trim() || null, short_description: product.short_description.trim(), description: product.description.trim(), category_slug: product.category_slug || null, image_url: imageUrl, image_alt: product.image_alt.trim() || product.name.trim(), price_vnd: price, stock_quantity: stock, is_published: false });
    setBusy(false);
    if (insertError) { setError('Chưa thể lưu sản phẩm. Kiểm tra quyền, mã SKU có bị trùng không và đã áp dụng migration catalog chưa.'); return; }
    setProduct({ name: '', sku: '', short_description: '', description: '', category_slug: '', price: '', stock: '', image_alt: '' }); setImageFile(null); setNotice('Đã thêm sản phẩm ở trạng thái nháp. Rà soát thông tin trước khi công khai.'); await load(); setProductRefresh((v) => v + 1);
  };
  const toggleProduct = async (item: Product) => {
    if (!supabase || !canManage) return;
    const { error: updateError } = await supabase.from('store_products').update({ is_published: !item.is_published }).eq('id', item.id);
    if (updateError) setError('Chưa thể cập nhật sản phẩm.'); else { setNotice(item.is_published ? 'Đã ẩn sản phẩm.' : 'Sản phẩm đã được công khai.'); await load(); setProductRefresh((v) => v + 1); }
  };
  const toggleStore = async () => {
    if (!supabase || !canManage) return;
    const store = ownedStores.find((s) => s.organization_id === selectedOrg);
    if (!store) return;
    const { error: updateError } = await supabase.from('organization_stores').update({ is_published: !store.is_published, updated_at: new Date().toISOString() }).eq('id', store.id);
    if (updateError) setError('Chưa thể cập nhật trạng thái gian hàng.'); else { setNotice(store.is_published ? 'Đã chuyển gian hàng về riêng tư.' : 'Gian hàng đã được công khai.'); await load(); setProductRefresh((v) => v + 1); }
  };
  const advanceOrder = async (order: OrderRow) => {
    if (!supabase || !canManage) return;
    const next = order.status === 'paid' ? 'processing' : order.status === 'processing' ? 'shipped' : 'completed';
    const { error: statusError } = await supabase.rpc('update_store_order_fulfillment', { p_order_id: order.id, p_next_status: next });
    if (statusError) setError('Chỉ đơn đã thanh toán mới được chuyển bước xử lý.'); else { setNotice(`Đơn chuyển sang trạng thái ${next}.`); await load(); }
  };

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
    <section className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">GoldenMinutes marketplace</p>
      <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Trang bị sẵn sàng cứu người</h1><p className="mt-2 max-w-2xl text-slate-600">Túi sơ cứu, bông gạc, băng cuộn, găng tay và vật tư hỗ trợ sơ cứu cho gia đình, trường học, văn phòng và tổ chức.</p></div><div className="flex gap-2"><button onClick={() => setTab('shop')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === 'shop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}><ShoppingBag className="mr-2 inline size-4"/>Cửa hàng</button>{canManage && <button onClick={() => setTab('manage')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === 'manage' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}><Store className="mr-2 inline size-4"/>Quản lý thương hiệu</button>}</div></div>
    </section>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mt-5 rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}{orderId && <span className="ml-2 font-mono">Mã đơn: {orderId}</span>}</div>}

    {tab === 'shop' ? <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 flex flex-wrap gap-3"><label className="sr-only" htmlFor="store-choice">Thương hiệu</label><select id="store-choice" value={selectedStore} onChange={(e) => { setSelectedStore(e.target.value); setCart([]); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Chọn gian hàng</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.brand_name}</option>)}</select><label className="relative min-w-56 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm túi sơ cứu, bông gạc, băng cuộn…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"/></label><select aria-label="Sắp xếp sản phẩm" value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="featured">Nổi bật</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="name">Tên A–Z</option></select></div>
        {categories.length > 0 && <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{[{ slug: 'all', name: 'Tất cả' }, ...categories].map((c) => <button key={c.slug} onClick={() => setCategoryFilter(c.slug)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${categoryFilter === c.slug ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{c.name}</button>)}</div>}
        {visibleProducts.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">{item.image_url ? <button onClick={() => setSelectedProduct(item)} className="block w-full"><img src={item.image_url} alt={item.image_alt || item.name} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"/></button> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50"><Package className="size-12 text-emerald-700"/></div>}<div className="p-4"><div className="flex min-h-6 items-center gap-2">{item.is_featured && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">Nổi bật</span>}<span className="text-xs text-slate-500">{categories.find((c) => c.slug === item.category_slug)?.name}</span></div><button onClick={() => setSelectedProduct(item)} className="mt-2 text-left font-bold text-slate-900 hover:text-blue-700">{item.name}</button><p className="mt-1 min-h-10 text-sm text-slate-600">{item.short_description || item.description}</p><div className="mt-4 flex items-center justify-between gap-2"><div><p className="font-extrabold text-emerald-800">{money(item.price_vnd)}</p><p className="text-xs text-slate-500">{item.stock_quantity > 0 ? `Còn ${item.stock_quantity}` : 'Liên hệ để kiểm tra'}</p></div><button disabled={!item.stock_quantity} onClick={() => addToCart(item)} className="min-h-10 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Thêm giỏ</button></div></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShoppingBag className="mx-auto size-10 text-slate-400"/><h2 className="mt-3 text-lg font-bold">Chưa tìm thấy sản phẩm</h2><p className="mt-1 text-sm text-slate-600">Thử đổi từ khóa hoặc danh mục.</p><Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-700">Không gian tổ chức <ArrowRight className="size-4"/></Link></div>}
      </section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBag className="size-5 text-emerald-700"/>Giỏ hàng <span className="ml-auto text-sm text-slate-500">{cart.reduce((n, i) => n + i.quantity, 0)} món</span></h2>{cart.length ? <div className="mt-4 space-y-3">{cart.map(({ product: item, quantity }) => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span>{item.name} × {quantity}</span><button aria-label={`Xóa ${item.name}`} onClick={() => setCart((c) => c.filter((i) => i.product.id !== item.id))}><Trash2 className="size-4 text-slate-400"/></button></div>)}<div className="flex justify-between font-extrabold"><span>Tạm tính</span><span>{money(cartTotal)}</span></div>{!isAuthenticated ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Đăng nhập để tạo yêu cầu đặt hàng. Bạn vẫn có thể xem sản phẩm.</p> : <div className="space-y-2"><input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Người nhận" className="min-h-10 w-full rounded-xl border px-3 text-sm"/><input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} placeholder="Số điện thoại" className="min-h-10 w-full rounded-xl border px-3 text-sm"/><textarea value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} placeholder="Địa chỉ giao hàng" className="min-h-20 w-full rounded-xl border p-3 text-sm"/><button disabled={busy} onClick={() => void checkout()} className="min-h-11 w-full rounded-xl bg-emerald-700 font-bold text-white disabled:opacity-50">{busy ? 'Đang tạo đơn…' : 'Gửi yêu cầu đặt hàng'}</button><p className="text-xs leading-relaxed text-slate-500">Đơn sẽ chờ xác nhận thanh toán. Cổng thanh toán trực tuyến chưa được kết nối và chưa thu tiền.</p></div>}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Thêm sản phẩm để bắt đầu đặt hàng.</p>}</aside>
      {isAuthenticated && <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="text-lg font-bold">Đơn hàng của tôi</h2>{myOrders.length ? <div className="mt-3 divide-y">{myOrders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString('vi-VN')}</p><p className="text-slate-500">{order.status === 'pending_payment' ? 'Chờ xác nhận thanh toán' : order.status === 'paid' ? 'Đã thanh toán' : order.status}</p></div><span className="font-bold">{money(order.total_vnd)}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p>}</section>}
    </div> : <section className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Thương hiệu tổ chức</h2>{canManage ? <><label className="mt-4 block text-sm font-semibold">Tổ chức</label><select value={selectedOrg} onChange={(e) => { setSelectedOrg(e.target.value); }} className="mt-1 min-h-10 w-full rounded-xl border px-3">{organizations.filter((o) => ['owner', 'admin'].includes(o.role)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><label className="mt-4 block text-sm font-semibold">Tên thương hiệu</label><input value={brand.brand_name} onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })} placeholder="Tên cửa hàng" className="mt-1 min-h-10 w-full rounded-xl border px-3"/><label className="mt-4 block text-sm font-semibold">Giới thiệu</label><textarea value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3"/><button onClick={() => void saveStore()} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 font-bold text-white"><Check className="mr-2 inline size-4"/>Lưu thương hiệu</button></> : <p className="mt-3 text-sm text-slate-600">Chỉ chủ sở hữu hoặc quản trị viên tổ chức được quản lý gian hàng.</p>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Danh mục sản phẩm</h2>{ownedStores.some((s) => s.organization_id === selectedOrg) && <button onClick={() => void toggleStore()} className={`min-h-10 rounded-xl px-3 text-sm font-bold ${ownedStores.find((s) => s.organization_id === selectedOrg)?.is_published ? 'border border-slate-300 text-slate-700' : 'bg-emerald-700 text-white'}`}>{ownedStores.find((s) => s.organization_id === selectedOrg)?.is_published ? 'Ẩn gian hàng' : 'Công khai gian hàng'}</button>}</div>{!canManage ? <p className="mt-4 text-sm text-slate-600">Vai trò hiện tại chỉ có quyền xem. Cần vai trò chủ sở hữu hoặc quản trị viên để thay đổi gian hàng.</p> : ownedStores.some((s) => s.organization_id === selectedOrg) ? <><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="Tên sản phẩm / khóa học" className="min-h-10 rounded-xl border px-3"/><input value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} placeholder="Mã SKU (không bắt buộc)" className="min-h-10 rounded-xl border px-3"/><input value={product.short_description} onChange={(e) => setProduct({ ...product, short_description: e.target.value })} placeholder="Mô tả ngắn" className="min-h-10 rounded-xl border px-3 sm:col-span-2"/><select value={product.category_slug} onChange={(e) => setProduct({ ...product, category_slug: e.target.value })} className="min-h-10 rounded-xl border px-3"><option value="">Chọn danh mục</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select><input type="number" min="1000" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} placeholder="Giá (VND)" className="min-h-10 rounded-xl border px-3"/><input type="number" min="0" value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} placeholder="Số lượng / chỗ nhận" className="min-h-10 rounded-xl border px-3"/><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-sm sm:col-span-2"><ImagePlus className="size-5 shrink-0 text-blue-700"/><span className="min-w-0 flex-1">{imageFile ? imageFile.name : 'Thêm ảnh sản phẩm · JPG, PNG, WebP · tối đa 6 MB'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="max-w-40 text-xs"/></label><input value={product.image_alt} onChange={(e) => setProduct({ ...product, image_alt: e.target.value })} placeholder="Mô tả ảnh cho trình đọc màn hình" className="min-h-10 rounded-xl border px-3 sm:col-span-2"/><textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} placeholder="Thông tin sản phẩm, thành phần, quy cách, điều kiện đặt lịch…" className="min-h-24 rounded-xl border p-3 sm:col-span-2"/><button onClick={() => void createProduct()} disabled={busy} className="min-h-10 rounded-xl bg-emerald-700 font-bold text-white disabled:opacity-50 sm:col-span-2"><Plus className="mr-1 inline size-4"/>{busy ? 'Đang lưu…' : 'Thêm sản phẩm nháp'}</button></div><div className="mt-5 divide-y">{managedProducts.filter((p) => ownedStores.some((s) => s.id === p.store_id && s.organization_id === selectedOrg)).map((item) => <div key={item.id} className="flex items-center gap-3 py-3">{item.image_url ? <img src={item.image_url} alt={item.image_alt || item.name} className="size-14 rounded-lg object-cover"/> : <Package className="size-8 text-slate-400"/>}<div className="min-w-0 flex-1"><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">{money(item.price_vnd)} · Tồn {item.stock_quantity} · {item.is_published ? 'Công khai' : 'Bản nháp'}</p></div><button onClick={() => void toggleProduct(item)} className="rounded-lg border px-3 py-2 text-sm font-semibold">{item.is_published ? 'Ẩn' : 'Công khai'}</button></div>)}</div><p className="mt-4 text-xs text-slate-500">Thanh toán, hóa đơn, vận chuyển và hoàn tiền cần tích hợp với nhà cung cấp trước khi nhận giao dịch thật.</p></> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><ImagePlus className="mb-2 size-6"/>Lưu thương hiệu để bắt đầu tạo danh mục.</div>}</div>
      {storeOrders.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="text-lg font-bold">Đơn hàng gian hàng</h2><div className="mt-3 divide-y">{storeOrders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">#{order.id.slice(0, 8)} · {order.buyer_name} · {order.buyer_phone}</p><p className="text-slate-500">{order.shipping_address} · {new Date(order.created_at).toLocaleDateString('vi-VN')}</p></div><div className="flex items-center gap-3"><span className="font-bold">{money(order.total_vnd)} · {order.status}</span>{['paid','processing','shipped'].includes(order.status) && <button onClick={() => void advanceOrder(order)} className="min-h-9 rounded-lg border px-3 font-semibold">{order.status === 'paid' ? 'Bắt đầu xử lý' : order.status === 'processing' ? 'Đánh dấu đã gửi' : 'Hoàn tất'}</button>}</div></div>)}</div><p className="mt-3 text-xs text-slate-500">Trạng thái “đã thanh toán” chỉ cổng thanh toán xác thực mới được ghi nhận.</p></section>}
    </section>}
    {selectedProduct && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}><section role="dialog" aria-modal="true" aria-label={selectedProduct.name} className="relative grid max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white shadow-2xl md:grid-cols-2"><button aria-label="Đóng chi tiết" onClick={() => setSelectedProduct(null)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow"><X className="size-5"/></button>{selectedProduct.image_url ? <img src={selectedProduct.image_url} alt={selectedProduct.image_alt || selectedProduct.name} className="h-64 w-full object-cover md:h-full"/> : <div className="flex min-h-64 items-center justify-center bg-emerald-50"><Package className="size-16 text-emerald-700"/></div>}<div className="p-6"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{categories.find((c) => c.slug === selectedProduct.category_slug)?.name}</p><h2 className="mt-2 text-2xl font-black">{selectedProduct.name}</h2>{selectedProduct.sku && <p className="mt-1 text-xs text-slate-500">SKU {selectedProduct.sku}</p>}<p className="mt-3 text-sm leading-6 text-slate-600">{selectedProduct.description}</p><p className="mt-5 text-2xl font-black text-emerald-800">{money(selectedProduct.price_vnd)}</p>{Object.entries(selectedProduct.specifications ?? {}).length > 0 && <dl className="mt-4 space-y-2 border-t pt-4">{Object.entries(selectedProduct.specifications).map(([key, value]) => <div key={key} className="flex justify-between gap-4 text-sm"><dt className="capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="text-right font-semibold">{String(value)}</dd></div>)}</dl>}<button disabled={!selectedProduct.stock_quantity} onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="mt-6 min-h-11 w-full rounded-xl bg-slate-900 font-bold text-white disabled:opacity-40">Thêm vào giỏ</button></div></section></div>}
  </main>;
};
