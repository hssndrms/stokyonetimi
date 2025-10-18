import React, { useState, useMemo, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockMovement, Unit, Account, ProductGroup, ModalState } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon,EraserIcon,ListIcon } from '../../components/icons';

type SortConfig = { key: string; direction: 'ascending' | 'descending' };

const StockLedgerReportPage: React.FC<{
    movements: StockMovement[];
    products: Product[];
    warehouses: Warehouse[];
    shelves: Shelf[];
    units: Unit[];
    accounts: Account[];
    productGroups: ProductGroup[];
    setModal: (modal: ModalState) => void;
}> = ({ movements, products, warehouses, shelves, units, accounts, productGroups, setModal }) => {
    
    type Filters = {
        startDate: string;
        endDate: string;
        warehouseId: string;
        shelfId: string;
        productId: string;
        productGroupId: string;
        notes: string;
        listOpeningBalance: boolean;
        listShelfDetail: boolean;
        listWarehouseDetail: boolean;
    };
    
    const initialFilters: Filters = {
        startDate: '',
        endDate: new Date().toISOString().slice(0,10),
        warehouseId: '',
        shelfId: '',
        productId: '',
        productGroupId: '',
        notes: '',
        listOpeningBalance: true,
        listShelfDetail: true,
        listWarehouseDetail: true,
    };

    const [filters, setFilters] = useState(initialFilters);
    const [displayedData, setDisplayedData] = useState<any[]>([]);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const { addToast } = useToast();
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([{ key: 'Sıralama', direction: 'ascending' }]);

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
    
    const availableProducts = useMemo(() => {
        const productList = filters.productGroupId
            ? products.filter(p => p.group_id === filters.productGroupId)
            : products;
        return productList.map(p => ({ id: p.id, name: `${p.name} (${p.sku})` }));
    }, [filters.productGroupId, products]);

    useEffect(() => {
        if (filters.productGroupId) {
            const currentProduct = findById(products, filters.productId);
            if (currentProduct && currentProduct.group_id !== filters.productGroupId) {
                setFilters(f => ({ ...f, productId: '' }));
            }
        }
    }, [filters.productGroupId, products, filters.productId]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterChange = (name: keyof Omit<Filters, 'listOpeningBalance' | 'listShelfDetail' | 'listWarehouseDetail'>, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setDisplayedData([]);
    };
    
    const handleVoucherClick = (voucherNumber: string) => {
        if (voucherNumber === 'DEVİR') return;
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

    const getTransactionDescription = (movement: StockMovement): string => {
        switch (movement.transaction_type) {
            case 'STANDARD': return movement.type === 'IN' ? 'Giriş' : 'Çıkış';
            case 'TRANSFER': return movement.type === 'IN' ? 'Transfer Gelen' : 'Transfer Giden';
            case 'PRODUCTION': return movement.type === 'IN' ? 'Üretimden Giriş' : 'Üretim Sarf';
            default: return 'Bilinmeyen';
        }
    }

    const handleListClick = () => {
        if (!filters.productId) {
            addToast("Lütfen bir ürün seçin.", 'error');
            return;
        }
        if (filters.listWarehouseDetail && !filters.warehouseId) {
            addToast("Depo detayı listelenirken bir depo seçimi zorunludur.", 'error');
            return;
        }
        if (filters.listWarehouseDetail && filters.listShelfDetail && availableShelves.length > 0 && !filters.shelfId) {
            addToast("Raf detayı listelenirken, bu depo için bir raf seçmelisiniz.", "error");
            return;
        }

        const product = findById(products, filters.productId);
        if (!product) {
            addToast("Seçilen ürün bulunamadı.", "error");
            return;
        }

        const startDate = filters.startDate ? new Date(filters.startDate) : new Date('1970-01-01');
        const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
        endDate.setHours(23, 59, 59, 999);
        
        const movementFilter = (m: StockMovement): boolean => {
            if (m.product_id !== filters.productId) return false;
            
            if (filters.listWarehouseDetail) {
                if (m.warehouse_id !== filters.warehouseId) return false;
                
                if (filters.listShelfDetail) {
                    const effectiveShelfId = availableShelves.length > 0 ? filters.shelfId : null;
                    if (m.shelf_id !== effectiveShelfId) return false;
                }
            }

            if (filters.notes && !m.notes?.toLowerCase().includes(filters.notes.toLowerCase().trim())) return false;
            return true;
        };
        
        const relevantMovements = movements.filter(movementFilter);

        const openingBalance = filters.listOpeningBalance
            ? relevantMovements
                .filter(m => new Date(m.date) < startDate)
                .reduce((sum, m) => sum + (m.type === 'IN' ? m.quantity : -m.quantity), 0)
            : 0;

        const reportMovements = relevantMovements
            .filter(m => new Date(m.date) >= startDate && new Date(m.date) <= endDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const reportRows: any[] = [];
        let runningBalance = openingBalance;
        
        const productSku = product.sku;
        const productName = product.name;
        const unitAbbr = getUnitAbbr(filters.productId);
        
        if (filters.listOpeningBalance) {
            const openingDepo = filters.listWarehouseDetail ? findById(warehouses, filters.warehouseId)?.name || '' : 'Tümü';
            const openingRaf = filters.listWarehouseDetail ? (filters.listShelfDetail ? findById(shelves, filters.shelfId)?.name || '-' : 'Tümü') : 'Tümü';
            reportRows.push({
                "Sıralama": startDate.getTime(),
                "Tarih": startDate.toLocaleDateString(),
                "Fiş No": "DEVİR",
                "İşlem Türü": "Açılış Bakiyesi",
                "Ürün Kodu": productSku,
                "Ürün Adı": productName,
                "Miktar": 0,
                "Kalan": openingBalance,
                "Birim": unitAbbr,
                "Depo": openingDepo,
                "Raf": openingRaf,
                "İlgili Cari": "-",
                "Not": "-"
            });
        }

        reportMovements.forEach(m => {
            const signedQuantity = m.type === 'IN' ? m.quantity : -m.quantity;
            runningBalance += signedQuantity;
            reportRows.push({
                "Sıralama": new Date(m.created_at).getTime(),
                "Tarih": new Date(m.date).toLocaleDateString(),
                "Fiş No": m.voucher_number,
                "İşlem Türü": getTransactionDescription(m),
                "Ürün Kodu": productSku,
                "Ürün Adı": productName,
                "Miktar": signedQuantity,
                "Kalan": runningBalance,
                "Birim": unitAbbr,
                "Depo": findById(warehouses, m.warehouse_id)?.name || '',
                "Raf": findById(shelves, m.shelf_id)?.name || '-',
                "İlgili Cari": m.source_or_destination,
                "Not": m.notes || ''
            });
        });
        
        setDisplayedData(reportRows);
    };

    const handleExport = () => {
        if(sortedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Stok_Ekstresi_${findById(products, filters.productId)?.name}_${new Date().toISOString().slice(0,10)}`;
        const dataToExport = sortedData.map(({ Sıralama, ...rest }) => ({
            ...rest,
            Miktar: formatNumber(rest.Miktar),
            Kalan: formatNumber(rest.Kalan)
        }));
        if (exportFormat === 'excel') {
            exportToExcel(filename, dataToExport);
        } else {
            exportToCsv(filename, dataToExport);
        }
    }
    
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
                
                if (typeof valA === 'number' && typeof valB === 'number') {
                     // It's already a number (like Sıralama, Miktar, Kalan), do nothing
                } else {
                    valA = String(aValue).toLowerCase();
                    valB = String(bValue).toLowerCase();
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

    const headers = ["Tarih", "Fiş No", "İşlem Türü", "Ürün Kodu", "Ürün Adı", "Miktar", "Kalan", "Birim", "Depo", "Raf", "İlgili Cari", "Not"];
    const title = "Stok Ekstresi";

    return (
        <div id="stock-ledger-report-page">
            <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{title}</h1>

            <div id="report-filters" className="filter-panel bg-white dark:bg-slate-800 p-4 rounded-lg shadow border dark:border-slate-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="filter-group">
                        <label className={formLabelClass}>Ürün Grubu</label>
                         <SearchableSelect options={productGroups} value={filters.productGroupId} onChange={(val) => handleFilterChange('productGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Ürün (*Zorunlu)</label>
                         <SearchableSelect options={availableProducts} value={filters.productId} onChange={(val) => handleFilterChange('productId', val)} placeholder="Ürün Seçin"/>
                    </div>
                     <div className="filter-group">
                        <label className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin" disabled={!filters.listWarehouseDetail}/>
                    </div>
                    <div className="filter-group">
                        <label className={formLabelClass}>Raf</label>
                        <SearchableSelect 
                            options={availableShelves} 
                            value={filters.shelfId} 
                            onChange={(val) => handleFilterChange('shelfId', val)} 
                            placeholder="Raf Seçin" 
                            disabled={!filters.listWarehouseDetail || !filters.warehouseId || availableShelves.length === 0 || !filters.listShelfDetail} 
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="startDate" className={formLabelClass}>Başlangıç Tarihi</label>
                        <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="endDate" className={formLabelClass}>Bitiş Tarihi</label>
                        <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleDateChange} className={formInputSmallClass} />
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
                <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="listOpeningBalance"
                                checked={filters.listOpeningBalance}
                                onChange={(e) => setFilters(f => ({...f, listOpeningBalance: e.target.checked}))}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                            />
                            <label htmlFor="listOpeningBalance" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Devir Listelensin
                            </label>
                        </div>
                        <div className="flex items-center">
                             <input
                                type="checkbox"
                                id="listWarehouseDetail"
                                checked={filters.listWarehouseDetail}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFilters(f => ({
                                        ...f, 
                                        listWarehouseDetail: isChecked,
                                        warehouseId: isChecked ? f.warehouseId : '',
                                        shelfId: isChecked ? f.shelfId : '',
                                        listShelfDetail: isChecked ? f.listShelfDetail : false
                                    }));
                                }}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                            />
                            <label htmlFor="listWarehouseDetail" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Depo Detayı Filtresi
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="listShelfDetail"
                                checked={filters.listShelfDetail}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFilters(f => ({
                                        ...f, 
                                        listShelfDetail: isChecked,
                                        shelfId: isChecked ? f.shelfId : ''
                                    }));
                                }}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                                disabled={!filters.listWarehouseDetail}
                            />
                            <label htmlFor="listShelfDetail" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 disabled:text-slate-400 dark:disabled:text-slate-500">
                                Raf Detayı Filtresi
                            </label>
                        </div>
                    </div>
                     <div className="flex gap-2">
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
                {displayedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table id="results-table" className="data-table w-full text-left text-sm">
                            <thead className="table-header">
                                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                    {headers.map(header => {
                                        const sortKey = header === 'Tarih' ? 'Sıralama' : header;
                                        const sortInfo = sortConfig.find(sc => sc.key === sortKey);
                                        const sortIndex = sortInfo ? sortConfig.indexOf(sortInfo) + 1 : -1;
                                        return (
                                            <th key={header} className="table-header-cell p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                                <button onClick={(e) => requestSort(sortKey, e)} className="sort-button w-full text-left flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100">
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
                                            let cellValue = row[header];
                                            let cellClass = "table-cell p-2 align-middle text-slate-700 dark:text-slate-300 text-xs";
                                            if (header === 'Miktar' || header === 'Kalan') {
                                                cellClass += " text-right";
                                                cellValue = formatNumber(cellValue);
                                            }
                                            return (
                                                <td key={header} className={cellClass}>
                                                    {header === 'Fiş No' ? (
                                                        <button 
                                                            onClick={() => handleVoucherClick(cellValue)}
                                                            className="voucher-link text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline disabled:text-slate-500 dark:disabled:text-slate-400 disabled:no-underline disabled:cursor-default"
                                                            disabled={cellValue === 'DEVİR'}
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
                        Raporu görüntülemek için lütfen bir ürün, depo ve tarih aralığı seçip "Listele" butonuna tıklayın.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockLedgerReportPage;