import React, { useState, useEffect } from 'react';
import { Product, StockMovement, Unit, ProductGroup, WarehouseGroup, Warehouse, Shelf } from '../../types';
import { findById } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';

const InventoryReportPage: React.FC<{
    movements: StockMovement[];
    products: Product[];
    units: Unit[];
    productGroups: ProductGroup[];
    warehouseGroups: WarehouseGroup[];
    warehouses: Warehouse[];
    shelves: Shelf[];
}> = ({ movements, products, units, productGroups, warehouseGroups, warehouses, shelves }) => {
    
    type Filters = {
        productId: string;
        productGroupId: string;
        inventoryDate: string;
        warehouseGroupId: string;
        warehouseId: string;
        shelfId: string;
    };
    
    const initialFilters: Filters = {
        productId: '',
        productGroupId: '',
        inventoryDate: new Date().toISOString().slice(0, 10),
        warehouseGroupId: '',
        warehouseId: '',
        shelfId: '',
    };

    const [filters, setFilters] = useState(initialFilters);
    const [displayedData, setDisplayedData] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
    const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>(warehouses);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const { addToast } = useToast();

    const getUnitAbbr = (productId: string) => findById(units, findById(products, productId)?.unit_id)?.abbreviation || '';
    
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

    useEffect(() => {
        if (filters.warehouseGroupId) {
            const filtered = warehouses.filter(w => w.group_id === filters.warehouseGroupId);
            setAvailableWarehouses(filtered);
            if (filters.warehouseId && !filtered.some(w => w.id === filters.warehouseId)) {
                setFilters(f => ({ ...f, warehouseId: '', shelfId: '' }));
            }
        } else {
            setAvailableWarehouses(warehouses);
        }
    }, [filters.warehouseGroupId, warehouses]);

    useEffect(() => {
        if (filters.warehouseId) {
            setAvailableShelves(shelves.filter(s => s.warehouse_id === filters.warehouseId));
            if (filters.shelfId && !shelves.some(s => s.id === filters.shelfId && s.warehouse_id === filters.warehouseId)) {
                setFilters(f => ({ ...f, shelfId: '' }));
            }
        } else {
            setAvailableShelves([]);
            if (filters.shelfId) {
                setFilters(f => ({ ...f, shelfId: '' }));
            }
        }
    }, [filters.warehouseId, shelves]);


    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterChange = (name: keyof Omit<Filters, 'inventoryDate'>, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleListClick = () => {
         if (!filters.inventoryDate) {
            addToast("Lütfen envanter için bir tarih seçin.", 'error');
            return;
        }

        const targetDate = new Date(filters.inventoryDate);
        targetDate.setHours(23, 59, 59, 999);
        
        const inventoryMapPerLocation = new Map<string, number>(); // key: `${pid}|${wid}|${sid}`
        movements
            .filter(m => new Date(m.date) <= targetDate)
            .forEach(movement => {
                const key = `${movement.product_id}|${movement.warehouse_id}|${movement.shelf_id || 'null'}`;
                const currentQty = inventoryMapPerLocation.get(key) || 0;
                const change = movement.type === 'IN' ? movement.quantity : -movement.quantity;
                inventoryMapPerLocation.set(key, currentQty + change);
            });
            
        let inventoryList = Array.from(inventoryMapPerLocation.entries())
            .map(([key, quantity]) => {
                const [productId, warehouseId, shelfIdStr] = key.split('|');
                return {
                    productId,
                    warehouseId,
                    shelfId: shelfIdStr === 'null' ? null : shelfIdStr,
                    quantity,
                };
            })
            .filter(item => item.quantity !== 0);

        if (filters.warehouseGroupId) {
            const warehousesInGroup = warehouses.filter(w => w.group_id === filters.warehouseGroupId).map(w => w.id);
            inventoryList = inventoryList.filter(item => warehousesInGroup.includes(item.warehouseId));
        }
        if (filters.warehouseId) {
            inventoryList = inventoryList.filter(item => item.warehouseId === filters.warehouseId);
        }
        if (filters.shelfId) {
            inventoryList = inventoryList.filter(item => item.shelfId === filters.shelfId);
        }
        if (filters.productGroupId) {
            const productsInGroup = products.filter(p => p.group_id === filters.productGroupId).map(p => p.id);
            inventoryList = inventoryList.filter(item => productsInGroup.includes(item.productId));
        }
        if (filters.productId) {
            inventoryList = inventoryList.filter(item => item.productId === filters.productId);
        }

        const finalInventoryMap = new Map<string, number>(); // key: productId
        inventoryList.forEach(item => {
            const currentQty = finalInventoryMap.get(item.productId) || 0;
            finalInventoryMap.set(item.productId, currentQty + item.quantity);
        });

        const data = Array.from(finalInventoryMap.entries())
            .map(([productId, quantity]) => ({
                product: findById(products, productId)!,
                quantity,
            }))
            .filter(item => item.quantity !== 0 && item.product);

        const mapper = (item: { product: Product, quantity: number }) => {
            return {
                "Ürün Adı": item.product.name,
                "SKU": item.product.sku,
                "Toplam Miktar": `${Number(item.quantity).toLocaleString()} ${getUnitAbbr(item.product.id)}`,
            };
        };

        setDisplayedData(data.map(mapper));
    };

    const handleExport = () => {
        if(displayedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Envanter_Raporu_${new Date().toISOString().slice(0,10)}`;
        if (exportFormat === 'excel') {
            exportToExcel(filename, displayedData);
        } else {
            exportToCsv(filename, displayedData);
        }
    }
    
    const headers = ["Ürün Adı", "SKU", "Toplam Miktar"];
    const title = "Envanter Raporu";

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">{title}</h1>

            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div>
                        <label htmlFor="inventoryDate" className={formLabelClass}>Tarih</label>
                        <input type="date" name="inventoryDate" id="inventoryDate" value={filters.inventoryDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                     <div>
                        <label className={formLabelClass}>Depo Grubu</label>
                         <SearchableSelect options={warehouseGroups} value={filters.warehouseGroupId} onChange={(val) => handleFilterChange('warehouseGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                     <div>
                        <label className={formLabelClass}>Depo</label>
                         <SearchableSelect options={availableWarehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin"/>
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
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    {headers.map(header => <th key={header} className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b hover:bg-slate-50">
                                        {Object.values(row).map((cell: any, cellIndex) => (
                                            <td key={cellIndex} className="p-4 align-middle text-slate-700">{cell}</td>
                                        ))}
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

export default InventoryReportPage;