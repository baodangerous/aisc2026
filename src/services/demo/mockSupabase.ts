import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, any>;
const now = new Date().toISOString();
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, '0')}`;
const seed: Record<string, Row[]> = {
  profiles: [],
  medical_facilities: [],
  community_posts: Array.from({ length: 15 }, (_, i) => ({ id: id('post', i + 1), author_uid: ['citizen-001','volunteer-001','staff-001'][i % 3], title: ['Hướng dẫn chuẩn bị túi sơ cứu gia đình','Chia sẻ lớp học CPR cuối tuần','Tìm tình nguyện viên cho sự kiện cộng đồng','Nhắc nhở kiểm tra vị trí AED','Kinh nghiệm sơ cứu khi đi du lịch'][i % 5] + (i > 4 ? ` — ${i + 1}` : ''), body: 'Cùng chia sẻ kiến thức sơ cứu cơ bản, cách chuẩn bị an toàn và hỗ trợ cộng đồng khi cần thiết.', content: 'Cùng chia sẻ kiến thức sơ cứu cơ bản, cách chuẩn bị an toàn và hỗ trợ cộng đồng khi cần thiết.', category: ['general','training','event','aed','safety'][i % 5], status: 'published', media: [], created_at: new Date(Date.now() - i * 3600000).toISOString() })),
  community_alerts: Array.from({ length: 10 }, (_, i) => ({ id: id('alert', i + 1), title: ['Buổi tập huấn sơ cứu cộng đồng','Điểm hỗ trợ sự kiện cuối tuần','Chương trình hiến máu tình nguyện'][i % 3], description: 'Thông tin hoạt động cộng đồng để người dân tham khảo.', kind: 'other', radius_m: 5000, latitude: 10.77 + i * 0.002, longitude: 106.69 + i * 0.002, created_at: new Date(Date.now() - i * 7200000).toISOString() })),
  post_reactions: Array.from({ length: 20 }, (_, i) => ({ id: id('reaction', i + 1), post_id: id('post', (i % 15) + 1), user_id: id('citizen', (i % 10) + 1), reaction_type: 'like' })),
  forum_comments: Array.from({ length: 12 }, (_, i) => ({ id: id('comment', i + 1), post_id: id('post', (i % 15) + 1), author_uid: id('citizen', (i % 10) + 1), content: ['Cảm ơn thông tin hữu ích!','Mình sẽ lưu lại để tham khảo.','Có lịch tổ chức tiếp theo không ạ?'][i % 3], status: 'published', created_at: new Date(Date.now() - i * 1800000).toISOString() })),
  organization_stores: Array.from({ length: 5 }, (_, i) => ({ id: id('store', i + 1), organization_id: id('org', (i % 5) + 1), brand_name: ['An Tâm First Aid','Cộng đồng Sống Khỏe','CareKit Việt','Sơ Cứu Xanh','Golden Care'][i], description: 'Vật dụng hỗ trợ sơ cứu và an toàn cộng đồng.', logo_url: null, is_published: true })),
  store_product_categories: [{slug:'kits',name:'Bộ sơ cứu',is_active:true,sort_order:1},{slug:'supplies',name:'Vật tư',is_active:true,sort_order:2},{slug:'training',name:'Đào tạo',is_active:true,sort_order:3}],
  store_products: Array.from({ length: 20 }, (_, i) => ({ id: id('product', i + 1), store_id: id('store', (i % 5) + 1), sku: `GM-${String(i + 1).padStart(4,'0')}`, name: ['Bộ sơ cứu gia đình cơ bản','Băng gạc vô trùng','Găng tay y tế dùng một lần','Túi sơ cứu du lịch','Mặt nạ CPR bỏ túi'][i % 5] + (i > 4 ? ` ${Math.floor(i / 5) + 1}` : ''), short_description: 'Sản phẩm mẫu để trải nghiệm danh mục cửa hàng.', description: 'Mặt hàng giả lập phục vụ bản trình diễn, không phát sinh thanh toán thật.', category_slug: ['kits','supplies','supplies','kits','training'][i % 5], image_url: null, image_alt: 'Sản phẩm sơ cứu', price_vnd: [89000,35000,49000,129000,25000][i % 5], stock_quantity: 5 + i, specifications: {}, tags: ['sơ cứu','an toàn'], is_published: true, is_featured: i < 5, created_at: new Date(Date.now() - i * 86400000).toISOString() })),
  organizations: Array.from({ length: 5 }, (_, i) => ({ id: id('org', i + 1), name: ['Trung tâm Cộng đồng An Tâm','Phòng khám Bình Minh','Trường học Sống Khỏe','Đội phản ứng cộng đồng','Mạng lưới Care Việt'][i], organization_type: ['healthcare','school','enterprise','healthcare','government'][i], plan: 'demo', status: 'active', created_at: new Date(Date.now() - i * 86400000).toISOString() })),
  organization_members: [],
  sites: Array.from({ length: 10 }, (_, i) => ({ id: id('site', i + 1), organization_id: id('org', (i % 5) + 1), name: ['Cơ sở trung tâm','Điểm hỗ trợ cộng đồng'][i % 2] + ` ${i + 1}`, address: ['Quận 1, TP. Hồ Chí Minh','Quận 3, TP. Hồ Chí Minh','TP. Thủ Đức, TP. Hồ Chí Minh'][i % 3], is_active: true })),
  data_partnerships: Array.from({ length: 10 }, (_, i) => ({ id: id('partner', i + 1), organization_id: id('org', (i % 5) + 1), partner_name: ['Mạng lưới y tế cộng đồng','Trường học an toàn','Đơn vị hỗ trợ sự kiện'][i % 3], name: 'Đối tác demo', agreement_type: 'community', status: i % 4 ? 'active' : 'pending', created_at: now })),
  store_orders: Array.from({ length: 10 }, (_, i) => ({ id: id('order', i + 1), store_id: id('store', (i % 5) + 1), buyer_id: 'citizen-001', buyer_name: ['Nguyễn Minh Anh','Trần Gia Huy','Lê Thu Hà'][i % 3], buyer_phone: '0900000000', shipping_address: 'Địa chỉ demo, TP. Hồ Chí Minh', status: ['pending','confirmed','processing','completed'][i % 4], total_vnd: [89000,164000,129000,74000][i % 4], created_at: new Date(Date.now() - i * 86400000).toISOString() })),
  training_sessions: Array.from({ length: 20 }, (_, i) => ({ id: id('session', i + 1), user_id: id('citizen', (i % 10) + 1), organization_id: id('org', (i % 5) + 1), status: i % 4 ? 'completed' : 'in_progress', consent_to_organization_analytics: true, metrics: { adi: 25 + (i * 3) % 60, mro: i % 3 !== 0 }, created_at: new Date(Date.now() - i * 3600000).toISOString() })),
};
seed.medical_facilities = Array.from({ length: 20 }, (_, i) => ({ id: id('facility', i + 1), name: ['Điểm AED cộng đồng','Trung tâm y tế khu vực','Phòng khám cộng đồng','Điểm hỗ trợ sơ cứu','Bệnh viện đa khoa khu vực'][i % 5] + ` ${i + 1}`, type: i % 3 === 0 ? 'aed' : i % 3 === 1 ? 'hospital' : 'clinic', address: ['Đường Nguyễn Huệ','Đường Lê Lợi','Đường Điện Biên Phủ','Đường Võ Văn Tần'][i % 4] + `, TP. Hồ Chí Minh`, province: 'TP. Hồ Chí Minh', lat: 10.77 + (i % 5) * 0.006, lng: 106.69 + Math.floor(i / 5) * 0.006, operating_hours: '08:00–20:00', status: 'verified', verified_at: now, updated_at: now, phone: '02800000000' }));
seed.organization_members = Array.from({ length: 5 }, (_, i) => ({ id: id('membership', i + 1), organization_id: id('org', (i % 5) + 1), user_id: ['citizen-001','volunteer-001','staff-001','manager-001','admin-001'][i], role: ['viewer','analyst','site_manager','admin','owner'][i], is_active: true, organizations: seed.organizations[i] }));

const storageKey = 'goldenminutes.demo.tables.v1';
function readTables(): Record<string, Row[]> {
  try { const saved = localStorage.getItem(storageKey); if (saved) return { ...seed, ...JSON.parse(saved) }; } catch { /* start from seeded data */ }
  return structuredClone(seed);
}
let tables = typeof window === 'undefined' ? structuredClone(seed) : readTables();
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(tables)); } catch { /* in-memory demo remains usable */ } }
const matches = (row: Row, filters: Array<(r: Row) => boolean>) => filters.every((fn) => fn(row));
function queryBuilder(table: string) {
  let filters: Array<(r: Row) => boolean> = [];
  let sorters: Array<{ key: string; ascending: boolean }> = [];
  let maxRows = Infinity, start = 0, operation: 'select'|'insert'|'upsert'|'update'|'delete' = 'select';
  let payload: Row | Row[] = {};
  const api: any = {
    select: () => api, eq: (k: string,v: any) => { filters.push(r => r[k] === v); return api; },
    neq: (k: string,v: any) => { filters.push(r => r[k] !== v); return api; }, in: (k: string,vs: any[]) => { filters.push(r => vs.includes(r[k])); return api; },
    is: (k: string,v: any) => { filters.push(r => r[k] === v); return api; }, not: (k: string,op: string,v: any) => { filters.push(r => r[k] !== v); return api; },
    ilike: (k: string,v: string) => { const q=v.replace(/%/g,'').toLowerCase(); filters.push(r => String(r[k] ?? '').toLowerCase().includes(q)); return api; },
    or: () => api, match: (obj: Row) => { for(const [k,v] of Object.entries(obj)) filters.push(r => r[k] === v); return api; },
    order: (k: string,o?: {ascending?:boolean}) => { sorters.push({key:k,ascending:o?.ascending!==false}); return api; },
    limit: (n: number) => { maxRows=n; return api; }, range: (a: number,b: number) => { start=a; maxRows=b-a+1; return api; },
    insert: (v: Row|Row[]) => { operation='insert'; payload=v; return api; }, upsert: (v: Row|Row[]) => { operation='upsert'; payload=v; return api; },
    update: (v: Row) => { operation='update'; payload=v; return api; }, delete: () => { operation='delete'; return api; },
    maybeSingle: async () => { const result=await execute(); return { ...result, data: result.data?.[0] ?? null }; },
    single: async () => { const result=await execute(); return { ...result, data: result.data?.[0] ?? null }; },
    then: (resolve: any, reject: any) => execute().then(resolve,reject),
  };
  async function execute() {
    const rows = tables[table] || (tables[table]=[]);
    let data: Row[] = [];
    if(operation==='insert' || operation==='upsert') {
      const inputs=(Array.isArray(payload)?payload:[payload]).map((r)=>({id:r.id||`${table}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,created_at:r.created_at||now,...r}));
      for(const row of inputs) { const ix=rows.findIndex(x=>x.id===row.id); if(ix>=0) rows[ix]={...rows[ix],...row}; else rows.push(row); }
      data=inputs;
    } else if(operation==='update') { data=rows.filter(r=>matches(r,filters)); data.forEach(r=>Object.assign(r,payload)); }
    else if(operation==='delete') { data=rows.filter(r=>matches(r,filters)); tables[table]=rows.filter(r=>!matches(r,filters)); }
    else data=rows.filter(r=>matches(r,filters)).map(r=>({...r}));
    for(const s of sorters.slice().reverse()) data.sort((a,b)=>{ const c=String(a[s.key]??'').localeCompare(String(b[s.key]??'')); return (s.ascending?c:-c); });
    data=data.slice(start, start+maxRows);
    if(table==='organization_members') data=data.map(r=>({...r,organizations:r.organizations||tables.organizations?.find(o=>o.id===r.organization_id)||null}));
    persist();
    return { data, error:null, count:data.length, status:200, statusText:'OK' };
  }
  return api;
}
export function createDemoSupabase(): SupabaseClient {
  const authUser = (email: string) => ({ id: email.split('@')[0], aud:'authenticated', role:'authenticated', email, phone:'', app_metadata:{provider:'email',providers:['email']}, user_metadata:{display_name:email.split('@')[0], full_name:email.split('@')[0]}, identities:[], created_at:now }) as any;
  const auth: any = { getSession: async()=>({data:{session:null},error:null}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}), signOut:async()=>({error:null}), signInWithPassword:async({email}:any)=>({data:{user:authUser(email),session:{user:authUser(email)}},error:null}), signUp:async({email}:any)=>({data:{user:authUser(email),session:{user:authUser(email)}},error:null}), signInWithOAuth:async()=>({data:{url:null},error:null}), signInWithOtp:async()=>({error:null}), verifyOtp:async()=>({error:null}) };
  const storage:any={from:()=>({upload:async(path:string)=>({data:{path},error:null}),getPublicUrl:(path:string)=>({data:{publicUrl:`/demo-media/${path}`}})})};
  const client:any={auth,storage,from:(table:string)=>queryBuilder(table),channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>({error:null}),rpc:async()=>({data:[],error:null})};
  return client as SupabaseClient;
}
