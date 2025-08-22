import React, { useState, useEffect } from 'react';
import { Shelf, Product, Warehouse, StockItem, Unit, ProductGroup } from '../../types';
import { findById } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';

const CurrentStockReportPage: React.FC<{
    stockItems: StockItem[];
    products: Product[];
    warehouses: Warehouse[];
    shelves: Shelf[];
    units: Unit[];
    productGroups: ProductGroup[];
}> = ({ stockItems, products, warehouses, shelves, units, productGroups }) => {
    
    type Filters = {
        warehouseId: string;
        shelfId: string;
        productId: string;
        productGroupId: string;
    };
    
    const initialFilters: Filters = {
        warehouseId: '',
        shelfId: '',
        productId: '',
        productGroupId: '',
    };

    const [filters, setFilters] = useState(initialFilters);
    const [displayedData, setDisplayedData] = useState<any[]>([]);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const [hideZeroStock, setHideZeroStock] = useState(true);
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

    const handleFilterChange = (name: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleListClick = () => {
        // 1. Determine the scope of products and locations based on filters.
        const relevantProducts = products.filter(p => 
            (!filters.productGroupId || p.group_id === filters.productGroupId) &&
            (!filters.productId || p.id === filters.productId)
        );

        const relevantShelves = shelves.filter(s =>
            (!filters.warehouseId || s.warehouse_id === filters.warehouseId) &&
            (!filters.shelfId || s.id === filters.shelfId)
        );

        if (filters.warehouseId && relevantShelves.length === 0 && shelves.some(s => s.warehouse_id === filters.warehouseId)) {
             // A specific shelf was selected that doesn't exist or doesn't match the warehouse, so relevantShelves is empty.
             // This is an implicit filter, so the report should be empty.
             setDisplayedData([]);
             return;
        }

        // 2. Create a complete list of all potential stock items within the scope.
        // We iterate through products and shelves to include items with zero stock if requested.
        const allPotentialItems: StockItem[] = [];
        const stockItemsMap = new Map<string, StockItem>();
        stockItems.forEach(si => stockItemsMap.set(`${si.product_id}-${si.shelf_id}`, si));

        for (const product of relevantProducts) {
            for (const shelf of relevantShelves) {
                const key = `${product.id}-${shelf.id}`;
                const existingItem = stockItemsMap.get(key);
                
                if (existingItem) {
                    allPotentialItems.push(existingItem);
                } else {
                    // This item has 0 stock because it doesn't exist in stockItems.
                    allPotentialItems.push({
                        product_id: product.id,
                        warehouse_id: shelf.warehouse_id,
                        shelf_id: shelf.id,
                        quantity: 0
                    });
                }
            }
        }
        
        // 3. Filter this complete list based on the `hideZeroStock` parameter.
        const dataToDisplay = hideZeroStock
            ? allPotentialItems.filter(item => item.quantity > 0)
            : allPotentialItems;

        // 4. Map to the display format.
        const mapper = (item: StockItem) => {
            const product = findById(products, item.product_id);
            const warehouse = findById(warehouses, item.warehouse_id);
            const shelf = findById(shelves, item.shelf_id);
            return {
                "Depo": warehouse?.name,
                "Raf": shelf?.name,
                "Ürün Adı": product?.name,
                "SKU": product?.sku,
                "Miktar": `${Number(item.quantity).toLocaleString()} ${getUnitAbbr(item.product_id)}`
            };
        };

        setDisplayedData(dataToDisplay.map(mapper));
    };

    const handleExport = () => {
        if(displayedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Mevcut_Stok_Raporu_${new Date().toISOString().slice(0,10)}`;
        if (exportFormat === 'excel') {
            exportToExcel(filename, displayedData);
        } else {
            exportToCsv(filename, displayedData);
        }
    }
    
    const headers = ["Depo", "Raf", "Ürün Adı", "SKU", "Miktar"];
    const title = "Mevcut Stok Raporu";

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">{title}</h1>

            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="hideZeroStock"
                            checked={hideZeroStock}
                            onChange={(e) => setHideZeroStock(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="hideZeroStock" className="ml-2 text-sm font-medium text-slate-700">
                            Stoğu olmayanları gizle
                        </label>
                    </div>
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

export default CurrentStockReportPage;