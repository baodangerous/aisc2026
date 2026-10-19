-- Organization storefronts and remote-assistance request queue.
-- Payment is deliberately not marked successful here: a verified gateway webhook
-- must transition an order from pending_payment to paid.
create table if not exists public.organization_stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  brand_name text not null check (char_length(brand_name) between 2 and 100),
  description text not null default '',
  logo_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.organization_stores(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  image_url text,
  price_vnd integer not null check (price_vnd > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.organization_stores(id),
  buyer_id uuid not null references auth.users(id),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','processing','shipped','completed','cancelled','refunded')),
  total_vnd integer not null check (total_vnd > 0),
  buyer_name text not null,
  buyer_phone text not null,
  shipping_address text not null,
  payment_provider text,
  provider_reference text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null references public.store_products(id),
  product_name text not null,
  unit_price_vnd integer not null,
  quantity integer not null check (quantity between 1 and 20),
  line_total_vnd integer not null
);

create table if not exists public.remote_assistance_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id),
  emergency_type text not null check (emergency_type in ('ohca','stroke','bleeding','choking','other')),
  status text not null default 'queued' check (status in ('queued','accepted','in_progress','completed','cancelled')),
  latitude double precision,
  longitude double precision,
  location_shared boolean not null default false,
  called_115 boolean not null default false,
  consented_at timestamptz not null default now(),
  responder_id uuid references auth.users(id),
  room_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)),
  check (location_shared or (latitude is null and longitude is null))
);

alter table public.organization_stores enable row level security;
alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.remote_assistance_requests enable row level security;
grant select, insert, update, delete on public.organization_stores to authenticated;
grant select, insert, update, delete on public.store_products to authenticated;
grant select on public.organization_stores, public.store_products to anon;
grant select on public.store_orders, public.store_order_items to authenticated;
grant insert, select on public.remote_assistance_requests to authenticated;

drop policy if exists "published stores are public" on public.organization_stores;
create policy "published stores are public" on public.organization_stores for select using (is_published);
drop policy if exists "organization members manage stores" on public.organization_stores;
create policy "organization members manage stores" on public.organization_stores for all to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = organization_stores.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
  with check (exists (select 1 from public.organization_members m where m.organization_id = organization_stores.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

drop policy if exists "published products are public" on public.store_products;
create policy "published products are public" on public.store_products for select using (
  is_published and exists (select 1 from public.organization_stores s where s.id = store_products.store_id and s.is_published)
);
drop policy if exists "organization members manage products" on public.store_products;
create policy "organization members manage products" on public.store_products for all to authenticated
  using (exists (select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_products.store_id and m.user_id=auth.uid() and m.role in ('owner','admin')))
  with check (exists (select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_products.store_id and m.user_id=auth.uid() and m.role in ('owner','admin')));

drop policy if exists "buyers read own orders" on public.store_orders;
create policy "buyers read own orders" on public.store_orders for select to authenticated using (buyer_id=auth.uid());
drop policy if exists "store owners read orders" on public.store_orders;
create policy "store owners read orders" on public.store_orders for select to authenticated using (
  exists (select 1 from public.organization_stores s join public.organization_members m on m.organization_id=s.organization_id where s.id=store_orders.store_id and m.user_id=auth.uid() and m.role in ('owner','admin'))
);
drop policy if exists "buyers read own order items" on public.store_order_items;
create policy "buyers read own order items" on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id=store_order_items.order_id and o.buyer_id=auth.uid())
);
drop policy if exists "store owners read order items" on public.store_order_items;
create policy "store owners read order items" on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o join public.organization_stores s on s.id=o.store_id join public.organization_members m on m.organization_id=s.organization_id where o.id=store_order_items.order_id and m.user_id=auth.uid() and m.role in ('owner','admin'))
);

create or replace function public.place_store_order(
  p_store_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_phone text,
  p_shipping_address text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_order uuid;
  v_total bigint := 0;
  v_item record;
  v_product public.store_products%rowtype;
begin
  if v_buyer is null then raise exception 'AUTH_REQUIRED'; end if;
  -- Release stock reserved by abandoned unpaid orders when another checkout runs.
  with expired as (
    update store_orders set status='cancelled', updated_at=now()
    where status='pending_payment' and expires_at < now()
    returning id
  )
  update store_products p set stock_quantity=p.stock_quantity + i.quantity, updated_at=now()
  from store_order_items i, expired e
  where i.order_id=e.id and p.id=i.product_id;
  if not exists (select 1 from organization_stores where id=p_store_id and is_published) then raise exception 'STORE_UNAVAILABLE'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'INVALID_CART'; end if;
  if length(trim(p_buyer_name)) not between 2 and 100 or length(regexp_replace(p_buyer_phone, '\D', '', 'g')) not between 9 and 15 or length(trim(p_shipping_address)) not between 8 and 300 then raise exception 'INVALID_BUYER_DETAILS'; end if;

  for v_item in select (x->>'product_id')::uuid as product_id, (x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x loop
    if v_item.quantity not between 1 and 20 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from store_products where id=v_item.product_id and store_id=p_store_id and is_published for update;
    if not found or v_product.stock_quantity < v_item.quantity then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_total := v_total + (v_product.price_vnd::bigint * v_item.quantity);
  end loop;
  if v_total > 1000000000 then raise exception 'ORDER_LIMIT_EXCEEDED'; end if;

  insert into store_orders(store_id,buyer_id,total_vnd,buyer_name,buyer_phone,shipping_address)
  values(p_store_id,v_buyer,v_total::integer,trim(p_buyer_name),trim(p_buyer_phone),trim(p_shipping_address)) returning id into v_order;

  for v_item in select (x->>'product_id')::uuid as product_id, (x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x loop
    select * into v_product from store_products where id=v_item.product_id and store_id=p_store_id and is_published for update;
    if v_product.stock_quantity < v_item.quantity then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    insert into store_order_items(order_id,product_id,product_name,unit_price_vnd,quantity,line_total_vnd)
    values(v_order,v_product.id,v_product.name,v_product.price_vnd,v_item.quantity,v_product.price_vnd*v_item.quantity);
    update store_products set stock_quantity=stock_quantity-v_item.quantity, updated_at=now() where id=v_product.id;
  end loop;
  return v_order;
end;
$$;
revoke all on function public.place_store_order(uuid,jsonb,text,text,text) from public;
grant execute on function public.place_store_order(uuid,jsonb,text,text,text) to authenticated;

create or replace function public.update_store_order_fulfillment(p_order_id uuid, p_next_status text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_order public.store_orders%rowtype;
begin
  if auth.uid() is null or p_next_status not in ('processing','shipped','completed') then raise exception 'INVALID_STATUS'; end if;
  select o.* into v_order from store_orders o
    join organization_stores s on s.id=o.store_id
    join organization_members m on m.organization_id=s.organization_id
    where o.id=p_order_id and m.user_id=auth.uid() and m.role in ('owner','admin')
    for update of o;
  if not found then raise exception 'FORBIDDEN'; end if;
  if not ((v_order.status='paid' and p_next_status='processing') or (v_order.status='processing' and p_next_status='shipped') or (v_order.status='shipped' and p_next_status='completed')) then
    raise exception 'INVALID_TRANSITION';
  end if;
  update store_orders set status=p_next_status, updated_at=now() where id=p_order_id;
end;
$$;
revoke all on function public.update_store_order_fulfillment(uuid,text) from public;
grant execute on function public.update_store_order_fulfillment(uuid,text) to authenticated;

-- Requesters can create and inspect only their own requests. Responder assignment,
-- status changes and room URLs are server/operator controlled via service role.
drop policy if exists "requesters create remote requests" on public.remote_assistance_requests;
create policy "requesters create remote requests" on public.remote_assistance_requests for insert to authenticated
  with check (requester_id=auth.uid() and called_115=true and status='queued' and responder_id is null and room_url is null);
drop policy if exists "requesters read own remote requests" on public.remote_assistance_requests;
create policy "requesters read own remote requests" on public.remote_assistance_requests for select to authenticated using (requester_id=auth.uid());

create index if not exists store_products_published_idx on public.store_products(store_id,is_published);
create index if not exists store_orders_buyer_idx on public.store_orders(buyer_id,created_at desc);
create index if not exists remote_assistance_queue_idx on public.remote_assistance_requests(status,created_at);
