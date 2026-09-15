-- SIKITCHEN OS - TAHAP 2 SCHEMA
-- 100% FREE Supabase PostgreSQL
-- Jalankan di Supabase SQL Editor

-- 1. PROFILES (RBAC untuk Tahap 3)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text check (role in ('owner','admin','kepala_dapur','delivery','kasir')) default 'admin',
  created_at timestamp with time zone default now()
);

-- 2. SUPPLIERS
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  address text,
  created_at timestamp with time zone default now()
);

-- 3. INVENTORY ITEMS (Bahan Baku)
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text check (category in ('beras','ayam','bumbu','sayur','minyak','packaging','lain')) default 'lain',
  unit text not null default 'kg', -- kg, liter, pcs, ikat
  stock_qty numeric(12,2) default 0,
  min_stock numeric(12,2) default 5,
  price_per_unit numeric(12,2) default 0, -- harga beli terakhir
  supplier_id uuid references suppliers(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. MENUS (Master Menu)
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_porsi int default 50, -- resep dasar untuk 50 porsi
  harga_jual_per_porsi numeric(12,2) default 0,
  created_at timestamp with time zone default now()
);

-- 5. RECIPES (Resep per menu)
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references menus(id) on delete cascade not null,
  inventory_item_id uuid references inventory_items(id) not null,
  qty_per_porsi numeric(12,4) not null, -- misal: ayam 0.2 kg per porsi
  created_at timestamp with time zone default now(),
  unique(menu_id, inventory_item_id)
);

-- 6. ORDERS (Transaksi inti - akan dipakai Tahap 5)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  menu_id uuid references menus(id),
  jumlah_porsi int not null,
  tanggal_order date default current_date,
  status text check (status in ('draft','confirmed','produksi','delivery','selesai','batal')) default 'draft',
  -- hasil kalkulasi HPP
  total_bahan numeric(12,2) default 0,
  total_bop numeric(12,2) default 0,
  total_manpower numeric(12,2) default 0,
  total_hpp numeric(12,2) default 0,
  total_jual numeric(12,2) default 0,
  profit numeric(12,2) default 0,
  manpower_json jsonb, -- simpan {prep, masak, packing}
  waktu_json jsonb, -- simpan {prep, masak, packing, total}
  created_at timestamp with time zone default now()
);

-- 7. STOCK MOVEMENTS (Kartu Stok - Tahap 5)
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references inventory_items(id) not null,
  type text check (type in ('in','out','adjustment')) not null,
  qty numeric(12,2) not null,
  ref_table text, -- 'orders', 'manual'
  ref_id uuid,
  notes text,
  created_at timestamp with time zone default now()
);

-- ENABLE RLS (aman untuk FREE tier)
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table inventory_items enable row level security;
alter table menus enable row level security;
alter table recipes enable row level security;
alter table orders enable row level security;
alter table stock_movements enable row level security;

-- POLICY: izinkan semua untuk anon & authenticated di Tahap 2 (Tahap 3 akan diperketat RBAC)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Tahap2 Allow All') then
    create policy "Tahap2 Allow All" on suppliers for all using (true) with check (true);
    create policy "Tahap2 Allow All" on inventory_items for all using (true) with check (true);
    create policy "Tahap2 Allow All" on menus for all using (true) with check (true);
    create policy "Tahap2 Allow All" on recipes for all using (true) with check (true);
    create policy "Tahap2 Allow All" on orders for all using (true) with check (true);
    create policy "Tahap2 Allow All" on stock_movements for all using (true) with check (true);
    create policy "Tahap2 Allow All" on profiles for all using (true) with check (true);
  end if;
end $$;

-- INDEX untuk kecepatan
create index if not exists idx_recipes_menu_id on recipes(menu_id);
create index if not exists idx_inventory_category on inventory_items(category);
create index if not exists idx_orders_status on orders(status);

-- SAMPLE DATA (3 bahan, 1 menu)
insert into suppliers (name, phone) values ('Supplier Pasar Induk', '08123456789') on conflict do nothing;

insert into inventory_items (name, category, unit, stock_qty, min_stock, price_per_unit) values
('Beras Premium', 'beras', 'kg', 100, 20, 13000),
('Ayam Potong', 'ayam', 'kg', 50, 10, 35000),
('Minyak Goreng', 'minyak', 'liter', 30, 5, 15000)
on conflict (name) do nothing;
