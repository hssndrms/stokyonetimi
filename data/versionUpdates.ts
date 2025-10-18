export interface VersionUpdate {
  version: string;
  date: string;
  description: string;
  sql: string;
}

// Gelecekteki veritabanı güncellemeleri bu diziye eklenecektir.
export const VERSION_UPDATES: VersionUpdate[] = [
{
  version: '1.4.2',
  date: '2025-10-15',
  description: 'Otomatik numara üreten fonksiyonlar (`get_next_voucher_number`, `get_next_sku`, `get_next_account_code`), bir önekin başka bir önekin alt kümesi olması durumunda (örn: "T" ve "TR") ortaya çıkan çakışmaları önlemek için güncellendi. Sorgular artık kodun tam uzunluğunu da kontrol ederek "invalid input syntax" hatasını düzeltiyor.',
  sql: `
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
    WHERE voucher_number LIKE prefix || '%' AND LENGTH(voucher_number) = (LENGTH(prefix) + len);

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
    WHERE group_id = p_group_id AND sku LIKE prefix || '%' AND LENGTH(sku) = (LENGTH(prefix) + len);

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
    WHERE type = p_type AND code LIKE prefix || '%' AND LENGTH(code) = (LENGTH(prefix) + len);

    new_number_str := LPAD(CAST(last_number + 1 AS TEXT), len, '0');

    RETURN prefix || new_number_str;
END;
$$;
`
},
{
  version: '1.4.0',
  date: '2025-10-14',
  description: 'Tüm stok işleme fonksiyonları (stock_in, stock_out, stock_transfer, process_production_voucher ve bunların düzenleme versiyonları), raf bilgisini artık fiş başlığından değil, her bir hareket satırından alacak şekilde güncellendi. Bu, tek bir fişte birden fazla raf ile işlem yapılmasına olanak tanır.',
  sql: `
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
`
},
{
  version: '1.3.4',
  date: '2025-10-12',
  description: 'Stok Ekstresi raporu eklendi',
  sql: '--Bu versiyonda çalıştırılması gereken SQL betiği bulunmuyor.'
},
{
        version: '1.3.3',
        date: '2025-10-12',
        description: 'Üretim fişi fonksiyonları (`process_production_voucher` ve `edit_production_voucher`) içindeki döngü değişkenleri (`consumed_line`, `produced_line`), `JSONB` yerine doğru tip olan `RECORD` olarak deklare edildi ve döngü yapısı `jsonb_to_recordset` kullanacak şekilde güncellendi. Bu, olası bir çalışma zamanı hatasını önler.',
        sql: `
CREATE OR REPLACE FUNCTION public.process_production_voucher(header_data json, consumed_lines jsonb, produced_lines jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    consumed_line RECORD;
    produced_line RECORD;
BEGIN
    voucher_num := public.get_next_voucher_number('PRODUCTION');
    
    -- Tüketilen malzemeleri stoktan düş
    FOR consumed_line IN SELECT * FROM jsonb_to_recordset(consumed_lines) as x(product_id uuid, quantity numeric)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            consumed_line.product_id,
            consumed_line.quantity,
            (header_data->>'source_warehouse_id')::uuid,
            (header_data->>'source_shelf_id')::uuid,
            'OUT',
            (header_data->>'date')::date,
            'Üretim Sarf',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            consumed_line.product_id, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            consumed_line.quantity, 
            'OUT'
        );
    END LOOP;

    -- Üretilen ürünleri stoğa ekle
    FOR produced_line IN SELECT * FROM jsonb_to_recordset(produced_lines) as x(product_id uuid, quantity numeric)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            produced_line.product_id,
            produced_line.quantity,
            (header_data->>'dest_warehouse_id')::uuid,
            (header_data->>'dest_shelf_id')::uuid,
            'IN',
            (header_data->>'date')::date,
            'Üretimden Giriş',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            produced_line.product_id, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            produced_line.quantity, 
            'IN'
        );
    END LOOP;
END;
$$;


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
    FOR consumed_line IN SELECT * FROM jsonb_to_recordset(consumed_lines) as x(product_id uuid, quantity numeric)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            consumed_line.product_id, 
            consumed_line.quantity, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            'OUT', 
            (header_data->>'date')::date, 
            'Üretim Sarf', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            consumed_line.product_id, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            consumed_line.quantity, 
            'OUT'
        );
    END LOOP;

    -- Üretilen
    FOR produced_line IN SELECT * FROM jsonb_to_recordset(produced_lines) as x(product_id uuid, quantity numeric)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            produced_line.product_id, 
            produced_line.quantity, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            'IN', 
            (header_data->>'date')::date, 
            'Üretimden Giriş', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            produced_line.product_id, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            produced_line.quantity, 
            'IN'
        );
    END LOOP;
END;
$$;`
    },
    {
        version: '1.3.2',
        date: '2025-10-12',
        description: 'Üretim fişi fonksiyonları (process_production_voucher ve edit_production_voucher), depo/raf bilgilerini artık her satırdan ayrı ayrı almak yerine fişin başlığından (header_data) alacak şekilde güncellendi. Bu, arayüzdeki değişikliği desteklemektedir.',
        sql: `
CREATE OR REPLACE FUNCTION public.process_production_voucher(header_data json, consumed_lines jsonb, produced_lines jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    voucher_num TEXT;
    consumed_line JSONB;
    produced_line JSONB;
BEGIN
    voucher_num := public.get_next_voucher_number('PRODUCTION');
    
    -- Tüketilen malzemeleri stoktan düş
    FOR consumed_line IN SELECT * FROM jsonb_array_elements(consumed_lines)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            (consumed_line->>'product_id')::uuid,
            (consumed_line->>'quantity')::numeric,
            (header_data->>'source_warehouse_id')::uuid,
            (header_data->>'source_shelf_id')::uuid,
            'OUT',
            (header_data->>'date')::date,
            'Üretim Sarf',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            (consumed_line->>'product_id')::uuid, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            (consumed_line->>'quantity')::numeric, 
            'OUT'
        );
    END LOOP;

    -- Üretilen ürünleri stoğa ekle
    FOR produced_line IN SELECT * FROM jsonb_array_elements(produced_lines)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            voucher_num,
            (produced_line->>'product_id')::uuid,
            (produced_line->>'quantity')::numeric,
            (header_data->>'dest_warehouse_id')::uuid,
            (header_data->>'dest_shelf_id')::uuid,
            'IN',
            (header_data->>'date')::date,
            'Üretimden Giriş',
            header_data->>'notes',
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            (produced_line->>'product_id')::uuid, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            (produced_line->>'quantity')::numeric, 
            'IN'
        );
    END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.edit_production_voucher(p_voucher_number text, header_data json, consumed_lines jsonb, produced_lines jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    consumed_line JSONB;
    produced_line JSONB;
BEGIN
    -- Eski hareketleri ve stok etkilerini geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    -- Yeni hareketleri ekle (var olan fiş numarası ile)
    -- Tüketilen
    FOR consumed_line IN SELECT * FROM jsonb_array_elements(consumed_lines)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            (consumed_line->>'product_id')::uuid, 
            (consumed_line->>'quantity')::numeric, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            'OUT', 
            (header_data->>'date')::date, 
            'Üretim Sarf', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            (consumed_line->>'product_id')::uuid, 
            (header_data->>'source_warehouse_id')::uuid, 
            (header_data->>'source_shelf_id')::uuid, 
            (consumed_line->>'quantity')::numeric, 
            'OUT'
        );
    END LOOP;

    -- Üretilen
    FOR produced_line IN SELECT * FROM jsonb_array_elements(produced_lines)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes, transaction_type)
        VALUES (
            p_voucher_number, 
            (produced_line->>'product_id')::uuid, 
            (produced_line->>'quantity')::numeric, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            'IN', 
            (header_data->>'date')::date, 
            'Üretimden Giriş', 
            header_data->>'notes', 
            'PRODUCTION'
        );
        PERFORM public.process_stock_movement(
            (produced_line->>'product_id')::uuid, 
            (header_data->>'dest_warehouse_id')::uuid, 
            (header_data->>'dest_shelf_id')::uuid, 
            (produced_line->>'quantity')::numeric, 
            'IN'
        );
    END LOOP;
END;
$$;
        `
    }
 ].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));