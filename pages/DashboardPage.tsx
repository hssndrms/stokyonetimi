
import React, { useMemo, useState } from 'react';
import { Product, StockMovement, ModalState, StockItem, ProductGroup } from '../types';
import { findById, formatNumber } from '../utils/helpers';
import { ArrowRightToBracketIcon, ArrowRightFromBracketIcon, CubeIcon, UserPlusIcon, DollyIcon, IndustryIcon } from '../components/icons';

const DashboardPage: React.FC<{
    products: Product[];
    stockItems: StockItem[];
    movements: StockMovement[];
    productGroups: ProductGroup[];
    setModal: (modal: ModalState) => void;
}> = ({ products, stockItems, movements, productGroups, setModal }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const getProductName = (productId: string) => findById(products, productId)?.name || 'Bilinmeyen Ürün';

    const sortedRecentMovements = useMemo(() => {
        let items = [...movements]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20)
            .map(m => ({ ...m, productName: getProductName(m.product_id) })); 

        if (sortConfig.key) {
            items.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                let aValue: any = a[key];
                let bValue: any = b[key];

                if (key === 'date') {
                    aValue = new Date(a.date).getTime();
                    bValue = new Date(b.date).getTime();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return items;
    }, [movements, products, sortConfig]);

    const productCountsByGroup = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const product of products) {
            counts[product.group_id] = (counts[product.group_id] || 0) + 1;
        }

        return productGroups
            .map(group => ({
                id: group.id,
                name: group.name,
                count: counts[group.id] || 0
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, productGroups]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const headers = [
        { key: 'date', label: 'Tarih' },
        { key: 'voucher_number', label: 'Fiş No' },
        { key: 'productName', label: 'Ürün' },
        { key: 'type', label: 'İşlem' },
        { key: 'quantity', label: 'Miktar' },
    ];


    return (
        <div id="dashboard-page" className="dashboard-page">
            <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Anasayfa</h1>
            <div id="stats-section" className="mb-8">
                 {productGroups.length > 0 ? (
                    <div className="stats-grid flex flex-wrap gap-4">
                        {productCountsByGroup.map(group => (
                            <div key={group.id} className="stat-card bg-white dark:bg-slate-800 p-6 rounded-lg shadow border dark:border-slate-700 flex-grow min-w-[200px] max-w-xs">
                                <h3 className="stat-title text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={group.name}>{group.name}</h3>
                                <p className="stat-value text-4xl font-bold text-slate-800 dark:text-slate-100 mt-2">{formatNumber(group.count)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="stat-card bg-white dark:bg-slate-800 p-6 rounded-lg shadow border dark:border-slate-700 max-w-sm">
                        <h3 className="stat-title text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Ürün Çeşidi</h3>
                        <p className="stat-value text-4xl font-bold text-slate-800 dark:text-slate-100 mt-2">{products.length}</p>
                    </div>
                )}
            </div>
            <div id="quick-actions-section" className="flex flex-wrap gap-4 mb-8">
                <button onClick={() => setModal({ type: 'STOCK_IN' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
                    <ArrowRightToBracketIcon /> Yeni Stok Girişi
                </button>
                <button onClick={() => setModal({ type: 'STOCK_OUT' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600">
                    <ArrowRightFromBracketIcon /> Yeni Stok Çıkışı
                </button>
                <button onClick={() => setModal({ type: 'STOCK_TRANSFER' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500">
                    <DollyIcon /> Yeni Transfer Hareketi
                </button>
                <button onClick={() => setModal({ type: 'ADD_PRODUCTION_VOUCHER' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600">
                    <IndustryIcon /> Yeni Üretim Fişi
                </button>
                <button onClick={() => setModal({ type: 'ADD_PRODUCT' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600">
                    <CubeIcon /> Yeni Ürün Ekle
                </button>
                <button onClick={() => setModal({ type: 'ADD_ACCOUNT' })} className="quick-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600">
                    <UserPlusIcon /> Yeni Cari Ekle
                </button>
            </div>
            <div id="recent-movements-section" className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border dark:border-slate-700">
                <h3 className="section-title text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Son 20 Stok Hareketi</h3>
                <div className="overflow-x-auto">
                    <table className="data-table w-full text-left">
                        <thead>
                            <tr className="table-header-row border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                {headers.map(header => (
                                    <th key={header.key} className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => requestSort(header.key)} className="sort-button w-full text-left flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100">
                                            {header.label}
                                            {sortConfig.key === header.key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {sortedRecentMovements.map(m => (
                                <tr key={m.id} className="table-row border-b dark:border-slate-700">
                                    <td className="table-cell p-4 align-middle text-slate-700 dark:text-slate-300">{new Date(m.date).toLocaleDateString()}</td>
                                    <td className="table-cell p-4 align-middle text-slate-700 dark:text-slate-300">{m.voucher_number}</td>
                                    <td className="table-cell p-4 align-middle text-slate-700 dark:text-slate-300">{m.productName}</td>
                                    <td className="table-cell p-4 align-middle text-slate-700 dark:text-slate-300">
                                        <span className={`status-badge px-2.5 py-1 text-xs font-semibold rounded-full ${m.type === 'IN' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-200'}`}>
                                            {m.type === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                        </span>
                                    </td>
                                    <td className="table-cell p-4 align-middle text-slate-700 dark:text-slate-200 font-medium text-right">{formatNumber(m.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;