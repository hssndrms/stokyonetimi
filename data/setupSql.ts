export const SETUP_SQL = `
-- Stok Takip Uygulaması Kurulum Betiği v1.4.0
-- Bu betik, uygulamanın ihtiyaç duyduğu tüm tabloları, fonksiyonları ve güvenlik kurallarını oluşturur.
-- Supabase projenizdeki SQL Editor'e yapıştırıp çalıştırın.

-- Önceki objeleri temizle (isteğe bağlı, temiz kurulum için)
DROP FUNCTION IF EXISTS public.edit_production_voucher(text,json,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.process_production_voucher(json,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.edit_stock_transfer(text,json,jsonb);
DROP FUNCTION IF EXISTS public.edit_stock_voucher(text,json,jsonb);
DROP FUNCTION IF EXISTS public.delete_stock_voucher(text);
DROP FUNCTION IF EXISTS public.stock_transfer(json,jsonb);
DROP FUNCTION IF EXISTS public.stock_out(json,jsonb);
DROP FUNCTION IF EXISTS public.stock_in(json,jsonb);
DROP FUNCTION IF EXISTS public.process_stock_movement(uuid,uuid,uuid,numeric,text);
DROP FUNCTION IF EXISTS public.get_next_account_code(text);
DROP FUNCTION IF EXISTS public.get_next_sku(uuid);
DROP FUNCTION IF EXISTS public.get_next_voucher_number(text);
ALTER TABLE public.general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_groups DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.general_settings, public.stock_movements, public.stock_items, public.products, public.shelves, public.warehouses, public.accounts, public.units, public.product_groups, public.warehouse_groups CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at();


-- 1. TABLOLARI OLUŞTURMA
-- =============================================

-- Zaman damgası güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- warehouse_groups (Depo Grupları)
CREATE TABLE public.warehouse_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- product_groups (Ürün Grupları)
CREATE TABLE public.product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sku_prefix VARCHAR(5) NOT NULL,
    sku_length INT NOT NULL CHECK (sku_length BETWEEN 3 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- units (Birimler)
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- accounts (Cariler: Müşteri/Tedarikçi)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- warehouses (Depolar)
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    group_id UUID NOT NULL REFERENCES public.warehouse_groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shelves (Raflar)
CREATE TABLE public.shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(code, warehouse_id)
);

-- products (Ürünler)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES public.product_groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stock_items (Stok Durumları) - Rafsız depo desteği eklendi
CREATE TABLE public.stock_items (
    id BIGSERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    shelf_id UUID NULL REFERENCES public.shelves(id) ON DELETE CASCADE, -- NULL olabilir
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 0.0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Rafsız ve raflı durumlar için benzersizlik (uniqueness) kuralları
CREATE UNIQUE INDEX stock_items_shelf_unique ON public.stock_items (product_id, warehouse_id, shelf_id) WHERE shelf_id IS NOT NULL;
CREATE UNIQUE INDEX stock_items_warehouse_unique ON public.stock_items (product_id, warehouse_id) WHERE shelf_id IS NULL;


-- stock_movements (Stok Hareketleri) - Rafsız depo desteği ve işlem tipi eklendi
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    shelf_id UUID NULL REFERENCES public.shelves(id) ON DELETE RESTRICT, -- NULL olabilir
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    transaction_type TEXT NOT NULL DEFAULT 'STANDARD' CHECK (transaction_type IN ('STANDARD', 'TRANSFER', 'PRODUCTION')),
    date DATE NOT NULL,
    source_or_destination TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON public.stock_movements (voucher_number);
CREATE INDEX ON public.stock_movements (product_id);
CREATE INDEX ON public.stock_movements (date);


-- general_settings (Genel Ayarlar)
CREATE TABLE public.general_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    customer_code_prefix TEXT NOT NULL,
    customer_code_length INT NOT NULL,
    supplier_code_prefix TEXT NOT NULL,
    supplier_code_length INT NOT NULL,
    stock_in_prefix TEXT NOT NULL,
    stock_in_length INT NOT NULL,
    stock_out_prefix TEXT NOT NULL,
    stock_out_length INT NOT NULL,
    stock_transfer_prefix TEXT NOT NULL,
    stock_transfer_length INT NOT NULL,
    production_prefix TEXT NOT NULL,
    production_length INT NOT NULL
);

-- 2. GÜNCELLEME TRIGGER'LARINI OLUŞTURMA
-- =============================================

CREATE TRIGGER handle_stock_items_updated_at BEFORE UPDATE ON public.stock_items
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_stock_movements_updated_at BEFORE UPDATE ON public.stock_movements
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- 3. VARSAYILAN AYARLARI EKLEME
-- =============================================
INSERT INTO public.general_settings (id, customer_code_prefix, customer_code_length, supplier_code_prefix, supplier_code_length, stock_in_prefix, stock_in_length, stock_out_prefix, stock_out_length, stock_transfer_prefix, stock_transfer_length, production_prefix, production_length)
VALUES (1, 'M', 5, 'T', 5, 'G', 8, 'C', 8, 'TR', 8, 'URT', 8) ON CONFLICT(id) DO NOTHING;


-- 4. GÜVENLİK (ROW LEVEL SECURITY) KURALLARINI OLUŞTURMA
-- =============================================
ALTER TABLE public.warehouse_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.warehouse_groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.product_groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.units FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.shelves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.stock_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.general_settings FOR ALL USING (true) WITH CHECK (true);


-- 5. FONKSİYONLARI (RPC) OLUŞTURMA
-- =============================================

-- Yeni Fiş Numarası Üretme Fonksiyonu
CREATE OR REPLACE FUNCTION public.get_next_voucher_number(p_type text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    prefix TEXT;
    len INT;
    last_number INT;
    new_number_str TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN p_type = 'IN' THEN stock_in_prefix
            WHEN p_type = 'OUT' THEN stock_out_prefix
            WHEN p_type = 'TRANSFER' THEN stock_transfer_prefix
            WHEN p_type = 'PRODUCTION' THEN production_prefix
        END,
        CASE 
            WHEN p_type = 'IN' THEN stock_in_length
            WHEN p_type = 'OUT' THEN stock_out_length
            WHEN p_type = 'TRANSFER' THEN stock_transfer_length
            WHEN p_type = 'PRODUCTION' THEN production_length
        END
    INTO prefix, len
    FROM public.general_settings WHERE id = 1;

    SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM (LENGTH(prefix) + 1)) AS INTEGER)), 0)
    INTO last_number
    FROM public.stock_movements
    WHERE voucher_number LIKE prefix || '%';

    new_number_str := LPAD(CAST(last_number + 1 AS TEXT), len, '0');

    RETURN prefix || new_number_str;
END;
$$;

-- Yeni SKU Üretme Fonksiyonu
CREATE OR REPLACE FUNCTION public.get_next_sku(p_group_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    prefix TEXT;
    len INT;
    last_number INT;
    new_number_str TEXT;
BEGIN
    SELECT sku_prefix, sku_length
    INTO prefix, len
    FROM public.product_groups WHERE id = p_group_id;

    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM (LENGTH(prefix) + 1)) AS INTEGER)), 0)
    INTO last_number
    FROM public.products
    WHERE group_id = p_group_id AND sku LIKE prefix || '%';

    new_number_str := LPAD(CAST(last_number + 1 AS TEXT), len, '0');

    RETURN prefix || new_number_str;
END;
$$;

-- Yeni Cari Kodu Üretme Fonksiyonu
CREATE OR REPLACE FUNCTION public.get_next_account_code(p_type text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    prefix TEXT;
    len INT;
    last_number INT;
    new_number_str TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN p_type = 'customer' THEN customer_code_prefix
            WHEN p_type = 'supplier' THEN supplier_code_prefix
        END,
        CASE 
            WHEN p_type = 'customer' THEN customer_code_length
            WHEN p_type = 'supplier' THEN supplier_code_length
        END
    INTO prefix, len
    FROM public.general_settings WHERE id = 1;

    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM (LENGTH(prefix) + 1)) AS INTEGER)), 0)
    INTO last_number
    FROM public.accounts
    WHERE type = p_type AND code LIKE prefix || '%';

    new_number_str := LPAD(CAST(last_number + 1 AS TEXT), len, '0');

    RETURN prefix || new_number_str;
END;
$$;


-- Stok hareketlerini işleyen ana fonksiyon
CREATE OR REPLACE FUNCTION public.process_stock_movement(
    p_product_id uuid,
    p_warehouse_id uuid,
    p_shelf_id uuid,
    p_quantity numeric,
    p_type text
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    rows_affected INT;
BEGIN
    IF p_type = 'IN' THEN
        IF p_shelf_id IS NULL THEN
             -- Rafsız depo için stok ekle/güncelle
             INSERT INTO public.stock_items (product_id, warehouse_id, shelf_id, quantity)
             VALUES (p_product_id, p_warehouse_id, NULL, p_quantity)
             ON CONFLICT (product_id, warehouse_id) WHERE shelf_id IS NULL
             DO UPDATE SET quantity = stock_items.quantity + EXCLUDED.quantity;
        ELSE
             -- Raflı depo için stok ekle/güncelle
             INSERT INTO public.stock_items (product_id, warehouse_id, shelf_id, quantity)
             VALUES (p_product_id, p_warehouse_id, p_shelf_id, p_quantity)
             ON CONFLICT (product_id, warehouse_id, shelf_id) WHERE shelf_id IS NOT NULL
             DO UPDATE SET quantity = stock_items.quantity + EXCLUDED.quantity;
        END IF;

    ELSIF p_type = 'OUT' THEN
        -- Stok düşürme işlemini atomik hale getir
        UPDATE public.stock_items
        SET quantity = quantity - p_quantity
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND shelf_id IS NOT DISTINCT FROM p_shelf_id
          AND quantity >= p_quantity; -- Kontrolü UPDATE sorgusuna dahil et
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;

        IF rows_affected = 0 THEN
            RAISE EXCEPTION 'Yetersiz stok: Ürün ID %, Depo ID %, Raf ID %', p_product_id, p_warehouse_id, p_shelf_id;
        END IF;
    END IF;
END;
$$;


-- Stok Giriş Fişi Fonksiyonu
CREATE OR REPLACE FUNCTION public.stock_in(header_data json, lines_data jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    line JSONB;
BEGIN
    voucher_num := public.get_next_voucher_number('IN');
    
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid, -- Satırdan raf al
            'IN',
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes',
            'STANDARD'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid, -- Satırdan raf al
            (line->>'quantity')::numeric,
            'IN'
        );
    END LOOP;
END;
$$;

-- Stok Çıkış Fişi Fonksiyonu
CREATE OR REPLACE FUNCTION public.stock_out(header_data json, lines_data jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    line JSONB;
BEGIN
    voucher_num := public.get_next_voucher_number('OUT');
    
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid, -- Satırdan raf al
            'OUT',
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes',
            'STANDARD'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid, -- Satırdan raf al
            (line->>'quantity')::numeric,
            'OUT'
        );
    END LOOP;
END;
$$;


-- Stok Transfer Fişi Fonksiyonu
CREATE OR REPLACE FUNCTION public.stock_transfer(header_data json, lines_data jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    line RECORD;
BEGIN
    voucher_num := public.get_next_voucher_number('TRANSFER');
    
    FOR line IN SELECT * FROM jsonb_to_recordset(lines_data) as x(product_id uuid, quantity numeric, source_shelf_id uuid, dest_shelf_id uuid)
    LOOP
        -- Çıkış hareketi
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            line.product_id,
            line.quantity,
            (header_data->>'source_warehouse_id')::uuid,
            line.source_shelf_id,
            'OUT',
            (header_data->>'date')::date,
            'Transfer',
            header_data->>'notes',
            'TRANSFER'
        );
        PERFORM public.process_stock_movement(line.product_id, (header_data->>'source_warehouse_id')::uuid, line.source_shelf_id, line.quantity, 'OUT');

        -- Giriş hareketi
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            line.product_id,
            line.quantity,
            (header_data->>'dest_warehouse_id')::uuid,
            line.dest_shelf_id,
            'IN',
            (header_data->>'date')::date,
            'Transfer',
            header_data->>'notes',
            'TRANSFER'
        );
        PERFORM public.process_stock_movement(line.product_id, (header_data->>'dest_warehouse_id')::uuid, line.dest_shelf_id, line.quantity, 'IN');
    END LOOP;
END;
$$;


-- Fiş silme (ve düzenleme sırasında geri alma) fonksiyonu
CREATE OR REPLACE FUNCTION public.delete_stock_voucher(p_voucher_number text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    movement RECORD;
    rows_affected INT;
BEGIN
    -- Geri alma işlemlerinde, önce stok ekleyen (OUT iptali) sonra stok düşüren (IN iptali)
    -- işlemleri yapmak daha güvenlidir. Bu yüzden hareketleri tipe göre sıralıyoruz.
    FOR movement IN 
        SELECT * FROM public.stock_movements 
        WHERE voucher_number = p_voucher_number
        ORDER BY type DESC -- 'OUT' ('IN' den önce gelir)
    LOOP
        IF movement.type = 'IN' THEN
            -- GİRİŞ hareketini geri almak, stok DÜŞÜRMEK demektir.
            -- İşlemi atomik hale getirerek güvenliği artır.
            UPDATE public.stock_items
            SET quantity = quantity - movement.quantity
            WHERE product_id = movement.product_id
              AND warehouse_id = movement.warehouse_id
              AND shelf_id IS NOT DISTINCT FROM movement.shelf_id
              AND quantity >= movement.quantity;
            
            GET DIAGNOSTICS rows_affected = ROW_COUNT;

            IF rows_affected = 0 THEN
                RAISE EXCEPTION 'Fiş güncellenemedi/silinemedi: İlgili stok başka bir işlemde kullanıldığı için yetersiz. (Ürün ID: %, Depo ID: %)', movement.product_id, movement.warehouse_id;
            END IF;

        ELSE -- movement.type = 'OUT'
            -- ÇIKIŞ hareketini geri almak, stok EKLEMEK demektir.
            -- Bu işlem her zaman güvenlidir, process_stock_movement 'IN' ile çağrılır.
            PERFORM public.process_stock_movement(
                movement.product_id,
                movement.warehouse_id,
                movement.shelf_id,
                movement.quantity,
                'IN'
            );
        END IF;
    END LOOP;

    -- Tüm stok işlemleri başarılıysa hareket kayıtlarını sil
    DELETE FROM public.stock_movements WHERE voucher_number = p_voucher_number;
END;
$$;


-- Stok Giriş/Çıkış Fişi Düzenleme Fonksiyonu
CREATE OR REPLACE FUNCTION public.edit_stock_voucher(p_voucher_number text, header_data json, lines_data jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    line JSONB;
    movement_type TEXT;
BEGIN
    -- Eski hareketleri ve stok etkilerini geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    movement_type := header_data->>'type';
    IF movement_type IS NULL OR (movement_type <> 'IN' AND movement_type <> 'OUT') THEN
        RAISE EXCEPTION 'Geçersiz hareket tipi: %', movement_type;
    END IF;

    -- Yeni hareketleri ekle
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid,
            movement_type,
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes',
            'STANDARD'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (line->>'shelf_id')::uuid,
            (line->>'quantity')::numeric,
            movement_type
        );
    END LOOP;
END;
$$;


-- Stok Transfer Fişi Düzenleme Fonksiyonu
CREATE OR REPLACE FUNCTION public.edit_stock_transfer(p_voucher_number text, header_data json, lines_data jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    line RECORD;
BEGIN
    -- Eski hareketleri ve stok etkilerini geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    -- Yeni hareketleri ekle
    FOR line IN SELECT * FROM jsonb_to_recordset(lines_data) as x(product_id uuid, quantity numeric, source_shelf_id uuid, dest_shelf_id uuid)
    LOOP
        -- Çıkış
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (p_voucher_number, line.product_id, line.quantity, (header_data->>'source_warehouse_id')::uuid, line.source_shelf_id, 'OUT', (header_data->>'date')::date, 'Transfer', header_data->>'notes', 'TRANSFER');
        PERFORM public.process_stock_movement(line.product_id, (header_data->>'source_warehouse_id')::uuid, line.source_shelf_id, line.quantity, 'OUT');

        -- Giriş
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (p_voucher_number, line.product_id, line.quantity, (header_data->>'dest_warehouse_id')::uuid, line.dest_shelf_id, 'IN', (header_data->>'date')::date, 'Transfer', header_data->>'notes', 'TRANSFER');
        PERFORM public.process_stock_movement(line.product_id, (header_data->>'dest_warehouse_id')::uuid, line.dest_shelf_id, line.quantity, 'IN');
    END LOOP;
END;
$$;

-- Üretim Fişi Fonksiyonu
CREATE OR REPLACE FUNCTION public.process_production_voucher(header_data json, consumed_lines jsonb, produced_lines jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    consumed_line RECORD;
    produced_line RECORD;
BEGIN
    voucher_num := public.get_next_voucher_number('PRODUCTION');
    
    -- Tüketilen malzemeleri stoktan düş
    FOR consumed_line IN SELECT * FROM jsonb_to_recordset(consumed_lines) as x(product_id uuid, quantity numeric, shelf_id uuid)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            consumed_line.product_id,
            consumed_line.quantity,
            (header_data->>'source_warehouse_id')::uuid,
            consumed_line.shelf_id,
            'OUT',
            (header_data->>'date')::date,
            'Üretim Sarf',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            consumed_line.product_id, 
            (header_data->>'source_warehouse_id')::uuid, 
            consumed_line.shelf_id, 
            consumed_line.quantity, 
            'OUT'
        );
    END LOOP;

    -- Üretilen ürünleri stoğa ekle
    FOR produced_line IN SELECT * FROM jsonb_to_recordset(produced_lines) as x(product_id uuid, quantity numeric, shelf_id uuid)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            produced_line.product_id,
            produced_line.quantity,
            (header_data->>'dest_warehouse_id')::uuid,
            produced_line.shelf_id,
            'IN',
            (header_data->>'date')::date,
            'Üretimden Giriş',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            produced_line.product_id, 
            (header_data->>'dest_warehouse_id')::uuid, 
            produced_line.shelf_id, 
            produced_line.quantity, 
            'IN'
        );
    END LOOP;
END;
$$;

-- Üretim Fişi Düzenleme Fonksiyonu
CREATE OR REPLACE FUNCTION public.edit_production_voucher(p_voucher_number text, header_data json, consumed_lines jsonb, produced_lines jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    consumed_line RECORD;
    produced_line RECORD;
BEGIN
    -- Eski hareketleri ve stok etkilerini geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    -- Yeni hareketleri ekle (var olan fiş numarası ile)
    -- Tüketilen
    FOR consumed_line IN SELECT * FROM jsonb_to_recordset(consumed_lines) as x(product_id uuid, quantity numeric, shelf_id uuid)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            consumed_line.product_id, 
            consumed_line.quantity, 
            (header_data->>'source_warehouse_id')::uuid, 
            consumed_line.shelf_id, 
            'OUT', 
            (header_data->>'date')::date, 
            'Üretim Sarf', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            consumed_line.product_id, 
            (header_data->>'source_warehouse_id')::uuid, 
            consumed_line.shelf_id, 
            consumed_line.quantity, 
            'OUT'
        );
    END LOOP;

    -- Üretilen
    FOR produced_line IN SELECT * FROM jsonb_to_recordset(produced_lines) as x(product_id uuid, quantity numeric, shelf_id uuid)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            produced_line.product_id, 
            produced_line.quantity, 
            (header_data->>'dest_warehouse_id')::uuid, 
            produced_line.shelf_id, 
            'IN', 
            (header_data->>'date')::date, 
            'Üretimden Giriş', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            produced_line.product_id, 
            (header_data->>'dest_warehouse_id')::uuid, 
            produced_line.shelf_id, 
            produced_line.quantity, 
            'IN'
        );
    END LOOP;
END;
$$;
`;