import React, { useState, useMemo, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockMovement, Unit, Account, ProductGroup, ModalState } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon,EraserIcon,ListIcon } from '../../components/icons';

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
    const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const { addToast } = useToast();
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'Sıralama', direction: 'ascending' });

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
                "Sıralama": new Date(m.date).getTime(),
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
    
    const sortedData = useMemo(() => {
        let sortableItems = [...displayedData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                let valA: any = aValue;
                let valB: any = bValue;
                
                if (typeof valA === 'number' && typeof valB === 'number') {
                } else {
                    valA = String(aValue).toLowerCase();
                    valB = String(bValue).toLowerCase();
                }

                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [displayedData, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const headers = ["Tarih", "Fiş No", "İşlem Türü", "Ürün Kodu", "Ürün Adı", "Miktar", "Kalan", "Birim", "Depo", "Raf", "İlgili Cari", "Not"];
    const title = "Stok Ekstresi";

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">{title}</h1>

            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div>
                        <label className={formLabelClass}>Ürün Grubu</label>
                         <SearchableSelect options={productGroups} value={filters.productGroupId} onChange={(val) => handleFilterChange('productGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                    <div>
                        <label className={formLabelClass}>Ürün (*Zorunlu)</label>
                         <SearchableSelect options={availableProducts} value={filters.productId} onChange={(val) => handleFilterChange('productId', val)} placeholder="Ürün Seçin"/>
                    </div>
                     <div>
                        <label className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin" disabled={!filters.listWarehouseDetail}/>
                    </div>
                    <div>
                        <label className={formLabelClass}>Raf</label>
                        <SearchableSelect 
                            options={availableShelves} 
                            value={filters.shelfId} 
                            onChange={(val) => handleFilterChange('shelfId', val)} 
                            placeholder="Raf Seçin" 
                            disabled={!filters.listWarehouseDetail || !filters.warehouseId || availableShelves.length === 0 || !filters.listShelfDetail} 
                        />
                    </div>
                    <div>
                        <label htmlFor="startDate" className={formLabelClass}>Başlangıç Tarihi</label>
                        <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div>
                        <label htmlFor="endDate" className={formLabelClass}>Bitiş Tarihi</label>
                        <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div>
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
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="listOpeningBalance"
                                checked={filters.listOpeningBalance}
                                onChange={(e) => setFilters(f => ({...f, listOpeningBalance: e.target.checked}))}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="listOpeningBalance" className="ml-2 text-sm font-medium text-slate-700">
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
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="listWarehouseDetail" className="ml-2 text-sm font-medium text-slate-700">
                                Depo Detayı Listelensin
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
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                disabled={!filters.listWarehouseDetail}
                            />
                            <label htmlFor="listShelfDetail" className="ml-2 text-sm font-medium text-slate-700 disabled:text-slate-400">
                                Raf Detayı Listelensin
                            </label>
                        </div>
                    </div>
                     <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300"
                        >
                            <EraserIcon /> Filtreleri Temizle
                        </button>
                        <button onClick={handleListClick} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                            <ListIcon /> Listele
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b">
                    <h3 className="text-lg font-bold">Rapor Sonuçları</h3>
                    <div className="flex items-center gap-4">
                        <select 
                            value={exportFormat} 
                            onChange={e => setExportFormat(e.target.value as 'excel' | 'csv')} 
                            className={formInputSmallClass}
                            disabled={sortedData.length === 0}
                        >
                            <option value="excel">Excel'e Aktar</option>
                            <option value="csv">CSV'e Aktar</option>
                        </select>
                        <button 
                            onClick={handleExport} 
                            className="font-semibold py-2 px-4 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-600 text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    {headers.map(header => (
                                        <th key={header} className="p-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            <button onClick={() => requestSort(header === 'Tarih' ? 'Sıralama' : header)} className="w-full text-left flex items-center gap-1 hover:text-slate-800">
                                                {header}
                                                {(sortConfig.key === header || (header === 'Tarih' && sortConfig.key === 'Sıralama')) ? (
                                                    sortConfig.direction === 'ascending' ? '▲' : '▼'
                                                ) : null}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                               {sortedData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b hover:bg-slate-50">
                                        {headers.map(header => {
                                            let cellValue = row[header];
                                            let cellClass = "p-2 align-middle text-slate-700 text-xs";
                                            if (header === 'Miktar' || header === 'Kalan') {
                                                cellClass += " text-right font-mono";
                                                cellValue = formatNumber(cellValue);
                                            }
                                            return (
                                                <td key={header} className={cellClass}>
                                                    {header === 'Fiş No' ? (
                                                        <button 
                                                            onClick={() => handleVoucherClick(cellValue)}
                                                            className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline disabled:text-slate-500 disabled:no-underline disabled:cursor-default"
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
                    <div className="p-8 text-center text-slate-500">
                        Raporu görüntülemek için lütfen bir ürün, depo ve tarih aralığı seçip "Listele" butonuna tıklayın.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockLedgerReportPage;