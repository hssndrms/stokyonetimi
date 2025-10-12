import React, { useState, useMemo, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockMovement, Unit, Account, ProductGroup, ModalState, GeneralSettings } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon } from '../../components/icons';

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
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'Kayıt Zamanı', direction: 'descending' });

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
                            "Miktar": `${formatNumber(pair.out.quantity)} ${getUnitAbbr(pair.out.product_id)}`,
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
                        "Miktar": `${formatNumber(m.quantity)} ${getUnitAbbr(m.product_id)}`,
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

    const sortedData = useMemo(() => {
        let sortableItems = [...displayedData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                let valA: any = aValue;
                let valB: any = bValue;

                if (sortConfig.key === 'Miktar') {
                    const parseQuantity = (quantityString: string) => {
                        if (!quantityString) return 0;
                        const numberPart = String(quantityString).split(' ')[0];
                        // "1.234,56" -> "1234.56" for parseFloat
                        const cleanedNumber = numberPart.replace(/\./g, '').replace(',', '.');
                        return parseFloat(cleanedNumber) || 0;
                    }
                    valA = parseQuantity(aValue);
                    valB = parseQuantity(bValue);
                } else if (sortConfig.key === 'Tarih' || sortConfig.key === 'Kayıt Zamanı' || sortConfig.key === 'Güncelleme Zamanı') {
                     const parseDateTime = (dateTimeStr: string) => {
                         if (!dateTimeStr || dateTimeStr === '-') return 0;
                         // Handles 'D.M.YYYY, HH:mm:ss' and 'D/M/YYYY, HH:mm:ss'
                         const parts = dateTimeStr.split(/[, ]+/);
                         if (parts.length < 2) {
                             // Handles only date 'D.M.YYYY' or 'D/M/YYYY'
                            const dateParts = dateTimeStr.split(/[./]/);
                            if (dateParts.length === 3) {
                                return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]).getTime();
                            }
                             return new Date(dateTimeStr).getTime() || 0;
                         }
                         const dateParts = parts[0].split(/[./]/);
                         const timeParts = parts[1].split(':');
                         if(dateParts.length === 3 && timeParts.length === 3) {
                            return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1], +timeParts[2]).getTime();
                         }
                         return new Date(dateTimeStr).getTime() || 0;
                    }
                    valA = parseDateTime(aValue);
                    valB = parseDateTime(bValue);
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
    
    const headers = ["Tarih", "Fiş No", "İşlem Türü", "Ürün Adı", "Miktar", "Çıkan Depo", "Çıkan Raf", "Giren Depo", "Giren Raf", "İlgili Cari", "Not", "Kayıt Zamanı", "Güncelleme Zamanı"];
    const partyOptions = accounts.map(p => ({id: p.id, name: p.name}));
    const title = "Stok Hareket Raporu";

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">{title}</h1>

            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div>
                        <label htmlFor="startDate" className={formLabelClass}>Başlangıç Tarihi</label>
                        <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div>
                        <label htmlFor="endDate" className={formLabelClass}>Bitiş Tarihi</label>
                        <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                    <div>
                        <label className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin"/>
                    </div>
                    <div>
                        <label className={formLabelClass}>Raf</label>
                        <SearchableSelect options={availableShelves} value={filters.shelfId} onChange={(val) => handleFilterChange('shelfId', val)} placeholder="Raf Seçin" disabled={!filters.warehouseId} />
                    </div>
                    <div>
                        <label className={formLabelClass}>Ürün Grubu</label>
                         <SearchableSelect options={productGroups} value={filters.productGroupId} onChange={(val) => handleFilterChange('productGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                    <div>
                        <label className={formLabelClass}>Ürün</label>
                         <SearchableSelect options={availableProducts} value={filters.productId} onChange={(val) => handleFilterChange('productId', val)} placeholder="Ürün Seçin"/>
                    </div>
                    <div>
                         <label className={formLabelClass}>Müşteri/Tedarikçi</label>
                         <SearchableSelect options={partyOptions} value={filters.partyId} onChange={(val) => handleFilterChange('partyId', val)} placeholder="Taraf Seçin"/>
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
                <div className="flex justify-end items-center mt-4 pt-4 border-t gap-2">
                     <button
                        type="button"
                        onClick={handleClearFilters}
                        className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300"
                    >
                        <i className="fa-solid fa-eraser"></i> Filtreleri Temizle
                    </button>
                    <button onClick={handleListClick} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                        <i className="fa-solid fa-list-ul"></i> Listele
                    </button>
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
                {sortedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    {headers.map(header => (
                                        <th key={header} className="p-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            <button onClick={() => requestSort(header)} className="w-full text-left flex items-center gap-1 hover:text-slate-800">
                                                {header}
                                                {sortConfig.key === header ? (
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
                                            const cellValue = row[header];
                                            return (
                                                <td key={header} className="p-2 align-middle text-slate-700 text-xs">
                                                    {header === 'Fiş No' ? (
                                                        <button 
                                                            onClick={() => handleVoucherClick(cellValue)}
                                                            className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
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
                        Raporu görüntülemek için lütfen filtreleri seçip "Listele" butonuna tıklayın.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockMovementReportPage;