
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
        <div id="warehouses-page" className="warehouses-page">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100">Depo & Raf Yönetimi</h1>
                <button id="add-warehouse-button" onClick={onAddWarehouse} className="primary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                    <PlusIcon /> Yeni Depo Ekle
                </button>
            </div>

            <div className="warehouse-list space-y-6">
                {warehouses.map(warehouse => (
                    <div key={warehouse.id} id={`warehouse-card-${warehouse.id}`} className="warehouse-card bg-white dark:bg-slate-800 p-6 rounded-lg shadow border dark:border-slate-700">
                        <div className="warehouse-header flex justify-between items-center mb-4 pb-4 border-b dark:border-slate-700">
                            <div>
                                <h2 className="warehouse-name text-xl font-bold text-slate-800 dark:text-slate-100">{warehouse.name} <span className="warehouse-code text-base font-normal text-slate-500 dark:text-slate-400">({warehouse.code})</span></h2>
                                <div className="warehouse-meta flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                    <span className="warehouse-group-info">Grup: <strong>{getGroupName(warehouse.group_id)}</strong></span>
                                    <span className="warehouse-stock-count">Stok Adedi: <strong>{formatNumber(getStockCountForWarehouse(warehouse.id))}</strong></span>
                                </div>
                            </div>
                            <div className="warehouse-actions flex items-center gap-2">
                                <button onClick={() => onAddShelf(warehouse.id)} className="add-shelf-button font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500">
                                    <PlusIcon /> Raf Ekle
                                </button>
                                <button onClick={() => setModal({ type: 'EDIT_WAREHOUSE', data: warehouse })} className="edit-warehouse-button text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><PencilIcon /></button>
                                <button onClick={() => setModal({ type: 'CONFIRM_DELETE', data: { message: `"${warehouse.name}" adlı depoyu silmek istediğinizden emin misiniz?`, onConfirm: () => handleDeleteWarehouse(warehouse.id) } })} className="delete-warehouse-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"><TrashIcon /></button>
                            </div>
                        </div>

                        <div className="shelf-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {shelves.filter(s => s.warehouse_id === warehouse.id).map(shelf => (
                                <div key={shelf.id} id={`shelf-card-${shelf.id}`} className="shelf-card bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md border dark:border-slate-600 text-center">
                                    <p className="shelf-name font-semibold text-slate-700 dark:text-slate-200">{shelf.name}</p>
                                    <p className="shelf-code text-xs text-slate-500 dark:text-slate-400">Kod: {shelf.code}</p>
                                    <p className="shelf-stock-count text-xs text-slate-500 dark:text-slate-400">Stok: {formatNumber(getStockCountForShelf(shelf.id))}</p>
                                    <div className="shelf-actions mt-2 flex justify-center gap-3">
                                        <button onClick={() => setModal({ type: 'EDIT_SHELF', data: shelf })} className="edit-shelf-button text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"><PencilIcon/></button>
                                        <button onClick={() => setModal({ type: 'CONFIRM_DELETE', data: { message: `"${shelf.name}" adlı rafı silmek istediğinizden emin misiniz?`, onConfirm: () => handleDeleteShelf(shelf.id) } })} className="delete-shelf-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                             {shelves.filter(s => s.warehouse_id === warehouse.id).length === 0 && (
                                <div className="col-span-full text-center text-sm text-slate-500 dark:text-slate-400 py-4">Bu depoda hiç raf yok.</div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WarehousesPage;