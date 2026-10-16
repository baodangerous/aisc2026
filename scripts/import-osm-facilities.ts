import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const sourceUrl = 'https://www.openstreetmap.org/copyright';
const payload = JSON.parse(await readFile('/tmp/hanoi-hospitals.json', 'utf8')) as {
  elements: Array<{ id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>;
};

const rows = payload.elements.flatMap((element) => {
  const tags = element.tags ?? {};
  const point = element.center ?? (element.lat !== undefined && element.lon !== undefined ? { lat: element.lat, lon: element.lon } : undefined);
  const name = tags.name || tags['name:vi'];
  if (!point || !name) return [];
  return [{
    name,
    type: 'hospital',
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ') || 'Xem địa chỉ trên bản đồ',
    province: tags['addr:province'] || tags['addr:city'] || 'Việt Nam',
    latitude: point.lat,
    longitude: point.lon,
    operating_hours: tags.opening_hours || 'Mở cửa theo thông tin cơ sở',
    phone: tags.phone || tags['contact:phone'] || null,
    source_url: sourceUrl,
    verified_at: null,
    status: 'pending',
  }];
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { error } = await supabase.from('medical_facilities').insert(rows);
if (error) throw error;
console.log(JSON.stringify({ imported: rows.length, status: 'pending', source: sourceUrl }));
