-- Rich marketplace catalog, organization-scoped product media and starter content.
-- Seeded catalog content makes the storefront usable on first migration; replace
-- availability/prices with organization-confirmed values before accepting payment.

create table if not exists public.store_product_categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,48}$'),
  name text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.store_products
  add column if not exists sku text,
  add column if not exists short_description text not null default '',
  add column if not exists category_slug text references public.store_product_categories(slug) on update cascade on delete set null,
  add column if not exists specifications jsonb not null default '{}'::jsonb,
  add column if not exists tags text[] not null default '{}',
  add column if not exists warranty_months integer check (warranty_months is null or warranty_months between 0 and 120),
  add column if not exists origin_country text,
  add column if not exists weight_grams integer check (weight_grams is null or weight_grams between 0 and 1000000),
  add column if not exists image_alt text not null default '',
  add column if not exists is_featured boolean not null default false;

create unique index if not exists store_products_store_sku_unique
  on public.store_products(store_id, sku) where sku is not null;
create index if not exists store_products_category_idx on public.store_products(category_slug, is_published);
create index if not exists store_products_featured_idx on public.store_products(store_id, is_featured) where is_published;

insert into public.store_product_categories(slug,name,description,sort_order) values
  ('first-aid-kits','Bộ sơ cứu','Túi và bộ sơ cứu cho gia đình, trường học, văn phòng.',1),
  ('aed','AED & hồi sức','Máy AED, phụ kiện, bảng chỉ dẫn và vật tư CPR.',2),
  ('bleeding-control','Kiểm soát chảy máu','Gạc, băng ép và dụng cụ thực hành cầm máu.',3),
  ('training','Đào tạo','Khóa huấn luyện sơ cứu trực tiếp theo nhóm.',4),
  ('infant-care','Sơ cứu trẻ nhỏ','Tài liệu và bộ dụng cụ phù hợp cho người chăm sóc trẻ.',5),
  ('ppe','Bảo hộ cá nhân','Găng tay, mặt nạ và vật tư dùng một lần.',6)
on conflict (slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,is_active=true;

alter table public.store_product_categories enable row level security;
drop policy if exists store_product_categories_public_read on public.store_product_categories;
create policy store_product_categories_public_read on public.store_product_categories
  for select to anon, authenticated using (is_active);
grant select on public.store_product_categories to anon, authenticated;

-- Keep catalog write permissions aligned with the active organization role model.
drop policy if exists "organization members manage stores" on public.organization_stores;
create policy "organization owners and admins manage stores" on public.organization_stores for all to authenticated
  using (exists(select 1 from public.organization_members m where m.organization_id=organization_stores.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active))
  with check (exists(select 1 from public.organization_members m where m.organization_id=organization_stores.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active));
drop policy if exists "organization members manage products" on public.store_products;
create policy "organization owners and admins manage products" on public.store_products for all to authenticated
  using (exists(select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_products.store_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active))
  with check (exists(select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_products.store_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active));
drop policy if exists "store owners read orders" on public.store_orders;
create policy "store owners read orders" on public.store_orders for select to authenticated using (
  exists(select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_orders.store_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active)
);
drop policy if exists "store owners read order items" on public.store_order_items;
create policy "store owners read order items" on public.store_order_items for select to authenticated using (
  exists(select 1 from public.store_orders o join public.organization_stores s on s.id=o.store_id join public.organization_members m on m.organization_id=s.organization_id where o.id=store_order_items.order_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active)
);

create or replace function public.update_store_order_fulfillment(p_order_id uuid, p_next_status text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_order public.store_orders%rowtype;
begin
  if auth.uid() is null or p_next_status not in ('processing','shipped','completed') then raise exception 'INVALID_STATUS'; end if;
  select o.* into v_order from public.store_orders o
    join public.organization_stores s on s.id=o.store_id
    join public.organization_members m on m.organization_id=s.organization_id
    where o.id=p_order_id and m.user_id=auth.uid() and m.role in ('owner','admin') and m.is_active
    for update of o;
  if not found then raise exception 'FORBIDDEN'; end if;
  if not ((v_order.status='paid' and p_next_status='processing') or (v_order.status='processing' and p_next_status='shipped') or (v_order.status='shipped' and p_next_status='completed')) then raise exception 'INVALID_TRANSITION'; end if;
  update public.store_orders set status=p_next_status,updated_at=now() where id=p_order_id;
end;
$$;
revoke all on function public.update_store_order_fulfillment(uuid,text) from public;
grant execute on function public.update_store_order_fulfillment(uuid,text) to authenticated;

-- Organization members with owner/admin roles can upload only into their own
-- organization folder: {organization_id}/{store_id}/{filename}.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('store-products','store-products',true,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=6291456,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists store_products_media_public_read on storage.objects;
create policy store_products_media_public_read on storage.objects for select to anon,authenticated using(bucket_id='store-products');
drop policy if exists store_products_media_owner_insert on storage.objects;
create policy store_products_media_owner_insert on storage.objects for insert to authenticated with check(
  bucket_id='store-products' and exists(
    select 1 from public.organization_members m
    where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=(select auth.uid())
      and m.role in ('owner','admin') and m.is_active
  )
);
drop policy if exists store_products_media_owner_update on storage.objects;
create policy store_products_media_owner_update on storage.objects for update to authenticated using(
  bucket_id='store-products' and exists(select 1 from public.organization_members m where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active)
) with check(
  bucket_id='store-products' and exists(select 1 from public.organization_members m where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active)
);
drop policy if exists store_products_media_owner_delete on storage.objects;
create policy store_products_media_owner_delete on storage.objects for delete to authenticated using(
  bucket_id='store-products' and exists(select 1 from public.organization_members m where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=(select auth.uid()) and m.role in ('owner','admin') and m.is_active)
);

-- Stable, rerunnable initial catalog. Images are local first-party project assets.
insert into public.organizations(id,name,slug,description,plan,is_active)
values('4f79f7ac-8b92-4e02-98d4-3526c8f66701','GoldenMinutes Safety','goldenminutes-safety','Trang bị sơ cứu và huấn luyện kỹ năng an toàn cộng đồng.','free',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,is_active=true;

insert into public.organization_stores(id,organization_id,brand_name,description,is_published)
values('8d51e759-874f-42c4-b137-48c3c18c7001','4f79f7ac-8b92-4e02-98d4-3526c8f66701','GoldenMinutes Safety','Thiết bị sơ cứu, vật tư thực hành và chương trình đào tạo cho gia đình, trường học và tổ chức.',true)
on conflict(id) do update set brand_name=excluded.brand_name,description=excluded.description,is_published=true;

insert into public.store_products(id,store_id,sku,name,short_description,description,category_slug,image_url,image_alt,price_vnd,stock_quantity,specifications,tags,is_published,is_featured) values
('51a00001-1a00-4a00-8a00-000000000001','8d51e759-874f-42c4-b137-48c3c18c7001','GM-AED-01','Tủ AED treo tường có bảng chỉ dẫn','Tủ bảo quản AED kèm vị trí hiển thị dễ nhận biết.','Tủ treo tường dùng bố trí thiết bị AED tại khu vực công cộng. Cần kiểm tra kích thước tương thích với thiết bị trước khi lắp đặt.','aed','/assets/images/aed_defibrillator_access_1792058948229.jpg','Thiết bị AED trong khu vực công cộng',1290000,12,'{"installation":"treo tường","material":"thép sơn tĩnh điện","includes":"tủ và bảng chỉ dẫn"}','{AED,tủ,bảng chỉ dẫn}',true,true),
('51a00001-1a00-4a00-8a00-000000000002','8d51e759-874f-42c4-b137-48c3c18c7001','GM-CPR-KIT','Bộ thực hành CPR cơ bản','Vật tư thực hành CPR theo nhóm nhỏ.','Bộ dụng cụ hỗ trợ tổ chức buổi thực hành CPR. Cấu hình cụ thể được xác nhận theo lô cung cấp.','training','/assets/images/cpr_adult_training_1792058946824.jpg','Buổi thực hành CPR có hướng dẫn',890000,24,'{"use":"đào tạo","audience":"người lớn","cleaning":"làm theo hướng dẫn nhà sản xuất"}','{CPR,đào tạo,thực hành}',true,true),
('51a00001-1a00-4a00-8a00-000000000003','8d51e759-874f-42c4-b137-48c3c18c7001','GM-HEM-KIT','Bộ thực hành kiểm soát chảy máu','Vật tư hỗ trợ buổi học sơ cứu chảy máu.','Bộ học cụ dùng trong huấn luyện sơ cứu và thực hành băng ép; không thay thế đánh giá của nhân viên y tế.','bleeding-control','/assets/images/stop_the_bleed_dressing_1792058947096.jpg','Buổi hướng dẫn thực hành sơ cứu',520000,30,'{"use":"thực hành có giám sát","contents":"vật tư huấn luyện theo cấu hình lô"}','{sơ cứu,chảy máu,đào tạo}',true,true),
('51a00001-1a00-4a00-8a00-000000000004','8d51e759-874f-42c4-b137-48c3c18c7001','GM-FIRST-AID-M','Túi sơ cứu gia đình','Túi sơ cứu gọn nhẹ để sắp xếp vật tư cơ bản.','Túi đựng vật tư sơ cứu cho gia đình. Danh sách thành phần cần được nhà cung cấp xác nhận trước khi sử dụng.','first-aid-kits','/assets/images/stop_the_bleed_dressing_1792058947096.jpg','Vật tư được sử dụng trong buổi hướng dẫn sơ cứu',390000,35,'{"size":"M","contents":"theo cấu hình nhà cung cấp","storage":"nơi khô ráo"}','{gia đình,túi sơ cứu}',true,false),
('51a00001-1a00-4a00-8a00-000000000005','8d51e759-874f-42c4-b137-48c3c18c7001','GM-PPE-10','Mặt nạ CPR dùng một lần (10 chiếc)','Vật tư bảo hộ phục vụ huấn luyện CPR.','Sản phẩm dùng trong hoạt động huấn luyện. Kiểm tra hướng dẫn sử dụng và hạn dùng trên bao bì lô hàng.','ppe','/assets/images/cpr_adult_training_1792058946824.jpg','Hướng dẫn kỹ năng CPR',150000,60,'{"pack_size":10,"use":"huấn luyện","expiry":"xem bao bì"}','{CPR,bảo hộ}',true,false),
('51a00001-1a00-4a00-8a00-000000000006','8d51e759-874f-42c4-b137-48c3c18c7001','GM-AED-SIGN','Bộ bảng chỉ dẫn vị trí AED','Bảng nhận diện vị trí thiết bị AED.','Bộ bảng chỉ dẫn hỗ trợ người dùng nhận biết vị trí đặt AED. Lắp đặt theo quy định của địa điểm.','aed','/assets/images/aed_defibrillator_access_1792058948229.jpg','AED được bố trí tại nơi công cộng',180000,45,'{"material":"tùy lô","installation":"tường hoặc cửa"}','{AED,chỉ dẫn}',true,false),
('51a00001-1a00-4a00-8a00-000000000007','8d51e759-874f-42c4-b137-48c3c18c7001','GM-CLASS-OFFICE','Huấn luyện sơ cứu tại văn phòng','Chương trình thực hành theo nhóm, thời lượng dự kiến 4 giờ.','Buổi hướng dẫn trực tiếp về nhận biết tình huống, gọi hỗ trợ và thực hành kỹ năng sơ cứu cơ bản. Tổ chức liên hệ để thống nhất lịch, địa điểm và sĩ số.','training','/assets/images/cpr_adult_training_1792058946824.jpg','Nhóm học viên thực hành sơ cứu',4500000,10,'{"duration":"4 giờ","delivery":"trực tiếp","group_size":"xác nhận khi đặt lịch"}','{đào tạo,văn phòng,thực hành}',true,true),
('51a00001-1a00-4a00-8a00-000000000008','8d51e759-874f-42c4-b137-48c3c18c7001','GM-CLASS-FAMILY','Huấn luyện sơ cứu gia đình','Buổi học thực hành dành cho gia đình và người chăm sóc.','Chương trình hướng dẫn thực hành kỹ năng sơ cứu cơ bản; lịch học và nội dung được trao đổi cùng đơn vị tổ chức.','training','/assets/images/cpr_adult_training_1792058946824.jpg','Buổi học sơ cứu thực hành',1800000,12,'{"duration":"4 giờ","delivery":"trực tiếp","booking":"liên hệ xác nhận lịch"}','{đào tạo,gia đình}',true,false)
on conflict(id) do update set sku=excluded.sku,name=excluded.name,short_description=excluded.short_description,description=excluded.description,category_slug=excluded.category_slug,image_url=excluded.image_url,image_alt=excluded.image_alt,price_vnd=excluded.price_vnd,stock_quantity=excluded.stock_quantity,specifications=excluded.specifications,tags=excluded.tags,is_published=true,is_featured=excluded.is_featured,updated_at=now();
