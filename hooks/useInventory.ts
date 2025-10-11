import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { Warehouse, Shelf, Product, StockItem, StockMovement, Account, AccountType, Unit, ProductGroup, WarehouseGroup, GeneralSettings } from '../types';
import { createSupabaseClient, areCredentialsSet } from '../utils/supabase';

const EMPTY_SETTINGS: GeneralSettings = {
    customer_code_prefix: 'M', customer_code_length: 5,
    supplier_code_prefix: 'T', supplier_code_length: 5,
    stock_in_prefix: 'G', stock_in_length: 8,
    stock_out_prefix: 'C', stock_out_length: 8,
    stock_transfer_prefix: 'TR', stock_transfer_length: 8,
};

export const useInventory = () => {
    const { addToast } = useToast();
    
    // Data states
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [warehouseGroups, setWarehouseGroups] = useState<WarehouseGroup[]>([]);
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(EMPTY_SETTINGS);

    // App state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [setupReason, setSetupReason] = useState<'tables' | 'config' | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        // DO NOT reset needsSetup and setupReason here. Let the checks determine the state.

        if (!areCredentialsSet()) {
            setNeedsSetup(true);
            setSetupReason('config');
            setLoading(false);
            return;
        }
        
        const supabase = createSupabaseClient();
        if (!supabase) {
             setNeedsSetup(true);
             setSetupReason('config');
             setLoading(false);
             return;
        }

        try {
            // First, check if the tables exist by querying one of them.
            const { error: setupCheckError } = await supabase.from('general_settings').select('id').limit(1);

            if (setupCheckError) {
                const errorMessage = setupCheckError.message.toLowerCase();
                const isTableMissingError = 
                    setupCheckError.code === '42P01' || // standard postgres undefined_table
                    (errorMessage.includes('relation') && errorMessage.includes('does not exist')) || 
                    errorMessage.includes('could not find the table'); // Supabase schema cache error

                if (isTableMissingError) {
                    setNeedsSetup(true);
                    setSetupReason('tables');
                    setLoading(false);
                    return;
                }
                
                // It's a different, unexpected error during the setup check.
                throw setupCheckError;
            }
            
            // If the check passes, it means tables exist. Now we can proceed and confirm setup is not needed.
            setNeedsSetup(false);
            setSetupReason(null);

            const [
                { data: warehousesData, error: warehousesError },
                { data: shelvesData, error: shelvesError },
                { data: productsData, error: productsError },
                { data: stockItemsData, error: stockItemsError },
                { data: stockMovementsData, error: stockMovementsError },
                { data: accountsData, error: accountsError },
                { data: unitsData, error: unitsError },
                { data: productGroupsData, error: productGroupsError },
                { data: warehouseGroupsData, error: warehouseGroupsError },
                { data: generalSettingsData, error: generalSettingsError },
            ] = await Promise.all([
                supabase.from('warehouses').select('*'),
                supabase.from('shelves').select('*'),
                supabase.from('products').select('*'),
                supabase.from('stock_items').select('*'),
                supabase.from('stock_movements').select('*').order('date', { ascending: false }),
                supabase.from('accounts').select('*'),
                supabase.from('units').select('*'),
                supabase.from('product_groups').select('*'),
                supabase.from('warehouse_groups').select('*'),
                supabase.from('general_settings').select('*').limit(1).single(),
            ]);
            
            const errors = [warehousesError, shelvesError, productsError, stockItemsError, stockMovementsError, accountsError, unitsError, productGroupsError, warehouseGroupsError].filter(Boolean);
            if (generalSettingsError && generalSettingsError.code !== 'PGRST116') { // PGRST116: exact one row not found, which is ok for new setups
                 errors.push(generalSettingsError);
            }

            if (errors.length > 0) throw errors[0];
            
            setWarehouses(warehousesData || []);
            setShelves(shelvesData || []);
            setProducts(productsData || []);
            setStockItems(stockItemsData || []);
            setStockMovements(stockMovementsData || []);
            setAccounts(accountsData || []);
            setUnits(unitsData || []);
            setProductGroups(productGroupsData || []);
            setWarehouseGroups(warehouseGroupsData || []);
            setGeneralSettings(generalSettingsData || EMPTY_SETTINGS);
            
        } catch (err: any) {
            console.error("Data fetch error:", err);
            let errorMessage = "Bilinmeyen bir hata oluştu. Lütfen konsolu kontrol edin.";
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message);
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            setError(`Veri yüklenirken bir hata oluştu: ${errorMessage}`);
            addToast('Veri yüklenemedi', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddWarehouse = async (data: Omit<Warehouse, 'id'>) => { 
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('warehouses').insert(data);
        if (error) { addToast(`Depo eklenemedi: ${error.message}`, 'error'); return false; }
        addToast('Depo başarıyla eklendi.', 'success'); 
        fetchData(); // Refresh data
        return true;
    };
    const handleEditWarehouse = async (warehouse: Warehouse) => { 
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('warehouses').update(warehouse).eq('id', warehouse.id);
        if (error) { addToast(`Depo güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Depo başarıyla güncellendi.', 'success'); 
        fetchData(); // Refresh data
        return true;
    };
    const handleDeleteWarehouse = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('warehouses').delete().eq('id', id);
        if (error) { addToast(`Depo silinemedi: ${error.message}`, 'error'); return; }
        addToast('Depo silindi.', 'success');
        fetchData(); // Refresh data
    };
    
    // Shelf Handlers
    const handleAddShelf = async (data: Omit<Shelf, 'id'>) => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('shelves').insert(data);
        if (error) { addToast(`Raf eklenemedi: ${error.message}`, 'error'); return false; }
        addToast('Raf başarıyla eklendi.', 'success');
        fetchData(); // Refresh data
        return true;
    };
    const handleEditShelf = async (shelf: Shelf) => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('shelves').update(shelf).eq('id', shelf.id);
        if (error) { addToast(`Raf güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Raf başarıyla güncellendi.', 'success');
        fetchData(); // Refresh data
        return true;
    };
    const handleDeleteShelf = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('shelves').delete().eq('id', id);
        if (error) { addToast(`Raf silinemedi: ${error.message}`, 'error'); return; }
        addToast('Raf silindi.', 'success');
        fetchData(); // Refresh data
    };

    // Product Handlers
    const handleAddProduct = async (product: Omit<Product, 'id'>): Promise<{ id: string, group_id: string } | null> => {
        const supabase = createSupabaseClient();
        if (!supabase) return null;
        const { data: newProduct, error } = await supabase.from('products').insert(product).select('id, group_id').single();
        if (error) {
            if (error.message.includes('products_sku_key')) {
                addToast('Bu SKU (Stok Kodu) ile başka bir ürün zaten mevcut. Lütfen farklı bir SKU kullanın.', 'error');
            } else {
                addToast(`Ürün eklenemedi: ${error.message}`, 'error');
            }
            return null;
        }
        addToast('Ürün başarıyla eklendi.', 'success');
        fetchData();
        return newProduct;
    };
    const handleEditProduct = async (product: Product) => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('products').update(product).eq('id', product.id);
        if (error) {
            if (error.message.includes('products_sku_key')) {
                addToast('Bu SKU (Stok Kodu) ile başka bir ürün zaten mevcut. Lütfen farklı bir SKU kullanın.', 'error');
            } else {
                addToast(`Ürün güncellenemedi: ${error.message}`, 'error');
            }
            return false;
        }
        addToast('Ürün başarıyla güncellendi.', 'success');
        fetchData();
        return true;
    };
    const handleDeleteProduct = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { addToast(`Ürün silinemedi: ${error.message}`, 'error'); return; }
        addToast('Ürün silindi.', 'success');
        fetchData();
    };
    
    // Account Handlers
    const handleAddAccount = async (accountData: Omit<Account, 'id' | 'code'>): Promise<string | null> => {
        const supabase = createSupabaseClient();
        if (!supabase) return null;
        const { data: newCode, error: codeError } = await supabase.rpc('get_next_account_code', { p_type: accountData.type });
        if(codeError) { addToast(`Cari kodu alınamadı: ${codeError.message}`, 'error'); return null; }
        
        const { data: newAccount, error } = await supabase.from('accounts').insert({ ...accountData, code: newCode }).select('id').single();
        if (error) { addToast(`Cari eklenemedi: ${error.message}`, 'error'); return null; }
        addToast('Cari başarıyla eklendi.', 'success');
        fetchData();
        return newAccount.id;
    };
    const handleEditAccount = async (account: Account) => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('accounts').update(account).eq('id', account.id);
        if (error) { addToast(`Cari güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Cari başarıyla güncellendi.', 'success');
        fetchData();
        return true;
    };
    const handleDeleteAccount = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('accounts').delete().eq('id', id);
        if (error) { addToast(`Cari silinemedi: ${error.message}`, 'error'); return; }
        addToast('Cari silindi.', 'success');
        fetchData();
    };

    // Unit Handlers
    const handleAddUnit = async (unit: Omit<Unit, 'id'>): Promise<string> => {
        const supabase = createSupabaseClient();
        if (!supabase) return '';
        const { data, error } = await supabase.from('units').insert(unit).select().single();
        if (error) { addToast(`Birim eklenemedi: ${error.message}`, 'error'); return ''; }
        addToast('Birim eklendi.', 'success');
        fetchData();
        return data?.id || '';
    }
    const handleEditUnit = async (unit: Unit): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('units').update(unit).eq('id', unit.id);
        if (error) { addToast(`Birim güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Birim güncellendi.', 'success');
        fetchData();
        return true;
    }
    const handleDeleteUnit = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('units').delete().eq('id', id);
        if (error) { addToast(`Birim silinemedi: ${error.message}`, 'error'); return; }
        addToast('Birim silindi.', 'success');
        fetchData();
    }
    
    // Product Group Handlers
    const handleAddProductGroup = async (group: Omit<ProductGroup, 'id'>): Promise<string> => {
        const supabase = createSupabaseClient();
        if (!supabase) return '';
        const { data, error } = await supabase.from('product_groups').insert(group).select().single();
        if (error) { addToast(`Ürün grubu eklenemedi: ${error.message}`, 'error'); return ''; }
        addToast('Ürün grubu eklendi.', 'success');
        fetchData();
        return data?.id || '';
    }
    const handleEditProductGroup = async (group: ProductGroup): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.from('product_groups').update(group).eq('id', group.id);
        if (error) { addToast(`Ürün grubu güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Ürün grubu güncellendi.', 'success');
        fetchData();
        return true;
    }
    const handleDeleteProductGroup = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('product_groups').delete().eq('id', id);
        if (error) { addToast(`Ürün grubu silinemedi: ${error.message}`, 'error'); return; }
        addToast('Ürün grubu silindi.', 'success');
        fetchData();
    }

    // Warehouse Group Handlers
    const handleAddWarehouseGroup = async (group: Omit<WarehouseGroup, 'id'>) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('warehouse_groups').insert(group);
        if (error) { addToast(`Depo grubu eklenemedi: ${error.message}`, 'error'); return; }
        addToast('Depo grubu eklendi.', 'success');
        fetchData();
    }
    const handleEditWarehouseGroup = async (group: WarehouseGroup) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('warehouse_groups').update(group).eq('id', group.id);
        if (error) { addToast(`Depo grubu güncellenemedi: ${error.message}`, 'error'); return; }
        addToast('Depo grubu güncellendi.', 'success');
        fetchData();
    }
    const handleDeleteWarehouseGroup = async (id: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('warehouse_groups').delete().eq('id', id);
        if (error) { addToast(`Depo grubu silinemedi: ${error.message}`, 'error'); return; }
        addToast('Depo grubu silindi.', 'success');
        fetchData();
    }
    
    // Settings Handler
    const handleSetGeneralSettings = async (settings: GeneralSettings) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.from('general_settings').update(settings).eq('id', 1); // Assuming single row with id=1
        if (error) { addToast(`Ayarlar kaydedilemedi: ${error.message}`, 'error'); return; }
        addToast('Ayarlar kaydedildi.', 'success');
        fetchData();
    }

    // RPC Calls for complex operations
    const generateSku = async (group_id: string): Promise<string> => {
        const supabase = createSupabaseClient();
        if (!supabase) return '';
        const { data, error } = await supabase.rpc('get_next_sku', { p_group_id: group_id });
        if (error) { addToast(`SKU üretilemedi: ${error.message}`, 'error'); return ''; }
        return data;
    };

    const getNextVoucherNumber = async (type: 'IN' | 'OUT' | 'TRANSFER'): Promise<string> => {
        const supabase = createSupabaseClient();
        if (!supabase) return '';
        const { data, error } = await supabase.rpc('get_next_voucher_number', { p_type: type });
        if (error) { addToast(`Fiş numarası alınamadı: ${error.message}`, 'error'); return ''; }
        return data;
    }
    
    const handleStockIn = async (header: any, lines: any[]): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc('stock_in', { header_data: header, lines_data: lines });
        if (error) { addToast(`Stok girişi başarısız: ${error.message}`, 'error'); return false; }
        addToast('Stok girişi başarılı.', 'success');
        fetchData();
        return true;
    };
    
    const handleStockOut = async (header: any, lines: any[]): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc('stock_out', { header_data: header, lines_data: lines });
        if (error) { addToast(`Stok çıkışı başarısız: ${error.message}`, 'error'); return false; }
        addToast('Stok çıkışı başarılı.', 'success');
        fetchData();
        return true;
    };

    const handleEditStockVoucher = async (voucher_number: string, header: any, lines: any[]): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc('edit_stock_voucher', { p_voucher_number: voucher_number, header_data: header, lines_data: lines });
        if (error) { addToast(`Fiş güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Stok fişi başarıyla güncellendi.', 'success');
        fetchData();
        return true;
    };

    const handleStockTransfer = async (header: any, lines: any[]): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc('stock_transfer', { header_data: header, lines_data: lines });
        if (error) { addToast(`Stok transferi başarısız: ${error.message}`, 'error'); return false; }
        addToast('Stok transferi başarılı.', 'success');
        fetchData();
        return true;
    };

    const handleEditStockTransfer = async (voucher_number: string, header: any, lines: any[]): Promise<boolean> => {
        const supabase = createSupabaseClient();
        if (!supabase) return false;
        const { error } = await supabase.rpc('edit_stock_transfer', { p_voucher_number: voucher_number, header_data: header, lines_data: lines });
        if (error) { addToast(`Transfer fişi güncellenemedi: ${error.message}`, 'error'); return false; }
        addToast('Transfer fişi başarıyla güncellendi.', 'success');
        fetchData();
        return true;
    };

    const handleDeleteStockVoucher = async (voucher_number: string) => {
        const supabase = createSupabaseClient();
        if (!supabase) return;
        const { error } = await supabase.rpc('delete_stock_voucher', { p_voucher_number: voucher_number });
        if (error) { addToast(`Stok fişi silinemedi: ${error.message}`, 'error'); return; }
        addToast('Stok fişi başarıyla silindi.', 'success');
        fetchData();
    };


    return {
        warehouses, shelves, products, stockItems, stockMovements, accounts, units, productGroups, warehouseGroups, generalSettings,
        loading, error, needsSetup, setupReason, fetchData,
        handleAddWarehouse, handleEditWarehouse, handleDeleteWarehouse,
        handleAddShelf, handleEditShelf, handleDeleteShelf,
        handleAddProduct, handleEditProduct, handleDeleteProduct,
        handleAddAccount, handleEditAccount, handleDeleteAccount,
        handleAddUnit, handleEditUnit, handleDeleteUnit,
        handleAddProductGroup, handleEditProductGroup, handleDeleteProductGroup,
        handleAddWarehouseGroup, handleEditWarehouseGroup, handleDeleteWarehouseGroup,
        handleStockIn, handleStockOut, handleEditStockVoucher, handleDeleteStockVoucher,
        handleStockTransfer, handleEditStockTransfer,
        generateSku,
        getNextVoucherNumber,
        setGeneralSettings: handleSetGeneralSettings
    };
};