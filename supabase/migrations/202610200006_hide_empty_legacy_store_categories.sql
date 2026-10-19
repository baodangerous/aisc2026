-- Hide legacy training/AED filters when they no longer contain catalog items.
-- Keep any category that another store is still using.
update public.store_product_categories c
set is_active = false
where c.slug in ('aed','bleeding-control','training','infant-care')
  and c.is_active
  and not exists (
    select 1 from public.store_products p where p.category_slug = c.slug
  );
