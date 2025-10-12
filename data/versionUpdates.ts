export interface VersionUpdate {
  version: string;
  date: string;
  description: string;
  sql: string;
}

// Gelecekteki veritabanı güncellemeleri bu diziye eklenecektir.
export const VERSION_UPDATES: VersionUpdate[] = [
    {
        version: '1.3.3',
        date: '2024-07-31',
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
        date: '2024-07-30',
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
