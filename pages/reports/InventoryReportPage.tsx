import React, { useState, useEffect, useMemo } from 'react';
import { Product, StockMovement, Unit, ProductGroup, WarehouseGroup, Warehouse, Shelf } from '../../types';
import { findById, formatNumber } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../utils/csvExporter';
import { exportToExcel } from '../../utils/excelExporter';
import SearchableSelect from '../../components/SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { DownloadIcon, EraserIcon, ListIcon } from '../../components/icons';

type SortConfig = { key: string; direction: 'ascending' | 'descending' };

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
    const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>(warehouses);
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
    const { addToast } = useToast();

    const getUnitAbbr = (productId: string) => findById(units, findById(products, productId)?.unit_id)?.abbreviation || '';
    
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

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setDisplayedData([]);
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
                "Toplam Miktar": item.quantity,
                "Birim": getUnitAbbr(item.product.id),
            };
        };

        setDisplayedData(data.map(mapper));
    };

    const handleExport = () => {
        if(sortedData.length === 0) {
            addToast("Dışa aktarılacak veri yok.", 'error');
            return;
        }

        const filename = `Envanter_Raporu_${new Date().toISOString().slice(0,10)}`;
        const dataToExport = sortedData.map(row => ({
            ...row,
            "Toplam Miktar": formatNumber(row["Toplam Miktar"])
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

    const headers = ["Ürün Adı", "SKU", "Toplam Miktar", "Birim"];
    const title = "Envanter Raporu";

    return (
        <div id="inventory-report-page">
            <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{title}</h1>

            <div id="report-filters" className="filter-panel bg-white dark:bg-slate-800 p-4 rounded-lg shadow border dark:border-slate-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="filter-group">
                        <label htmlFor="inventoryDate" className={formLabelClass}>Tarih</label>
                        <input type="date" name="inventoryDate" id="inventoryDate" value={filters.inventoryDate} onChange={handleDateChange} className={formInputSmallClass} />
                    </div>
                     <div className="filter-group">
                        <label className={formLabelClass}>Depo Grubu</label>
                         <SearchableSelect options={warehouseGroups} value={filters.warehouseGroupId} onChange={(val) => handleFilterChange('warehouseGroupId', val)} placeholder="Grup Seçin"/>
                    </div>
                     <div className="filter-group">
                        <label className={formLabelClass}>Depo</label>
                         <SearchableSelect options={availableWarehouses} value={filters.warehouseId} onChange={(val) => handleFilterChange('warehouseId', val)} placeholder="Depo Seçin"/>
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
                            title="Dışa Aktar"
                            aria-label="Dışa Aktar"
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
                                        const sortInfo = sortConfig.find(sc => sc.key === header);
                                        const sortIndex = sortInfo ? sortConfig.indexOf(sortInfo) + 1 : -1;
                                        return (
                                            <th key={header} className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
                                            let className = "table-cell p-4 align-middle text-slate-700 dark:text-slate-300";
                                            if (header === 'Toplam Miktar') {
                                                className += " text-right";
                                            }
                                            return (
                                                <td key={header} className={className}>
                                                    {header === 'Toplam Miktar' ? formatNumber(cellValue) : cellValue}
                                                </td>
                                            );
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

export default InventoryReportPage;