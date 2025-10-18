import React, { useState, useMemo, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockMovement, Unit, Account, ProductGroup, ModalState, GeneralSettings } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon, EraserIcon, ListIcon } from '../../components/icons';

type SortConfig = { key: string; direction: 'ascending' | 'descending' };

const StockMovementReportPage: React.FC<{
    movements: StockMovement[];
    products: Product[];
    warehouses: Warehouse[];
    shelves: Shelf[];
    units: Unit[];
    accounts: Account[];
    productGroups: ProductGroup[];
    setModal: (modal: ModalState) => void;
    generalSettings: GeneralSettings;
}> = ({ movements, products, warehouses, shelves, units, accounts, productGroups, setModal, generalSettings }) => {
    
    type Filters = {
        startDate: string;
        endDate: string;
        transactionType: string;
        warehouseId: string;
        shelfId: string;
        productId: string;
        productGroupId: string;
        partyId: string;
        notes: string;
    };
    
    const initialFilters: Filters = {
        startDate: '',
        endDate: '',
        transactionType: 'all',
        warehouseId: '',
        shelfId: '',
        productId: '',
        productGroupId: '',
        partyId: '',
        notes: '',
    };

    const [filters, setFilters] = useState(initialFilters);
    const [displayedData, setDisplayedData] = useState<any[]>([]);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const { addToast } = useToast();
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([{ key: 'Kayıt Zamanı', direction: 'descending' }]);

    const getUnitAbbr = (productId: string) => findById(units, findById(products, productId)?.unit_id)?.abbreviation || '';
    
    useEffect(() => {
        if (filters.warehouseId) {
            setAvailableShelves(shelves.filter(s => s.warehouse_id === filters.warehouseId));
            const currentShelf = findById(shelves, filters.shelfId);
            if(currentShelf && currentShelf.warehouse_id !== filters.warehouseId) {
                setFilters(f => ({ ...f, shelfId: '' }));
            }
        } else {
            setAvailableShelves([]);
             if (filters.shelfId) {
                setFilters(f => ({ ...f, shelfId: '' }));
            }
        }
    }, [filters.warehouseId, shelves, filters.shelfId]);
    
    useEffect(() => {
        if (filters.productGroupId) {
            setAvailableProducts(products.filter(p => p.group_id === filters.productGroupId));
            const currentProduct = findById(products, filters.productId);
            if (currentProduct && currentProduct.group_id !== filters.productGroupId) {
                setFilters(f => ({ ...f, productId: '' }));
            }
        } else {
            setAvailableProducts(products);
        }
    }, [filters.productGroupId, products, filters.productId]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterChange = (name: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setDisplayedData([]);
    };
    
    const handleVoucherClick = (voucherNumber: string) => {
        const movement = movements.find(m => m.voucher_number === voucherNumber);
        if (!movement) return;

        let modalType: ModalState['type'] = null;
        switch (movement.transaction_type) {
            case 'TRANSFER':
                modalType = 'EDIT_STOCK_TRANSFER';
                break;
            case 'PRODUCTION':
                modalType = 'EDIT_PRODUCTION_VOUCHER';
                break;
            case 'STANDARD':
            default:
                modalType = 'EDIT_STOCK_VOUCHER';
                break;
        }

        setModal({
            type: modalType,
            data: { voucher_number: voucherNumber }
        });
    };

    const handleListClick = () => {
        const filterPredicate = (item: StockMovement): boolean => {
            const itemDate = new Date(item.date);
            if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (itemDate > endDate) return false;
            }

            if (filters.transactionType && filters.transactionType !== 'all') {
                switch (filters.transactionType) {
                    case 'STANDARD_IN':
                        if (item.transaction_type !== 'STANDARD' || item.type !== 'IN') return false;
                        break;
                    case 'STANDARD_OUT':
                        if (item.transaction_type !== 'STANDARD' || item.type !== 'OUT') return false;
                        break;
                    case 'TRANSFER':
                        if (item.transaction_type !== 'TRANSFER') return false;
                        break;
                    case 'PRODUCTION_IN':
                        if (item.transaction_type !== 'PRODUCTION' || item.type !== 'IN') return false;
                        break;
                    case 'PRODUCTION_OUT':
                        if (item.transaction_type !== 'PRODUCTION' || item.type !== 'OUT') return false;
                        break;
                    default:
                        break;
                }
            }

            if (filters.productId && item.product_id !== filters.productId) return false;
            if (filters.productGroupId) {
                const product = findById(products, item.product_id);
                if (!product || product.group_id !== filters.productGroupId) return false;
            }
            if(filters.partyId) {
                const account = findById(accounts, filters.partyId);
                if (item.source_or_destination !== account?.name) {
                    return false;
                }
            }
             if (filters.notes && !item.notes?.toLowerCase().includes(filters.notes.toLowerCase().trim())) {
                return false;
            }
            if (filters.warehouseId) {
                 if (item.warehouse_id !== filters.warehouseId) {
                    // For transfers, check if the other leg of the transfer matches the warehouse filter
                    if (item.transaction_type === 'TRANSFER') {
                        const pairMovements = movements.filter(m => m.voucher_number === item.voucher_number && m.product_id === item.product_id);
                        const pair = pairMovements.find(p => p.id !== item.id);
                        if (!pair || pair.warehouse_id !== filters.warehouseId) return false;
                    } else {
                        // For non-transfers, it's a direct mismatch
                        return false;
                    }
                }
            }
            if (filters.shelfId) {
                 if (item.shelf_id !== filters.shelfId) {
                    if (item.transaction_type === 'TRANSFER') {
                        const pairMovements = movements.filter(m => m.voucher_number === item.voucher_number && m.product_id === item.product_id);
                        const pair = pairMovements.find(p => p.id !== item.id);
                        if (!pair || pair.shelf_id !== filters.shelfId) return false;
                    } else {
                         return false;
                    }
                 }
            }
            
            return true;
        };

        const filteredMovements = movements.filter(filterPredicate);

        const groupedByVoucher = filteredMovements.reduce((acc, m) => {
            if (!acc[m.voucher_number]) acc[m.voucher_number] = [];
            acc[m.voucher_number].push(m);
            return acc;
        }, {} as Record<string, StockMovement[]>);
        
        const finalReportData: any[] = [];

        Object.values(groupedByVoucher).forEach(movementsInVoucher => {
            const transactionType = movementsInVoucher[0].transaction_type;

            if (transactionType === 'TRANSFER') {
                const groupedByProduct = movementsInVoucher.reduce((acc, m) => {
                    if (!acc[m.product_id]) acc[m.product_id] = { in: null, out: null };
                    if (m.type === 'IN') acc[m.product_id].in = m;
                    else acc[m.product_id].out = m;
                    return acc;
                }, {} as Record<string, { in: StockMovement | null, out: StockMovement | null }>);

                Object.values(groupedByProduct).forEach(pair => {
                    if (pair.in && pair.out) {
                        const product = findById(products, pair.out.product_id);
                        const outWarehouse = findById(warehouses, pair.out.warehouse_id);
                        const outShelf = findById(shelves, pair.out.shelf_id);
                        const inWarehouse = findById(warehouses, pair.in.warehouse_id);
                        const inShelf = findById(shelves, pair.in.shelf_id);
                        
                        finalReportData.push({
                            "Tarih": new Date(pair.out.date).toLocaleDateString(),
                            "Fiş No": pair.out.voucher_number,
                            "İşlem Türü": "Transfer",
                            "Ürün Adı": product?.name,
                            "Miktar": formatNumber(pair.out.quantity),
                            "Birim": getUnitAbbr(pair.out.product_id),
                            "Çıkan Depo": outWarehouse?.name,
                            "Çıkan Raf": outShelf?.name,
                            "Giren Depo": inWarehouse?.name,
                            "Giren Raf": inShelf?.name,
                            "İlgili Cari": '-',
                            "Not": pair.out.notes,
                            "Kayıt Zamanı": new Date(pair.out.created_at).toLocaleString(),
                            "Güncelleme Zamanı": new Date(pair.out.created_at).getTime() === new Date(pair.out.updated_at).getTime() ? '-' : new Date(pair.out.updated_at).toLocaleString()
                        });
                    }
                });
            } else { // Handles 'STANDARD' and 'PRODUCTION'
                movementsInVoucher.forEach(m => {
                    const product = findById(products, m.product_id);
                    const warehouse = findById(warehouses, m.warehouse_id);
                    const shelf = findById(shelves, m.shelf_id);

                    let işlemTürü = '';
                    if (m.transaction_type === 'PRODUCTION') {
                        işlemTürü = m.type === 'IN' ? 'Üretimden Giriş' : 'Üretim Sarf';
                    } else { // STANDARD
                        işlemTürü = m.type === 'IN' ? 'Giriş' : 'Çıkış';
                    }

                    finalReportData.push({
                        "Tarih": new Date(m.date).toLocaleDateString(),
                        "Fiş No": m.voucher_number,
                        "İşlem Türü": işlemTürü,
                        "Ürün Adı": product?.name,
                        "Miktar": formatNumber(m.quantity),
                        "Birim": getUnitAbbr(m.product_id),
                        "Çıkan Depo": m.type === 'OUT' ? warehouse?.name : '-',
                        "Çıkan Raf": m.type === 'OUT' ? shelf?.name : '-',
                        "Giren Depo": m.type === 'IN' ? warehouse?.name : '-',
                        "Giren Raf": m.type === 'IN' ? shelf?.name : '-',
                        "İlgili Cari": m.source_or_destination,
                        "Not": m.notes,
                        "Kayıt Zamanı": new Date(m.created_at).toLocaleString(),
                        "Güncelleme Zamanı": new Date(m.created_at).getTime() === new Date(m.updated_at).getTime() ? '-' : new Date(m.updated_at).toLocaleString()
                    });
                });
            }
        });
        
        setDisplayedData(finalReportData);
    };

    const requestSort = (key: string, event: React.MouseEvent) => {
        const isShiftPressed = event.shiftKey;

        setSortConfig(currentConfigs => {
            const existingConfigIndex = currentConfigs.findIndex(c => c.key === key);

            if (isShiftPressed) {
                const newConfigs = [...currentConfigs];
                if (existingConfigIndex > -1) {
                    if (newConfigs[existingConfigIndex].direction === 'ascending') {
                        newConfigs[existingConfigIndex].direction = 'descending';
                    } else {
                        newConfigs.splice(existingConfigIndex, 1);
                    }
                } else {
                    newConfigs.push({ key, direction: 'ascending' });
                }
                return newConfigs;
            } else {
                if (existingConfigIndex > -1) {
                    if (currentConfigs[existingConfigIndex].direction === 'ascending') {
                        return [{ key, direction: 'descending' }];
                    } else {
                        return [];
                    }
                } else {
                    return [{ key, direction: 'ascending' }];
                }
            }
        });
    };

    const sortedData = useMemo(() => {
        if (sortConfig.length === 0) return displayedData;

        return [...displayedData].sort((a, b) => {
            for (const config of sortConfig) {
                const { key, direction } = config;
                const aValue = a[key];
                const bValue = b[key];
                
                let valA: any = aValue;
                let valB: any = bValue;

                if (key === 'Miktar') {
                    const parseQuantity = (quantityString: string) => {
                        if (!quantityString) return 0;
                        const cleanedNumber = String(quantityString).replace(/\./g, '').replace(',', '.');
                        return parseFloat(cleanedNumber) || 0;
                    }
                    valA = parseQuantity(aValue);
                    valB = parseQuantity(bValue);
                } else if (key === 'Tarih' || key === 'Kayıt Zamanı' || key === 'Güncelleme Zamanı') {
                     const parseDateTime = (dateTimeStr: string) => {
                         if (!dateTimeStr || dateTimeStr === '-') return 0;
                         const parts = dateTimeStr.split(/[, ]+/);
                         if (parts.length < 2) {
                            const dateParts = dateTimeStr.split(/[./]/);
                            if (dateParts.length === 3) {
                                return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]).getTime();
                            }
                             return new Date(dateTimeStr).getTime() || 0;
                         }
                         const dateParts = parts[0].split(/[./]/);
                         const timeParts = parts[1].split(':');
                         if(dateParts.length === 3 && timeParts.length >= 2) {
                            const seconds = timeParts.length > 2 ? +timeParts[2] : 0;
                            return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1], seconds).getTime();
                         }
                         return new Date(dateTimeStr).getTime() || 0;
                    }
                    valA = parseDateTime(aValue);
                    valB = parseDateTime(bValue);
                }
                
                let comparison = 0;
                if (valA < valB) {
                    comparison = -1;
                } else if (valA > valB) {
                    comparison = 1;
                }

                if (comparison !== 0) {
                    return direction === 'ascending' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }, [displayedData, sortConfig]);

    const handleExport = () => {
        if(sortedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Stok_Hareket_Raporu_${new Date().toISOString().slice(0,10)}`;
        if (exportFormat === 'excel') {
            exportToExcel(filename, sortedData);
        } else {
            exportToCsv(filename, sortedData);
        }
    }
    
    const headers = ["Tarih", "Fiş No", "İşlem Türü", "Ürün Adı", "Miktar", "Birim", "Çıkan Depo", "Çıkan Raf", "Giren Depo", "Giren Raf", "İlgili Cari", "Not", "Kayıt Zamanı", "Güncelleme Zamanı"];
    const partyOptions = accounts.map(p => ({id: p.id, name: p.name}));
    const title = "Stok Hareket Raporu";

    return (
        <div id="stock-movement-report-page">
            <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{title}</h1>

            <div id="report-filters" className="filter-panel bg-white dark:bg-slate-800 p-4 rounded-lg shadow border dark:border-slate-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="filter-group">
                        <label htmlFor="startDate" className={formLabelClass}>Başlangıç Tarihi</label>
                        <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="endDate" className={formLabelClass}>Bitiş Tarihi</label>
                        <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="transactionType" className={formLabelClass}>İşlem Türü</label>
                        <select
                            name="transactionType"
                            id="transactionType"
                            value={filters.transactionType}
                            onChange={e => handleFilterChange('transactionType', e.target.value)}
                            className={formInputSmallClass}
                        >
                            <option value="all">Tümü</option>
                            <option value="STANDARD_IN">Giriş</option>
                            <option value="STANDARD_OUT">Çıkış</option>
                            <option value="TRANSFER">Transfer</option>
                            <option value="PRODUCTION_IN">Üretimden Giriş</option>
                            <option value="PRODUCTION_OUT">Üretim Sarf</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin"/>
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Raf</label>
                        <SearchableSelect options={availableShelves} value={filters.shelfId} onChange={(val) => handleFilterChange('shelfId', val)} placeholder="Raf Seçin" disabled={!filters.warehouseId} />
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Ürün Grubu</label>
                         <SearchableSelect options={productGroups} value={filters.productGroupId} onChange={(val) => handleFilterChange('productGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Ürün</label>
                         <SearchableSelect options={availableProducts} value={filters.productId} onChange={(val) => handleFilterChange('productId', val)} placeholder="Ürün Seçin"/>
                    </div>
                    <div className="filter-group">
                         <label className={formLabelClass}>Müşteri/Tedarikçi</label>
                         <SearchableSelect options={partyOptions} value={filters.partyId} onChange={(val) => handleFilterChange('partyId', val)} placeholder="Taraf Seçin"/>
                    </div>
                     <div className="filter-group">
                        <label htmlFor="notes" className={formLabelClass}>Not</label>
                        <input
                            type="text"
                            name="notes"
                            id="notes"
                            value={filters.notes}
                            onChange={e => handleFilterChange('notes', e.target.value)}
                            className={formInputSmallClass}
                            placeholder="Notlarda ara..."
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center mt-4 pt-4 border-t dark:border-slate-700 gap-2">
                     <button
                        id="clear-filters-button"
                        type="button"
                        onClick={handleClearFilters}
                        className="secondary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                    >
                        <EraserIcon /> Filtreleri Temizle
                    </button>
                    <button id="run-report-button" onClick={handleListClick} className="primary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                        <ListIcon /> Listele
                    </button>
                </div>
            </div>

            <div id="report-results" className="results-container bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Rapor Sonuçları</h3>
                    <div className="flex items-center gap-4">
                        <select 
                            id="export-format-select"
                            value={exportFormat} 
                            onChange={e => setExportFormat(e.target.value as 'excel' | 'csv')} 
                            className={formInputSmallClass}
                            disabled={sortedData.length === 0}
                        >
                            <option value="excel">Excel'e Aktar</option>
                            <option value="csv">CSV'e Aktar</option>
                        </select>
                        <button 
                            id="export-button"
                            onClick={handleExport} 
                            className="secondary-action-button font-semibold py-2 px-4 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                            disabled={sortedData.length === 0}
                            title='Dışa Aktar'
                            aria-label='Dışa Aktar'
                        >
                        <DownloadIcon />
                            
                        </button>
                    </div>
                </div>
                {sortedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table id="results-table" className="data-table w-full text-left text-sm">
                            <thead className="table-header">
                                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                    {headers.map(header => {
                                        const sortInfo = sortConfig.find(sc => sc.key === header);
                                        const sortIndex = sortInfo ? sortConfig.indexOf(sortInfo) + 1 : -1;
                                        return (
                                            <th key={header} className="table-header-cell p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                                <button onClick={(e) => requestSort(header, e)} className="sort-button w-full text-left flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100">
                                                    {header}
                                                    {sortInfo && (
                                                        <span className="ml-1 flex items-center">
                                                            {sortInfo.direction === 'ascending' ? '▲' : '▼'}
                                                            {sortConfig.length > 1 && <sup className="ml-1 text-xs">{sortIndex}</sup>}
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                               {sortedData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        {headers.map(header => {
                                            const cellValue = row[header];
                                            return (
                                                <td key={header} className="table-cell p-2 align-middle text-slate-700 dark:text-slate-300 text-xs">
                                                    {header === 'Fiş No' ? (
                                                        <button 
                                                            onClick={() => handleVoucherClick(cellValue)}
                                                            className="voucher-link text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                                        >
                                                            {cellValue}
                                                        </button>
                                                    ) : (
                                                        cellValue
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-message p-8 text-center text-slate-500 dark:text-slate-400">
                        Raporu görüntülemek için lütfen filtreleri seçip "Listele" butonuna tıklayın.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockMovementReportPage;
