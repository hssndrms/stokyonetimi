import React, { useState, useMemo, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockMovement, Unit, Account, ProductGroup, ModalState, GeneralSettings } from '../../types';
import { findById } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';

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
    };
    
    const initialFilters: Filters = {
        startDate: '',
        endDate: '',
        warehouseId: '',
        shelfId: '',
        productId: '',
        productGroupId: '',
        partyId: '',
    };

    const [filters, setFilters] = useState(initialFilters);
    const [displayedData, setDisplayedData] = useState<any[]>([]);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const { addToast } = useToast();

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
    
    const handleVoucherClick = (voucherNumber: string) => {
        const isTransfer = voucherNumber.startsWith(generalSettings.stock_transfer_prefix);
        setModal({
            type: isTransfer ? 'EDIT_STOCK_TRANSFER' : 'EDIT_STOCK_VOUCHER',
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
            if (filters.warehouseId) {
                if (item.warehouse_id !== filters.warehouseId) {
                    const pairMovements = movements.filter(m => m.voucher_number === item.voucher_number && m.product_id === item.product_id);
                    const pair = pairMovements.find(p => p.id !== item.id);
                    if (!pair || pair.warehouse_id !== filters.warehouseId) return false;
                }
            }
            if (filters.shelfId) {
                 if (item.shelf_id !== filters.shelfId) {
                    const pairMovements = movements.filter(m => m.voucher_number === item.voucher_number && m.product_id === item.product_id);
                    const pair = pairMovements.find(p => p.id !== item.id);
                    if (!pair || pair.shelf_id !== filters.shelfId) return false;
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
            const isTransfer = movementsInVoucher[0].voucher_number.startsWith(generalSettings.stock_transfer_prefix);

            if (isTransfer) {
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
                            "Miktar": `${Number(pair.out.quantity).toLocaleString()} ${getUnitAbbr(pair.out.product_id)}`,
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
            } else {
                movementsInVoucher.forEach(m => {
                    const product = findById(products, m.product_id);
                    const warehouse = findById(warehouses, m.warehouse_id);
                    const shelf = findById(shelves, m.shelf_id);

                    finalReportData.push({
                        "Tarih": new Date(m.date).toLocaleDateString(),
                        "Fiş No": m.voucher_number,
                        "İşlem Türü": m.type === 'IN' ? 'Giriş' : 'Çıkış',
                        "Ürün Adı": product?.name,
                        "Miktar": `${Number(m.quantity).toLocaleString()} ${getUnitAbbr(m.product_id)}`,
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

        finalReportData.sort((a,b) => new Date(b["Kayıt Zamanı"]).getTime() - new Date(a["Kayıt Zamanı"]).getTime());
        setDisplayedData(finalReportData);
    };

    const handleExport = () => {
        if(displayedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Stok_Hareket_Raporu_${new Date().toISOString().slice(0,10)}`;
        if (exportFormat === 'excel') {
            exportToExcel(filename, displayedData);
        } else {
            exportToCsv(filename, displayedData);
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
                </div>
                <div className="flex justify-end items-center mt-4 pt-4 border-t">
                     <button onClick={handleListClick} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                        Listele
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
                            disabled={displayedData.length === 0}
                        >
                            <option value="excel">Excel'e Aktar</option>
                            <option value="csv">CSV'e Aktar</option>
                        </select>
                        <button 
                            onClick={handleExport} 
                            className="font-semibold py-2 px-4 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-600 text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            disabled={displayedData.length === 0}
                        >
                            Dışa Aktar
                        </button>
                    </div>
                </div>
                {displayedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    {headers.map(header => <th key={header} className="p-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                               {displayedData.map((row, rowIndex) => (
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