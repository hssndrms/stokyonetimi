
import React from 'react';
import { Warehouse, Shelf, StockItem, ModalState, WarehouseGroup } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons';
import { findById, formatNumber } from '../utils/helpers';

const WarehousesPage: React.FC<{
    warehouses: Warehouse[];
    shelves: Shelf[];
    stockItems: StockItem[];
    warehouseGroups: WarehouseGroup[];
    setModal: (modal: ModalState) => void;
    handleDeleteWarehouse: (warehouseId: string) => void;
    handleDeleteShelf: (shelfId: string) => void;
}> = ({ warehouses, shelves, stockItems, warehouseGroups, setModal, handleDeleteWarehouse, handleDeleteShelf }) => {
    
    const getStockCountForWarehouse = (warehouseId: string) => stockItems.filter(item => item.warehouse_id === warehouseId).reduce((sum, item) => sum + item.quantity, 0);
    const getStockCountForShelf = (shelfId: string) => stockItems.filter(item => item.shelf_id === shelfId).reduce((sum, item) => sum + item.quantity, 0);
    const getGroupName = (groupId: string) => findById(warehouseGroups, groupId)?.name || 'Bilinmiyor';

    const suggestWarehouseCode = (): string => {
        const codes = warehouses.map(w => w.code).filter(c => c && c.startsWith('D')).map(c => parseInt(c.substring(1), 10));
        const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1;
        return `D${String(nextNum).padStart(4, '0')}`;
    }

    const suggestShelfCode = (): string => {
        const codes = shelves.map(s => s.code).filter(c => c && c.startsWith('R')).map(c => parseInt(c.substring(1), 10));
        const nextNum = codes.length > 0 ? Math.max(...codes) + 1 : 1;
        return `R${String(nextNum).padStart(4, '0')}`;
    }

    const onAddWarehouse = () => {
        setModal({ type: 'ADD_WAREHOUSE', data: { suggestedCode: suggestWarehouseCode() } });
    };

    const onAddShelf = (warehouseId: string) => {
        setModal({ type: 'ADD_SHELF', data: { warehouse_id: warehouseId, suggestedCode: suggestShelfCode() } });
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Depo & Raf Yönetimi</h1>
                <button onClick={onAddWarehouse} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                    <PlusIcon /> Yeni Depo Ekle
                </button>
            </div>

            <div className="space-y-6">
                {warehouses.map(warehouse => (
                    <div key={warehouse.id} className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{warehouse.name} <span className="text-base font-normal text-slate-500">({warehouse.code})</span></h2>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <span>Grup: <strong>{getGroupName(warehouse.group_id)}</strong></span>
                                    <span>Stok Adedi: <strong>{formatNumber(getStockCountForWarehouse(warehouse.id))}</strong></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onAddShelf(warehouse.id)} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                                    <PlusIcon /> Raf Ekle
                                </button>
                                <button onClick={() => setModal({ type: 'EDIT_WAREHOUSE', data: warehouse })} className="text-blue-600 hover:text-blue-800"><PencilIcon /></button>
                                <button onClick={() => setModal({ type: 'CONFIRM_DELETE', data: { message: `"${warehouse.name}" adlı depoyu silmek istediğinizden emin misiniz?`, onConfirm: () => handleDeleteWarehouse(warehouse.id) } })} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {shelves.filter(s => s.warehouse_id === warehouse.id).map(shelf => (
                                <div key={shelf.id} className="bg-slate-50 p-3 rounded-md border text-center">
                                    <p className="font-semibold text-slate-700">{shelf.name}</p>
                                    <p className="text-xs text-slate-500">Kod: {shelf.code}</p>
                                    <p className="text-xs text-slate-500">Stok: {formatNumber(getStockCountForShelf(shelf.id))}</p>
                                    <div className="mt-2 flex justify-center gap-3">
                                        <button onClick={() => setModal({ type: 'EDIT_SHELF', data: shelf })} className="text-blue-600 hover:text-blue-800 text-sm"><PencilIcon/></button>
                                        <button onClick={() => setModal({ type: 'CONFIRM_DELETE', data: { message: `"${shelf.name}" adlı rafı silmek istediğinizden emin misiniz?`, onConfirm: () => handleDeleteShelf(shelf.id) } })} className="text-red-600 hover:text-red-800 text-sm"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                             {shelves.filter(s => s.warehouse_id === warehouse.id).length === 0 && (
                                <div className="col-span-full text-center text-sm text-slate-500 py-4">Bu depoda hiç raf yok.</div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WarehousesPage;
