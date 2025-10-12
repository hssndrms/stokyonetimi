
import React, { useState, useMemo } from 'react';
import { Product, StockItem, Warehouse, Shelf, Unit } from '../types';
import { findById, formatNumber } from '../utils/helpers';
import { formInputClass } from '../styles/common';

const StockOverviewPage: React.FC<{
    products: Product[];
    stockItems: StockItem[];
    warehouses: Warehouse[];
    shelves: Shelf[];
    units: Unit[];
}> = ({ products, stockItems, warehouses, shelves, units }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'productName', direction: 'ascending' });

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const groupedStock = useMemo(() => {
        type ProductEntry = { product: Product; quantity: number };
        
        const sortProducts = (arr: ProductEntry[]): ProductEntry[] => {
            if (!sortConfig) return arr;

            return [...arr].sort((a, b) => {
                let aValue: string | number, bValue: string | number;

                switch (sortConfig.key) {
                    case 'productName':
                        aValue = a.product.name.toLowerCase();
                        bValue = b.product.name.toLowerCase();
                        break;
                    case 'sku':
                        aValue = a.product.sku.toLowerCase();
                        bValue = b.product.sku.toLowerCase();
                        break;
                    case 'quantity':
                        aValue = a.quantity;
                        bValue = b.quantity;
                        break;
                    default:
                        return 0;
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        };

        const warehouseMap: Record<string, {
            warehouse: Warehouse;
            totalQuantity: number;
            shelflessProducts: ProductEntry[];
            shelves: Record<string, {
                shelf: Shelf;
                totalQuantity: number;
                products: ProductEntry[];
            }>;
        }> = {};

        // Sadece stokta olan ürünleri filtrele (miktarı 0'dan büyük olanlar)
        const itemsWithStock = stockItems.filter(item => item.quantity > 0);

        const filteredStockItems = searchTerm
            ? itemsWithStock.filter(item => {
                const product = findById(products, item.product_id);
                if (!product) return false;
                return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.sku.toLowerCase().includes(searchTerm.toLowerCase());
            })
            : itemsWithStock;


        if (searchTerm && filteredStockItems.length > 0) {
            const newExpanded: Record<string, boolean> = {};
            filteredStockItems.forEach(item => {
                newExpanded[`wh-${item.warehouse_id}`] = true;
                if(item.shelf_id) newExpanded[`sh-${item.shelf_id}`] = true;
            });
            setExpanded(newExpanded);
        } else if (!searchTerm) {
            setExpanded({});
        }

        for (const item of filteredStockItems) {
            const warehouse = findById(warehouses, item.warehouse_id);
            if (!warehouse) continue;

            if (!warehouseMap[warehouse.id]) {
                warehouseMap[warehouse.id] = { warehouse, totalQuantity: 0, shelflessProducts: [], shelves: {} };
            }

            const product = findById(products, item.product_id);
            if (!product) continue;

            warehouseMap[warehouse.id].totalQuantity += item.quantity;
            
            if (item.shelf_id) {
                const shelf = findById(shelves, item.shelf_id);
                if (!shelf) continue;

                if (!warehouseMap[warehouse.id].shelves[shelf.id]) {
                    warehouseMap[warehouse.id].shelves[shelf.id] = { shelf, totalQuantity: 0, products: [] };
                }
                
                warehouseMap[warehouse.id].shelves[shelf.id].products.push({ product, quantity: item.quantity });
                warehouseMap[warehouse.id].shelves[shelf.id].totalQuantity += item.quantity;
            } else {
                warehouseMap[warehouse.id].shelflessProducts.push({ product, quantity: item.quantity });
            }
        }

        // Now sort the products within each group
        for (const warehouseId in warehouseMap) {
            warehouseMap[warehouseId].shelflessProducts = sortProducts(warehouseMap[warehouseId].shelflessProducts);
            for (const shelfId in warehouseMap[warehouseId].shelves) {
                warehouseMap[warehouseId].shelves[shelfId].products = sortProducts(warehouseMap[warehouseId].shelves[shelfId].products);
            }
        }

        return Object.values(warehouseMap);
    }, [stockItems, warehouses, shelves, products, searchTerm, sortConfig]);

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getUnitAbbr = (unitId: string) => findById(units, unitId)?.abbreviation || '';

    const headers = [
        { key: 'productName', label: 'Konum / Ürün Adı', align: 'left', width: 'w-2/5' },
        { key: 'sku', label: 'SKU', align: 'left', width: 'w-1/5' },
        { key: 'quantity', label: 'Miktar', align: 'right', width: 'w-1/5' },
    ];

    return (
        <div id="stock-overview-page" className="stock-overview-page">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100">Stok Durumu</h1>
            </div>
            <div className="search-bar mb-4">
                <input
                    id="stock-search-input"
                    type="text"
                    placeholder="Ürün adı veya SKU ile ara..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={formInputClass}
                />
            </div>
            <div className="stock-table-container bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table id="stock-overview-table" className="data-table w-full text-left">
                        <thead className="table-header-row border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                {headers.map(header => (
                                     <th key={header.key} className={`table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider ${header.width} text-${header.align}`}>
                                        <button onClick={() => requestSort(header.key)} className={`sort-button w-full text-${header.align} flex items-center ${header.align === 'right' ? 'justify-end' : ''} gap-1 hover:text-slate-800 dark:hover:text-slate-100`}>
                                            {header.label}
                                            {sortConfig?.key === header.key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {groupedStock.length === 0 && (
                                <tr className="empty-row"><td colSpan={3} className="empty-message text-center p-8 text-slate-500 dark:text-slate-400">Gösterilecek stok bulunamadı.</td></tr>
                            )}
                            {groupedStock.map(({ warehouse, totalQuantity, shelflessProducts, shelves }) => (
                                <React.Fragment key={warehouse.id}>
                                    <tr className="warehouse-row table-group-header border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer" onClick={() => toggleExpand(`wh-${warehouse.id}`)}>
                                        <td className="table-cell p-4 font-bold text-slate-800 dark:text-slate-100">
                                            <i className={`fa-solid fa-fw ${expanded[`wh-${warehouse.id}`] ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2`}></i>
                                            {warehouse.name}
                                        </td>
                                        <td className="table-cell"></td>
                                        <td className="table-cell p-4 font-bold text-slate-800 dark:text-slate-100 text-right">{formatNumber(totalQuantity)}</td>
                                    </tr>
                                    {expanded[`wh-${warehouse.id}`] && (
                                        <>
                                            {shelflessProducts.map(({ product, quantity }) => (
                                                <tr key={`sl-${product.id}`} className="product-row table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="table-cell p-4 pl-12 text-slate-700 dark:text-slate-300">{product.name}</td>
                                                    <td className="table-cell p-4 text-slate-600 dark:text-slate-400 font-mono text-sm">{product.sku}</td>
                                                    <td className="table-cell p-4 text-slate-800 dark:text-slate-200 font-medium text-right">{formatNumber(quantity)} {getUnitAbbr(product.unit_id)}</td>
                                                </tr>
                                            ))}
                                            {Object.values(shelves).map(({ shelf, totalQuantity: shelfTotal, products: shelfProducts }) => (
                                                <React.Fragment key={shelf.id}>
                                                    <tr className="shelf-row table-group-header border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer" onClick={() => toggleExpand(`sh-${shelf.id}`)}>
                                                        <td className="table-cell p-4 pl-12 font-semibold text-slate-700 dark:text-slate-200">
                                                             <i className={`fa-solid fa-fw ${expanded[`sh-${shelf.id}`] ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2`}></i>
                                                            {shelf.name}
                                                        </td>
                                                        <td className="table-cell"></td>
                                                        <td className="table-cell p-4 font-semibold text-slate-700 dark:text-slate-200 text-right">{formatNumber(shelfTotal)}</td>
                                                    </tr>
                                                    {expanded[`sh-${shelf.id}`] && shelfProducts.map(({ product, quantity }) => (
                                                        <tr key={product.id} className="product-row table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="table-cell p-4 pl-20 text-slate-700 dark:text-slate-300">{product.name}</td>
                                                            <td className="table-cell p-4 text-slate-600 dark:text-slate-400 font-mono text-sm">{product.sku}</td>
                                                            <td className="table-cell p-4 text-slate-800 dark:text-slate-200 font-medium text-right">{formatNumber(quantity)} {getUnitAbbr(product.unit_id)}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockOverviewPage;
