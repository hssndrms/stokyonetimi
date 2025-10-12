import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, Product, Warehouse, StockItem, Unit, ProductGroup } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon, EraserIcon, ListIcon } from '../../components/icons';

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
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
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

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setDisplayedData([]);
    };

    const handleListClick = () => {
        // 1. Filter products based on UI filters.
        const relevantProducts = products.filter(p => 
            (!filters.productGroupId || p.group_id === filters.productGroupId) &&
            (!filters.productId || p.id === filters.productId)
        );
    
        // 2. Determine all relevant locations (warehouse/shelf combinations, including shelfless).
        type Location = { warehouse_id: string; shelf_id: string | null };
        const relevantLocations: Location[] = [];
    
        const warehousesToConsider = filters.warehouseId
            ? warehouses.filter(w => w.id === filters.warehouseId)
            : warehouses;
    
        warehousesToConsider.forEach(warehouse => {
            // Add the shelfless location for the warehouse
            relevantLocations.push({ warehouse_id: warehouse.id, shelf_id: null });
    
            // Add all shelves for that warehouse
            const shelvesForWarehouse = shelves.filter(s => s.warehouse_id === warehouse.id);
            shelvesForWarehouse.forEach(shelf => {
                relevantLocations.push({ warehouse_id: warehouse.id, shelf_id: shelf.id });
            });
        });
    
        // Now, filter these locations based on the specific shelf filter, if it exists.
        let finalLocations = relevantLocations;
        if (filters.shelfId) {
            finalLocations = relevantLocations.filter(loc => loc.shelf_id === filters.shelfId);
        }
    
        // 3. Create a complete grid of all potential stock items (product x location).
        // Use a map for efficient lookup of actual stock quantities.
        const stockItemsMap = new Map<string, number>();
        stockItems.forEach(si => {
            const key = `${si.product_id}-${si.warehouse_id}-${si.shelf_id || 'null'}`;
            stockItemsMap.set(key, si.quantity);
        });
    
        let allPotentialItems: any[] = [];
        for (const product of relevantProducts) {
            for (const location of finalLocations) {
                const key = `${product.id}-${location.warehouse_id}-${location.shelf_id || 'null'}`;
                const quantity = stockItemsMap.get(key) || 0;
                
                allPotentialItems.push({
                    product_id: product.id,
                    warehouse_id: location.warehouse_id,
                    shelf_id: location.shelf_id,
                    quantity: quantity
                });
            }
        }
        
        // 4. Filter this complete list based on the `hideZeroStock` parameter.
        const dataToDisplay = hideZeroStock
            ? allPotentialItems.filter(item => item.quantity > 0)
            : allPotentialItems;
    
        // 5. Map to the display format.
        const mapper = (item: any) => {
            const product = findById(products, item.product_id);
            const warehouse = findById(warehouses, item.warehouse_id);
            const shelf = findById(shelves, item.shelf_id); // shelf_id can be null, findById will return undefined, which is correct
            return {
                "Depo": warehouse?.name,
                "Raf": shelf?.name || '-', // Show '-' for shelfless items
                "Ürün Adı": product?.name,
                "SKU": product?.sku,
                "Miktar": `${formatNumber(item.quantity)} ${getUnitAbbr(item.product_id)}`
            };
        };
    
        setDisplayedData(dataToDisplay.map(mapper));
    };

    const handleExport = () => {
        if(sortedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Mevcut_Stok_Raporu_${new Date().toISOString().slice(0,10)}`;
        if (exportFormat === 'excel') {
            exportToExcel(filename, sortedData);
        } else {
            exportToCsv(filename, sortedData);
        }
    }
    
    const sortedData = useMemo(() => {
        let sortableItems = [...displayedData];
        if (sortConfig) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                let valA: any = aValue;
                let valB: any = bValue;
                
                if (sortConfig.key === 'Miktar') {
                    const parseQuantity = (quantityString: string) => {
                        if (!quantityString) return 0;
                        const numberPart = String(quantityString).split(' ')[0];
                        const cleanedNumber = numberPart.replace(/\./g, '').replace(',', '.');
                        return parseFloat(cleanedNumber) || 0;
                    }
                    valA = parseQuantity(aValue);
                    valB = parseQuantity(bValue);
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
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const headers = ["Depo", "Raf", "Ürün Adı", "SKU", "Miktar"];
    const title = "Mevcut Stok Raporu";

    return (
        <div id="current-stock-report-page">
            <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{title}</h1>

            <div id="report-filters" className="filter-panel bg-white dark:bg-slate-800 p-4 rounded-lg shadow border dark:border-slate-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-slate-700">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="hide-zero-stock-checkbox"
                            checked={hideZeroStock}
                            onChange={(e) => setHideZeroStock(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                        />
                        <label htmlFor="hide-zero-stock-checkbox" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            Stoğu olmayanları gizle
                        </label>
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
                            title="Dışa Aktar"
                            aria-label="Dışa Aktar"
                        >
                            <DownloadIcon />
                        </button>
                    </div>
                </div>
                {displayedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table id="results-table" className="data-table w-full text-left">
                            <thead className="table-header">
                                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                    {headers.map(header => (
                                        <th key={header} className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                            <button onClick={() => requestSort(header)} className="sort-button w-full text-left flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100">
                                                {header}
                                                {sortConfig?.key === header ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {sortedData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        {Object.values(row).map((cell: any, cellIndex) => (
                                            <td key={cellIndex} className="table-cell p-4 align-middle text-slate-700 dark:text-slate-300">{cell}</td>
                                        ))}
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

export default CurrentStockReportPage;
