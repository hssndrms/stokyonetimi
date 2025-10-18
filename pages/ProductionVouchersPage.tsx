import React, { useState, useMemo } from 'react';
import { StockMovement, Product, Warehouse, Shelf, Unit, ModalState, GeneralSettings } from '../types';
import { findById } from '../utils/helpers';
import { PlusIcon } from '../components/icons';

const ProductionVouchersPage: React.FC<{
    movements: StockMovement[];
    products: Product[];
    warehouses: Warehouse[];
    shelves: Shelf[];
    units: Unit[];
    setModal: (modal: ModalState) => void;
    generalSettings: GeneralSettings;
}> = ({ movements, products, warehouses, shelves, units, setModal, generalSettings }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const productionMovements = useMemo(() => {
        const productionVouchers = movements.filter(m => m.transaction_type === 'PRODUCTION');

        const grouped = productionVouchers.reduce((acc, mov) => {
            if (!acc[mov.voucher_number]) {
                acc[mov.voucher_number] = {
                    voucher_number: mov.voucher_number,
                    date: mov.date,
                    notes: mov.notes || '',
                    consumed: [],
                    produced: []
                };
            }
            
            const product = findById(products, mov.product_id);
            const warehouse = findById(warehouses, mov.warehouse_id);
            const shelf = findById(shelves, mov.shelf_id);
            const unit = findById(units, product?.unit_id);

            const line = {
                productName: product?.name || 'Bilinmeyen',
                quantity: mov.quantity,
                unitAbbr: unit?.abbreviation || '',
                location: `${warehouse?.name || ''}${shelf ? ` / ${shelf.name}` : ''}`
            };

            if (mov.type === 'OUT') {
                acc[mov.voucher_number].consumed.push(line);
            } else {
                acc[mov.voucher_number].produced.push(line);
            }

            return acc;
        }, {} as Record<string, { voucher_number: string, date: string, notes: string, consumed: any[], produced: any[] }>);

        return Object.values(grouped);

    }, [movements, products, warehouses, shelves, units]);

    const sortedData = useMemo(() => {
        return [...productionMovements].sort((a, b) => {
            const aValue = a[sortConfig.key as keyof typeof a];
            const bValue = b[sortConfig.key as keyof typeof a];
             if (sortConfig.key === 'date') {
                return (new Date(bValue as string).getTime() - new Date(aValue as string).getTime()) * (sortConfig.direction === 'descending' ? 1 : -1);
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [productionMovements, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleVoucherClick = (voucherNumber: string) => {
        setModal({
            type: 'EDIT_PRODUCTION_VOUCHER',
            data: { voucher_number: voucherNumber }
        });
    };

    return (
        <div id="production-vouchers-page">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100">Üretim Fişleri</h1>
                <button id="add-new-voucher-button" onClick={() => setModal({ type: 'ADD_PRODUCTION_VOUCHER' })} className="primary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                    <PlusIcon /> Yeni Üretim Fişi
                </button>
            </div>

            <div className="data-table-container bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table id="vouchers-table" className="data-table w-full text-left">
                        <thead>
                            <tr className="table-header-row border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                <th className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-1/6">
                                    <button onClick={() => requestSort('date')} className="sort-button w-full text-left flex items-center gap-1">Tarih {sortConfig.key === 'date' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</button>
                                </th>
                                <th className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-1/6">
                                    <button onClick={() => requestSort('voucher_number')} className="sort-button w-full text-left flex items-center gap-1">Fiş No {sortConfig.key === 'voucher_number' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</button>
                                </th>
                                <th className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-2/6">Kullanılan Malzemeler (Gider)</th>
                                <th className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-2/6">Üretilen Ürünler (Girdi)</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {sortedData.map(voucher => (
                                <tr key={voucher.voucher_number} className="voucher-row table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="table-cell p-4 align-top text-slate-700 dark:text-slate-300">{new Date(voucher.date).toLocaleDateString()}</td>
                                    <td className="table-cell p-4 align-top">
                                        <button 
                                            onClick={() => handleVoucherClick(voucher.voucher_number)}
                                            className="voucher-link font-mono text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                        >
                                            {voucher.voucher_number}
                                        </button>
                                        {voucher.notes && <p className="voucher-notes text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={voucher.notes}>Not: {voucher.notes}</p>}
                                    </td>
                                    <td className="table-cell p-4 align-top text-slate-700 dark:text-slate-300 text-sm">
                                        <ul className="consumed-items-list space-y-1">
                                            {voucher.consumed.map((item: any, i: number) => (
                                                <li key={i} className="consumed-item"><strong>{item.quantity} {item.unitAbbr}</strong> {item.productName} <span className="item-location text-slate-500 dark:text-slate-400">({item.location})</span></li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="table-cell p-4 align-top text-slate-700 dark:text-slate-300 text-sm">
                                         <ul className="produced-items-list space-y-1">
                                            {voucher.produced.map((item: any, i: number) => (
                                                <li key={i} className="produced-item"><strong>{item.quantity} {item.unitAbbr}</strong> {item.productName} <span className="item-location text-slate-500 dark:text-slate-400">({item.location})</span></li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                              {sortedData.length === 0 && (
                                <tr className="empty-row">
                                    <td colSpan={4} className="empty-message text-center p-8 text-slate-500 dark:text-slate-400">
                                        Henüz üretim fişi oluşturulmamış.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductionVouchersPage;