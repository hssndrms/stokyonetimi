
import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getSupabaseCredentials, setSupabaseCredentials } from '../utils/supabase';
import { formInputClass, formLabelClass } from '../styles/common';

const SETUP_SQL = `
-- Stok Takip Uygulaması Kurulum Betiği
-- Bu betik, uygulamanın ihtiyaç duyduğu tüm tabloları, fonksiyonları ve güvenlik kurallarını oluşturur.
-- Supabase projenizdeki SQL Editor'e yapıştırıp çalıştırın.

-- Önceki objeleri temizle (isteğe bağlı, temiz kurulum için)
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


-- stock_movements (Stok Hareketleri) - Rafsız depo desteği eklendi
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    shelf_id UUID NULL REFERENCES public.shelves(id) ON DELETE RESTRICT, -- NULL olabilir
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
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
    stock_transfer_length INT NOT NULL
);

-- 2. GÜNCELLEME TRIGGER'LARINI OLUŞTURMA
-- =============================================

CREATE TRIGGER handle_stock_items_updated_at BEFORE UPDATE ON public.stock_items
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_stock_movements_updated_at BEFORE UPDATE ON public.stock_movements
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- 3. VARSAYILAN AYARLARI EKLEME
-- =============================================
INSERT INTO public.general_settings (id, customer_code_prefix, customer_code_length, supplier_code_prefix, supplier_code_length, stock_in_prefix, stock_in_length, stock_out_prefix, stock_out_length, stock_transfer_prefix, stock_transfer_length)
VALUES (1, 'M', 5, 'T', 5, 'G', 8, 'C', 8, 'TR', 8) ON CONFLICT(id) DO NOTHING;


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
        END,
        CASE 
            WHEN p_type = 'IN' THEN stock_in_length
            WHEN p_type = 'OUT' THEN stock_out_length
            WHEN p_type = 'TRANSFER' THEN stock_transfer_length
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


-- Stok Giriş/Çıkış Hareketlerini İşleme Fonksiyonu (RAFLI/RAFSIZ DEPO DESTEĞİ İLE) - DÜZELTİLDİ
CREATE OR REPLACE FUNCTION public.process_stock_movement(
    p_product_id uuid,
    p_warehouse_id uuid,
    p_shelf_id uuid,
    p_quantity numeric,
    p_type text
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    current_quantity numeric;
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
        SELECT quantity INTO current_quantity
        FROM public.stock_items
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND shelf_id IS NOT DISTINCT FROM p_shelf_id;

        IF current_quantity IS NULL OR current_quantity < p_quantity THEN
            RAISE EXCEPTION 'Yetersiz stok: Ürün ID %, Depo ID %, Raf ID %', p_product_id, p_warehouse_id, p_shelf_id;
        END IF;

        UPDATE public.stock_items
        SET quantity = quantity - p_quantity
        WHERE product_id = p_product_id 
          AND warehouse_id = p_warehouse_id 
          AND shelf_id IS NOT DISTINCT FROM p_shelf_id;
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
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
            'IN',
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
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
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
            'OUT',
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
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
    line JSONB;
BEGIN
    voucher_num := public.get_next_voucher_number('TRANSFER');
    
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        -- Çıkış hareketi
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'source_warehouse_id')::uuid,
            (header_data->>'source_shelf_id')::uuid,
            'OUT',
            (header_data->>'date')::date,
            'Transfer',
            header_data->>'notes'
        );
        PERFORM public.process_stock_movement((line->>'product_id')::uuid, (header_data->>'source_warehouse_id')::uuid, (header_data->>'source_shelf_id')::uuid, (line->>'quantity')::numeric, 'OUT');

        -- Giriş hareketi
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (
            voucher_num,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'dest_warehouse_id')::uuid,
            (header_data->>'dest_shelf_id')::uuid,
            'IN',
            (header_data->>'date')::date,
            'Transfer',
            header_data->>'notes'
        );
        PERFORM public.process_stock_movement((line->>'product_id')::uuid, (header_data->>'dest_warehouse_id')::uuid, (header_data->>'dest_shelf_id')::uuid, (line->>'quantity')::numeric, 'IN');
    END LOOP;
END;
$$;


-- Stok Fişi Silme Fonksiyonu
CREATE OR REPLACE FUNCTION public.delete_stock_voucher(p_voucher_number text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    movement RECORD;
    reverse_type TEXT;
BEGIN
    FOR movement IN SELECT * FROM public.stock_movements WHERE voucher_number = p_voucher_number
    LOOP
        IF movement.type = 'IN' THEN
            reverse_type := 'OUT';
        ELSE
            reverse_type := 'IN';
        END IF;

        PERFORM public.process_stock_movement(
            movement.product_id,
            movement.warehouse_id,
            movement.shelf_id,
            movement.quantity,
            reverse_type
        );
    END LOOP;

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
    -- Önceki hareketleri geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    movement_type := header_data->>'type';
    
    IF movement_type IS NULL OR (movement_type <> 'IN' AND movement_type <> 'OUT') THEN
        RAISE EXCEPTION 'Geçersiz hareket tipi sağlandı: %', movement_type;
    END IF;

    -- Yeni hareketleri ekle
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (
            p_voucher_number,
            (line->>'product_id')::uuid,
            (line->>'quantity')::numeric,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
            movement_type,
            (header_data->>'date')::date,
            header_data->>'source_or_destination',
            header_data->>'notes'
        );

        PERFORM public.process_stock_movement(
            (line->>'product_id')::uuid,
            (header_data->>'warehouse_id')::uuid,
            (header_data->>'shelf_id')::uuid,
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
    line JSONB;
BEGIN
    -- Önceki hareketleri geri al
    PERFORM public.delete_stock_voucher(p_voucher_number);

    -- Yeni hareketleri ekle
    FOR line IN SELECT * FROM jsonb_array_elements(lines_data)
    LOOP
        -- Çıkış
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (p_voucher_number, (line->>'product_id')::uuid, (line->>'quantity')::numeric, (header_data->>'source_warehouse_id')::uuid, (header_data->>'source_shelf_id')::uuid, 'OUT', (header_data->>'date')::date, 'Transfer', header_data->>'notes');
        PERFORM public.process_stock_movement((line->>'product_id')::uuid, (header_data->>'source_warehouse_id')::uuid, (header_data->>'source_shelf_id')::uuid, (line->>'quantity')::numeric, 'OUT');

        -- Giriş (DÜZELTİLDİ: hedef depo ve raf kullanılıyor)
        INSERT INTO public.stock_movements (voucher_number, product_id, quantity, warehouse_id, shelf_id, type, date, source_or_destination, notes)
        VALUES (p_voucher_number, (line->>'product_id')::uuid, (line->>'quantity')::numeric, (header_data->>'dest_warehouse_id')::uuid, (header_data->>'dest_shelf_id')::uuid, 'IN', (header_data->>'date')::date, 'Transfer', header_data->>'notes');
        PERFORM public.process_stock_movement((line->>'product_id')::uuid, (header_data->>'dest_warehouse_id')::uuid, (header_data->>'dest_shelf_id')::uuid, (line->>'quantity')::numeric, 'IN');
    END LOOP;
END;
$$;
`;

interface VersionUpdate {
  version: string;
  date: string;
  description: string;
  sql: string;
}

// Gelecekteki veritabanı güncellemeleri bu diziye eklenecektir.
const VERSION_UPDATES: VersionUpdate[] = [
    
].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));


const SetupPage: React.FC<{ onCheckAgain: () => void; reason: 'tables' | 'config' | null; onClose?: () => void; loading: boolean; }> = ({ onCheckAgain, reason, onClose, loading }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'setup' | 'updates'>('setup');
    
    const [credentials, setCredentials] = useState({ url: '', anonKey: '' });
    
    useEffect(() => {
        const { url, anonKey } = getSupabaseCredentials();
        setCredentials({ url: url || '', anonKey: anonKey || '' });
    }, [reason]);

    const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAndCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!credentials.url.trim().startsWith('http') || credentials.anonKey.trim().length < 20) {
            addToast('Lütfen geçerli bir Supabase URL ve Anon Key girin.', 'error');
            return;
        }
        setSupabaseCredentials(credentials.url.trim(), credentials.anonKey.trim());
        addToast('Kimlik bilgileri kaydedildi. Bağlantı kontrol ediliyor...', 'info');
        
        await onCheckAgain();
    };


    const copySqlToClipboard = (sql: string, message: string) => {
        navigator.clipboard.writeText(sql)
            .then(() => {
                addToast(message, 'success');
            })
            .catch(err => {
                console.error('Copy failed', err);
                addToast('Kopyalama başarısız oldu. Lütfen manuel olarak kopyalayın.', 'error');
            });
    };
    
    const handleCheckAgain = async () => {
        addToast('Bağlantı ve veritabanı durumu kontrol ediliyor...', 'info');
        await onCheckAgain();
    };

    const effectiveReason = reason || 'config';

    if (effectiveReason === 'config') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="text-left p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto w-full">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Supabase Bağlantı Kurulumu</h1>
                    <p className="text-slate-600 mb-6">
                        Uygulamanın veritabanına bağlanabilmesi için Supabase proje bilgilerinizi girin.
                        Bu bilgileri Supabase projenizin "Project Settings &gt; API" bölümünde bulabilirsiniz.
                    </p>
                    <form onSubmit={handleSaveAndCheck}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="url" className={formLabelClass}>Supabase URL</label>
                                <input
                                    type="text"
                                    id="url"
                                    name="url"
                                    value={credentials.url}
                                    onChange={handleCredentialChange}
                                    placeholder="https://proje-id.supabase.co"
                                    className={formInputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="anonKey" className={formLabelClass}>Supabase Anon Key (Public)</label>
                                <input
                                    type="text"
                                    id="anonKey"
                                    name="anonKey"
                                    value={credentials.anonKey}
                                    onChange={handleCredentialChange}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    className={formInputClass}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                            {onClose && (
                                <button type="button" onClick={onClose} className="font-semibold py-3 px-6 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                                    <i className="fa-solid fa-arrow-left mr-2"></i> Geri Dön
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
                            >
                                {loading ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> Kontrol Ediliyor...</>
                                ) : (
                                    <><i className="fa-solid fa-save"></i> Kaydet ve Bağlan</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    
    const CopyButton: React.FC<{ sqlToCopy: string, message: string }> = ({ sqlToCopy, message }) => {
        const [copied, setCopied] = useState(false);
        
        const handleClick = () => {
            copySqlToClipboard(sqlToCopy, message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        return (
            <button onClick={handleClick} className="bg-slate-600 text-white py-1 px-3 rounded-md text-sm hover:bg-slate-500 transition-colors">
                {copied ? <><i className="fa-solid fa-check mr-2"></i>Kopyalandı</> : <><i className="fa-solid fa-copy mr-2"></i>Kopyala</>}
            </button>
        );
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="text-left p-8 bg-white rounded-lg shadow-xl max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Veritabanı Yönetimi</h1>
                        <p className="text-slate-600 mb-6">
                           Uygulamanın veritabanını kurun veya güncelleyin.
                        </p>
                    </div>
                     {onClose && (
                        <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                             <i className="fa-solid fa-times mr-2"></i> Kapat
                        </button>
                    )}
                </div>

                <div className="mb-6 border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('setup')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'setup' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            İlk Kurulum
                        </button>
                        <button onClick={() => setActiveTab('updates')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'updates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Versiyon Güncellemeleri
                        </button>
                    </nav>
                </div>
                
                <div>
                    {activeTab === 'setup' && (
                        <div>
                             <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                               <h3 className="font-bold text-lg text-red-800 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> DİKKAT!</h3>
                               <p className="text-red-700 mt-1">Bu betik, mevcut tüm stok takip tablolarınızı silip yeniden oluşturacaktır. Yalnızca uygulamayı <strong>ilk defa kuruyorsanız</strong> veya tüm verilerinizi sıfırlamak istiyorsanız çalıştırın.</p>
                            </div>
                            <p className="text-slate-700 mb-4">Aşağıdaki betiği kopyalayıp Supabase projenizdeki <strong>SQL Editor</strong>'e yapıştırın ve çalıştırın. Bu işlem, uygulamanın en güncel sürümüyle uyumlu tüm tabloları ve fonksiyonları oluşturacaktır.</p>
                             <div className="relative">
                                <div className="bg-slate-800 text-white p-4 rounded-md my-4 max-h-60 overflow-y-auto">
                                    <pre><code className="text-sm font-mono whitespace-pre-wrap">{SETUP_SQL}</code></pre>
                                </div>
                                <div className="absolute top-6 right-2">
                                    <CopyButton sqlToCopy={SETUP_SQL} message="Kurulum Betiği Panoya Kopyalandı!" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div>
                             <div className="p-4 bg-sky-50 border border-sky-200 rounded-md mb-4">
                               <h3 className="font-bold text-lg text-sky-800 flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> ÖNEMLİ!</h3>
                               <p className="text-sky-700 mt-1">Bu bölümdeki betikler, mevcut verilerinizi kaybetmeden veritabanı şemanızı günceller. Uygulamanızı güncel tutmak için yeni eklenen betikleri sırayla çalıştırmanız önerilir.</p>
                            </div>
                             {VERSION_UPDATES.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Şu anda bekleyen bir veritabanı güncellemesi yok. Gelecekteki güncellemeler burada listelenecektir.</p>
                            ) : (
                                <div className="space-y-6">
                                    {VERSION_UPDATES.map(update => (
                                       <div key={update.version} className="border rounded-lg p-4">
                                          <div className="flex justify-between items-center mb-2">
                                             <h4 className="font-bold text-lg text-slate-800">Versiyon {update.version} ({update.date})</h4>
                                             <CopyButton sqlToCopy={update.sql} message={`Versiyon ${update.version} Güncelleme Betiği Kopyalandı!`} />
                                          </div>
                                          <p className="text-slate-600 mb-4">{update.description}</p>
                                          <div className="bg-slate-800 text-white p-2 rounded-md max-h-40 overflow-auto">
                                             <pre><code className="text-sm font-mono whitespace-pre-wrap">{update.sql}</code></pre>
                                          </div>
                                       </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t flex justify-end">
                    <button
                        onClick={handleCheckAgain}
                        disabled={loading}
                        className="font-semibold py-3 px-6 rounded-md inline-flex items-center gap-3 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait"
                    >
                        {loading ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Kontrol Ediliyor...</>
                        ) : (
                            <><i className="fa-solid fa-check-double"></i> Kurulumu Kontrol Et ve Devam Et</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupPage;
