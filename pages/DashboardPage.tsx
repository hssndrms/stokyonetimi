import React, { useMemo } from 'react';
import { Product, StockMovement, ModalState, StockItem } from '../types';
import { findById } from '../utils/helpers';
import { ArrowRightToBracketIcon, ArrowRightFromBracketIcon, CubeIcon, UserPlusIcon, DollyIcon } from '../components/icons';

const DashboardPage: React.FC<{
    products: Product[];
    stockItems: StockItem[];
    movements: StockMovement[];
    setModal: (modal: ModalState) => void;
}> = ({ products, stockItems, movements, setModal }) => {
    const recentMovements = useMemo(() => movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20), [movements]);

    const getProductName = (productId: string) => findById(products, productId)?.name || 'Bilinmeyen Ürün';

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Anasayfa</h1>
            <div className="mb-8">
                 <div className="bg-white p-6 rounded-lg shadow border max-w-sm">
                    <h3 className="text-sm font-medium text-slate-500">Toplam Ürün Çeşidi</h3>
                    <p className="text-4xl font-bold text-slate-800 mt-2">{products.length}</p>
                </div>
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
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Tarih</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Fiş No</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Ürün</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">İşlem</th>
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Miktar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentMovements.map(m => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-4 align-middle text-slate-700">{new Date(m.date).toLocaleDateString()}</td>
                                    <td className="p-4 align-middle text-slate-700 font-mono text-xs">{m.voucher_number}</td>
                                    <td className="p-4 align-middle text-slate-700">{getProductName(m.product_id)}</td>
                                    <td className="p-4 align-middle text-slate-700">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${m.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {m.type === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-slate-700 font-medium">{m.quantity}</td>
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