
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
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Anasayfa</h1>
            <div className="mb-8">
                 {productGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {productCountsByGroup.map(group => (
                            <div key={group.id} className="bg-white p-6 rounded-lg shadow border flex-grow min-w-[200px] max-w-xs">
                                <h3 className="text-sm font-medium text-slate-500 truncate" title={group.name}>{group.name}</h3>
                                <p className="text-4xl font-bold text-slate-800 mt-2">{formatNumber(group.count)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="bg-white p-6 rounded-lg shadow border max-w-sm">
                        <h3 className="text-sm font-medium text-slate-500">Toplam Ürün Çeşidi</h3>
                        <p className="text-4xl font-bold text-slate-800 mt-2">{products.length}</p>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-4 mb-8">
                <button onClick={() => setModal({ type: 'STOCK_IN' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-green-600 text-white hover:bg-green-700">
                    <ArrowRightToBracketIcon /> Yeni Stok Girişi
                </button>
                <button onClick={() => setModal({ type: 'STOCK_OUT' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700">
                    <ArrowRightFromBracketIcon /> Yeni Stok Çıkışı
                </button>
                <button onClick={() => setModal({ type: 'STOCK_TRANSFER' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-orange-600 text-white hover:bg-orange-700">
                    <DollyIcon /> Yeni Transfer Hareketi
                </button>
                <button onClick={() => setModal({ type: 'ADD_PRODUCTION_VOUCHER' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-purple-600 text-white hover:bg-purple-700">
                    <IndustryIcon /> Yeni Üretim Fişi
                </button>
                <button onClick={() => setModal({ type: 'ADD_PRODUCT' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-600 text-white hover:bg-sky-700">
                    <CubeIcon /> Yeni Ürün Ekle
                </button>
                <button onClick={() => setModal({ type: 'ADD_ACCOUNT' })} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-600 text-white hover:bg-sky-700">
                    <UserPlusIcon /> Yeni Cari Ekle
                </button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Son Stok Hareketleri</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                {headers.map(header => (
                                    <th key={header.key} className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">
                                        <button onClick={() => requestSort(header.key)} className="w-full text-left flex items-center gap-1 hover:text-slate-800">
                                            {header.label}
                                            {sortConfig.key === header.key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRecentMovements.map(m => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-4 align-middle text-slate-700">{new Date(m.date).toLocaleDateString()}</td>
                                    <td className="p-4 align-middle text-slate-700 font-mono">{m.voucher_number}</td>
                                    <td className="p-4 align-middle text-slate-700">{m.productName}</td>
                                    <td className="p-4 align-middle text-slate-700">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${m.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {m.type === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-slate-700 font-medium">{formatNumber(m.quantity)}</td>
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