import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ImagePlus, Package, Plus, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

type StoreRow = { id: string; organization_id: string; brand_name: string; description: string; logo_url: string | null; is_published: boolean };
type Product = { id: string; store_id: string; name: string; description: string; image_url: string | null; price_vnd: number; stock_quantity: number; is_published: boolean };
type CartItem = { product: Product; quantity: number };
type OrderRow = { id: string; store_id: string; buyer_id: string; status: string; total_vnd: number; created_at: string; buyer_name?: string; buyer_phone?: string; shipping_address?: string };
const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

export const StoreView: React.FC = () => {
  const { authUser, isAuthenticated } = useAuth();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [managedProducts, setManagedProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<OrderRow[]>([]);
  const [storeOrders, setStoreOrders] = useState<OrderRow[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [ownedStores, setOwnedStores] = useState<StoreRow[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyer, setBuyer] = useState({ name: '', phone: '', address: '' });
  const [brand, setBrand] = useState({ brand_name: '', description: '' });
  const [product, setProduct] = useState({ name: '', description: '', price: '', stock: '' });
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'shop' | 'manage'>('shop');

  const load = async () => {
    if (!supabase) return;
    const { data: publicStores } = await supabase.from('organization_stores').select('id,organization_id,brand_name,description,logo_url,is_published').eq('is_published', true).order('brand_name');
    const storeRows = (publicStores ?? []) as StoreRow[];
    setStores(storeRows);
    if (!selectedStore || !storeRows.some((s) => s.id === selectedStore)) setSelectedStore(storeRows[0]?.id ?? '');
    if (authUser) {
      const { data: buyerOrders } = await supabase.from('store_orders').select('id,store_id,buyer_id,status,total_vnd,created_at').eq('buyer_id', authUser.id).order('created_at', { ascending: false }).limit(20);
      setMyOrders((buyerOrders ?? []) as OrderRow[]);
      const { data: memberships } = await supabase.from('organization_members').select('organization_id,organizations(id,name)').eq('user_id', authUser.id);
      const orgRows = (memberships ?? []).map((m: any) => Array.isArray(m.organizations) ? m.organizations[0] : m.organizations).filter(Boolean) as { id: string; name: string }[];
      setOrganizations(orgRows);
      setSelectedOrg((prev) => orgRows.some((o) => o.id === prev) ? prev : orgRows[0]?.id ?? '');
      if (orgRows.length) {
        const { data: managed } = await supabase.from('organization_stores').select('id,organization_id,brand_name,description,logo_url,is_published').in('organization_id', orgRows.map((o) => o.id));
        setOwnedStores((managed ?? []) as StoreRow[]);
        const managedStoreIds = (managed ?? []).map((s: any) => s.id);
        if (managedStoreIds.length) {
          const { data: orderRows } = await supabase.from('store_orders').select('id,store_id,buyer_id,status,total_vnd,created_at,buyer_name,buyer_phone,shipping_address').in('store_id', managedStoreIds).order('created_at', { ascending: false }).limit(50);
          setStoreOrders((orderRows ?? []) as OrderRow[]);
        } else setStoreOrders([]);
        if (managedStoreIds.length) {
          const { data: items } = await supabase.from('store_products').select('id,store_id,name,description,image_url,price_vnd,stock_quantity,is_published').in('store_id', managedStoreIds).order('created_at', { ascending: false });
          setManagedProducts((items ?? []) as Product[]);
        } else setManagedProducts([]);
      }
    }
  };

  useEffect(() => { void load(); }, [authUser?.id]);
  useEffect(() => {
    const current = ownedStores.find((s) => s.organization_id === selectedOrg);
    setBrand({ brand_name: current?.brand_name ?? '', description: current?.description ?? '' });
  }, [selectedOrg, ownedStores]);
  useEffect(() => {
    if (!supabase || !selectedStore) { setProducts([]); return; }
    void supabase.from('store_products').select('id,store_id,name,description,image_url,price_vnd,stock_quantity,is_published').eq('store_id', selectedStore).eq('is_published', true).order('created_at', { ascending: false }).then(({ data }) => setProducts((data ?? []) as Product[]));
  }, [selectedStore]);

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
    const { data, error: checkoutError } = await supabase.rpc('place_store_order', {
      p_store_id: selectedStore,
      p_items: cart.map(({ product: item, quantity }) => ({ product_id: item.id, quantity })),
      p_buyer_name: buyer.name, p_buyer_phone: buyer.phone, p_shipping_address: buyer.address,
    });
    setBusy(false);
    if (checkoutError) { setError(checkoutError.message.includes('PRODUCT_UNAVAILABLE') ? 'Một sản phẩm vừa hết hàng. Hãy tải lại danh sách và cập nhật giỏ.' : 'Chưa thể tạo đơn. Kiểm tra thông tin giao hàng rồi thử lại.'); return; }
    setOrderId(String(data)); setCart([]); setNotice('Đơn đã được tạo ở trạng thái chờ thanh toán. Chưa có khoản tiền nào được thu.'); await load();
  };

  const saveStore = async () => {
    if (!supabase || !selectedOrg || brand.brand_name.trim().length < 2) return;
    setBusy(true); setError('');
    const current = ownedStores.find((s) => s.organization_id === selectedOrg);
    const result = current
      ? await supabase.from('organization_stores').update({ ...brand, updated_at: new Date().toISOString() }).eq('id', current.id).select().single()
      : await supabase.from('organization_stores').insert({ organization_id: selectedOrg, ...brand }).select().single();
    setBusy(false);
    if (result.error) { setError('Chưa thể lưu gian hàng. Cần quyền chủ sở hữu/quản trị viên và áp dụng migration cửa hàng.'); return; }
    setNotice('Đã lưu thương hiệu gian hàng.'); await load();
  };

  const createProduct = async () => {
    if (!supabase) return;
    const store = ownedStores.find((s) => s.organization_id === selectedOrg);
    const price = Number(product.price), stock = Number(product.stock);
    if (!store || product.name.trim().length < 2 || !Number.isInteger(price) || price < 1000 || !Number.isInteger(stock) || stock < 0) { setError('Chọn tổ chức có gian hàng và nhập tên, giá (VND), tồn kho hợp lệ.'); return; }
    setBusy(true); setError('');
    const { error: insertError } = await supabase.from('store_products').insert({ store_id: store.id, name: product.name.trim(), description: product.description.trim(), price_vnd: price, stock_quantity: stock, is_published: false });
    setBusy(false);
    if (insertError) { setError('Chưa thể thêm sản phẩm. Kiểm tra quyền quản lý gian hàng.'); return; }
    setProduct({ name: '', description: '', price: '', stock: '' }); setNotice('Đã tạo sản phẩm ở trạng thái nháp. Hãy rà soát hàng hóa và bật công khai trong danh sách sản phẩm.'); await load();
  };

  const toggleProduct = async (item: Product) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('store_products').update({ is_published: !item.is_published }).eq('id', item.id);
    if (updateError) setError('Chưa thể cập nhật sản phẩm.'); else { setNotice(item.is_published ? 'Đã ẩn sản phẩm.' : 'Sản phẩm đã được công khai.'); await load(); }
  };

  const toggleStore = async () => {
    if (!supabase) return;
    const store = ownedStores.find((s) => s.organization_id === selectedOrg);
    if (!store) return;
    const { error: updateError } = await supabase.from('organization_stores').update({ is_published: !store.is_published, updated_at: new Date().toISOString() }).eq('id', store.id);
    if (updateError) setError('Chưa thể cập nhật trạng thái gian hàng.'); else { setNotice(store.is_published ? 'Đã chuyển gian hàng về riêng tư.' : 'Gian hàng đã được công khai.'); await load(); }
  };

  const advanceOrder = async (order: OrderRow) => {
    if (!supabase) return;
    const next = order.status === 'paid' ? 'processing' : order.status === 'processing' ? 'shipped' : 'completed';
    const { error: statusError } = await supabase.rpc('update_store_order_fulfillment', { p_order_id: order.id, p_next_status: next });
    if (statusError) setError('Chỉ đơn đã thanh toán mới được chuyển bước xử lý.'); else { setNotice(`Đơn chuyển sang trạng thái ${next}.`); await load(); }
  };

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 sm:p-10 border border-amber-100">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">GoldenMinutes marketplace</p>
      <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Trang bị sẵn sàng cứu người</h1><p className="mt-2 max-w-2xl text-slate-600">Khám phá bộ sơ cứu và thiết bị do các tổ chức cung cấp, với giá và tồn kho được xác nhận khi đặt hàng.</p></div><div className="flex gap-2"><button onClick={() => setTab('shop')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === 'shop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}><ShoppingBag className="mr-2 inline size-4"/>Cửa hàng</button>{isAuthenticated && <button onClick={() => setTab('manage')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === 'manage' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}><Store className="mr-2 inline size-4"/>Quản lý thương hiệu</button>}</div></div>
    </section>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mt-5 rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}{orderId && <span className="ml-2 font-mono">Mã đơn: {orderId}</span>}</div>}

    {tab === 'shop' ? <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-2"><label className="text-sm font-bold">Thương hiệu</label><select value={selectedStore} onChange={(e) => { setSelectedStore(e.target.value); setCart([]); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Chọn gian hàng</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.brand_name}</option>)}</select></div>
        {products.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{item.image_url ? <img src={item.image_url} alt="" className="h-44 w-full object-cover"/> : <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50"><Package className="size-12 text-emerald-700"/></div>}<div className="p-4"><h2 className="font-bold text-slate-900">{item.name}</h2><p className="mt-1 min-h-10 text-sm text-slate-600">{item.description || 'Thiết bị sơ cứu do tổ chức cung cấp.'}</p><div className="mt-4 flex items-center justify-between"><div><p className="font-extrabold text-emerald-800">{money(item.price_vnd)}</p><p className="text-xs text-slate-500">Còn {item.stock_quantity}</p></div><button disabled={!item.stock_quantity} onClick={() => addToCart(item)} className="min-h-10 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white disabled:opacity-40">Thêm vào giỏ</button></div></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShoppingBag className="mx-auto size-10 text-slate-400"/><h2 className="mt-3 text-lg font-bold">Chưa có sản phẩm công khai</h2><p className="mt-1 text-sm text-slate-600">Các tổ chức có thể đăng ký thương hiệu và quản lý danh mục tại mục Quản lý thương hiệu.</p><Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-700">Không gian tổ chức <ArrowRight className="size-4"/></Link></div>}
      </section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBag className="size-5 text-emerald-700"/>Giỏ hàng <span className="ml-auto text-sm text-slate-500">{cart.reduce((n, i) => n + i.quantity, 0)} món</span></h2>{cart.length ? <div className="mt-4 space-y-3">{cart.map(({ product: item, quantity }) => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span>{item.name} × {quantity}</span><button aria-label={`Xóa ${item.name}`} onClick={() => setCart((c) => c.filter((i) => i.product.id !== item.id))}><Trash2 className="size-4 text-slate-400"/></button></div>)}<div className="flex justify-between font-extrabold"><span>Tạm tính</span><span>{money(cartTotal)}</span></div>{!isAuthenticated ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Đăng nhập để tạo đơn hàng. Bạn có thể xem sản phẩm trước khi đăng nhập.</p> : <div className="space-y-2"><input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Người nhận" className="min-h-10 w-full rounded-xl border px-3 text-sm"/><input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} placeholder="Số điện thoại" className="min-h-10 w-full rounded-xl border px-3 text-sm"/><textarea value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} placeholder="Địa chỉ giao hàng" className="min-h-20 w-full rounded-xl border p-3 text-sm"/><button disabled={busy} onClick={() => void checkout()} className="min-h-11 w-full rounded-xl bg-emerald-700 font-bold text-white disabled:opacity-50">{busy ? 'Đang tạo đơn…' : 'Tạo đơn hàng'}</button><p className="text-xs leading-relaxed text-slate-500">Cổng thanh toán trực tuyến chưa được cấu hình. Đơn sẽ ở trạng thái chờ thanh toán; chưa thu tiền và chưa xác nhận giao dịch.</p></div>}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Thêm sản phẩm để bắt đầu đặt hàng.</p>}</aside>
      {isAuthenticated && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Đơn hàng của tôi</h2>{myOrders.length ? <div className="mt-3 divide-y">{myOrders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString('vi-VN')}</p><p className="text-slate-500">{order.status === 'pending_payment' ? 'Chờ thanh toán' : order.status === 'paid' ? 'Đã thanh toán' : order.status}</p></div><span className="font-bold">{money(order.total_vnd)}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p>}</section>}
    </div> : <section className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Thương hiệu tổ chức</h2>{organizations.length ? <><label className="mt-4 block text-sm font-semibold">Tổ chức</label><select value={selectedOrg} onChange={(e) => { const id = e.target.value; setSelectedOrg(id); const store = ownedStores.find((s) => s.organization_id === id); setBrand({ brand_name: store?.brand_name ?? '', description: store?.description ?? '' }); }} className="mt-1 min-h-10 w-full rounded-xl border px-3">{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><label className="mt-4 block text-sm font-semibold">Tên thương hiệu</label><input value={brand.brand_name} onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })} placeholder="Ví dụ: GM Rescue Kit" className="mt-1 min-h-10 w-full rounded-xl border px-3"/><label className="mt-4 block text-sm font-semibold">Giới thiệu</label><textarea value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3"/><button onClick={() => void saveStore()} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 font-bold text-white"><Check className="mr-2 inline size-4"/>Lưu thương hiệu</button></> : <p className="mt-3 text-sm text-slate-600">Tạo tổ chức trước, sau đó chủ sở hữu hoặc quản trị viên có thể quản lý gian hàng.</p>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Danh mục sản phẩm</h2>{ownedStores.some((s) => s.organization_id === selectedOrg) && <button onClick={() => void toggleStore()} className={`min-h-10 rounded-xl px-3 text-sm font-bold ${ownedStores.find((s) => s.organization_id === selectedOrg)?.is_published ? 'border border-slate-300 text-slate-700' : 'bg-emerald-700 text-white'}`}>{ownedStores.find((s) => s.organization_id === selectedOrg)?.is_published ? 'Ẩn gian hàng' : 'Công khai gian hàng'}</button>}</div>{ownedStores.some((s) => s.organization_id === selectedOrg) ? <><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="Tên sản phẩm" className="min-h-10 rounded-xl border px-3"/><input type="number" min="1000" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} placeholder="Giá VND" className="min-h-10 rounded-xl border px-3"/><input type="number" min="0" value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} placeholder="Tồn kho" className="min-h-10 rounded-xl border px-3"/><button onClick={() => void createProduct()} className="min-h-10 rounded-xl bg-emerald-700 font-bold text-white"><Plus className="mr-1 inline size-4"/>Tạo bản nháp</button><textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} placeholder="Mô tả" className="min-h-20 rounded-xl border p-3 sm:col-span-2"/></div><div className="mt-5 divide-y">{managedProducts.filter((p) => ownedStores.some((s) => s.id === p.store_id && s.organization_id === selectedOrg)).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">{money(item.price_vnd)} · Tồn {item.stock_quantity} · {item.is_published ? 'Công khai' : 'Bản nháp'}</p></div><button onClick={() => void toggleProduct(item)} className="rounded-lg border px-3 py-2 text-sm font-semibold">{item.is_published ? 'Ẩn' : 'Công khai'}</button></div>)}</div><p className="mt-4 text-xs text-slate-500">Thanh toán, hóa đơn, vận chuyển và hoàn tiền cần tích hợp với nhà cung cấp/đối tác trước khi nhận giao dịch thật.</p></> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><ImagePlus className="mb-2 size-6"/>Lưu thương hiệu để bắt đầu tạo danh mục. Chỉ tài khoản có vai trò chủ sở hữu/quản trị viên được phép sửa.</div>}</div>
      {storeOrders.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="text-lg font-bold">Đơn hàng gian hàng</h2><div className="mt-3 divide-y">{storeOrders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">#{order.id.slice(0, 8)} · {order.buyer_name} · {order.buyer_phone}</p><p className="text-slate-500">{order.shipping_address} · {new Date(order.created_at).toLocaleDateString('vi-VN')}</p></div><div className="flex items-center gap-3"><span className="font-bold">{money(order.total_vnd)} · {order.status}</span>{['paid','processing','shipped'].includes(order.status) && <button onClick={() => void advanceOrder(order)} className="min-h-9 rounded-lg border px-3 font-semibold">{order.status === 'paid' ? 'Bắt đầu xử lý' : order.status === 'processing' ? 'Đánh dấu đã gửi' : 'Hoàn tất'}</button>}</div></div>)}</div><p className="mt-3 text-xs text-slate-500">Không thể chuyển đơn chờ thanh toán sang đang xử lý. Trạng thái “đã thanh toán” chỉ cổng thanh toán xác thực mới được ghi nhận.</p></section>}
    </section>}
  </main>;
};
