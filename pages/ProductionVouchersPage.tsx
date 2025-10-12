import React, { useState, useMemo } from 'react';
import { StockMovement, Product, Warehouse, Shelf, Unit, ModalState, GeneralSettings } from '../types';
import { findById } from '../../utils/helpers';
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
        // FIX: Add type checks to prevent comparing arrays which causes a TypeScript error.
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Üretim Fişleri</h1>
                <button onClick={() => setModal({ type: 'ADD_PRODUCTION_VOUCHER' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                    <PlusIcon /> Yeni Üretim Fişi
                </button>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/6">
                                    <button onClick={() => requestSort('date')} className="w-full text-left flex items-center gap-1">Tarih {sortConfig.key === 'date' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</button>
                                </th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/6">
                                    <button onClick={() => requestSort('voucher_number')} className="w-full text-left flex items-center gap-1">Fiş No {sortConfig.key === 'voucher_number' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</button>
                                </th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-2/6">Kullanılan Malzemeler (Gider)</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider w-2/6">Üretilen Ürünler (Girdi)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map(voucher => (
                                <tr key={voucher.voucher_number} className="border-b hover:bg-slate-50">
                                    <td className="p-4 align-top text-slate-700">{new Date(voucher.date).toLocaleDateString()}</td>
                                    <td className="p-4 align-top">
                                        <button 
                                            onClick={() => handleVoucherClick(voucher.voucher_number)}
                                            className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
                                        >
                                            {voucher.voucher_number}
                                        </button>
                                        {voucher.notes && <p className="text-xs text-slate-500 mt-1 truncate" title={voucher.notes}>Not: {voucher.notes}</p>}
                                    </td>
                                    <td className="p-4 align-top text-slate-700 text-sm">
                                        <ul className="space-y-1">
                                            {voucher.consumed.map((item: any, i: number) => (
                                                <li key={i}><strong>{item.quantity} {item.unitAbbr}</strong> {item.productName} <span className="text-slate-500">({item.location})</span></li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-4 align-top text-slate-700 text-sm">
                                         <ul className="space-y-1">
                                            {voucher.produced.map((item: any, i: number) => (
                                                <li key={i}><strong>{item.quantity} {item.unitAbbr}</strong> {item.productName} <span className="text-slate-500">({item.location})</span></li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                              {sortedData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-slate-500">
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