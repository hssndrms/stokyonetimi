import React, { useState, useMemo } from 'react';
import { Product, StockItem, Warehouse, Shelf, Unit } from '../types';
import { findById } from '../utils/helpers';
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

    const groupedStock = useMemo(() => {
        const warehouseMap: Record<string, {
            warehouse: Warehouse;
            totalQuantity: number;
            shelflessProducts: { product: Product; quantity: number }[];
            shelves: Record<string, {
                shelf: Shelf;
                totalQuantity: number;
                products: { product: Product; quantity: number }[];
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
        return Object.values(warehouseMap);
    }, [stockItems, warehouses, shelves, products, searchTerm]);

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getUnitAbbr = (unitId: string) => findById(units, unitId)?.abbreviation || '';

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Stok Durumu</h1>
            </div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Ürün adı veya SKU ile ara..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={formInputClass}
                />
            </div>
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b bg-slate-50">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-2/5">Konum / Ürün Adı</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/5">SKU</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/5 text-right">Miktar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedStock.length === 0 && (
                                <tr><td colSpan={3} className="text-center p-8 text-slate-500">Gösterilecek stok bulunamadı.</td></tr>
                            )}
                            {groupedStock.map(({ warehouse, totalQuantity, shelflessProducts, shelves }) => (
                                <React.Fragment key={warehouse.id}>
                                    <tr className="border-b bg-slate-100 hover:bg-slate-200 cursor-pointer" onClick={() => toggleExpand(`wh-${warehouse.id}`)}>
                                        <td className="p-4 font-bold text-slate-800">
                                            <i className={`fa-solid fa-fw ${expanded[`wh-${warehouse.id}`] ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2`}></i>
                                            {warehouse.name}
                                        </td>
                                        <td></td>
                                        <td className="p-4 font-bold text-slate-800 text-right">{totalQuantity.toLocaleString()}</td>
                                    </tr>
                                    {expanded[`wh-${warehouse.id}`] && (
                                        <>
                                            {shelflessProducts.map(({ product, quantity }) => (
                                                <tr key={`sl-${product.id}`} className="border-b hover:bg-slate-50">
                                                    <td className="p-4 pl-12 text-slate-700">{product.name}</td>
                                                    <td className="p-4 text-slate-600 font-mono text-sm">{product.sku}</td>
                                                    <td className="p-4 text-slate-800 font-medium text-right">{quantity.toLocaleString()} {getUnitAbbr(product.unit_id)}</td>
                                                </tr>
                                            ))}
                                            {Object.values(shelves).map(({ shelf, totalQuantity: shelfTotal, products: shelfProducts }) => (
                                                <React.Fragment key={shelf.id}>
                                                    <tr className="border-b bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => toggleExpand(`sh-${shelf.id}`)}>
                                                        <td className="p-4 pl-12 font-semibold text-slate-700">
                                                             <i className={`fa-solid fa-fw ${expanded[`sh-${shelf.id}`] ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2`}></i>
                                                            {shelf.name}
                                                        </td>
                                                        <td></td>
                                                        <td className="p-4 font-semibold text-slate-700 text-right">{shelfTotal.toLocaleString()}</td>
                                                    </tr>
                                                    {expanded[`sh-${shelf.id}`] && shelfProducts.map(({ product, quantity }) => (
                                                        <tr key={product.id} className="border-b hover:bg-slate-50">
                                                            <td className="p-4 pl-20 text-slate-700">{product.name}</td>
                                                            <td className="p-4 text-slate-600 font-mono text-sm">{product.sku}</td>
                                                            <td className="p-4 text-slate-800 font-medium text-right">{quantity.toLocaleString()} {getUnitAbbr(product.unit_id)}</td>
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