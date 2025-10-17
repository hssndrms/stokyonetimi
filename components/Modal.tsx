import React, { useRef, useEffect } from 'react';
import { ModalState, Warehouse, Shelf } from '../types';
import { useInventory } from '../hooks/useInventory';
import { XMarkIcon } from './icons';

// Import new modal components
import WarehouseFormModal from './modals/WarehouseFormModal';
import ShelfFormModal from './modals/ShelfFormModal';
import ProductFormModal from './modals/ProductFormModal';
import AccountFormModal from './modals/AccountFormModal';
import StockMovementFormModal from './modals/StockMovementFormModal';
import StockTransferFormModal from './modals/StockTransferFormModal';
import ProductionVoucherFormModal from './modals/ProductionVoucherFormModal';
import SimpleFormModal from './modals/SimpleFormModal';
import ProductGroupFormModal from './modals/ProductGroupFormModal';
import ConfirmDeleteModal from './modals/ConfirmDeleteModal';

type ModalProps = {
    state: ModalState;
    onClose: () => void;
    setModal: (modal: ModalState) => void;
} & ReturnType<typeof useInventory>;

const Modal: React.FC<ModalProps> = ({ state, onClose, setModal, ...props }) => {
    const { type, data } = state;
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!type) return null;

    const renderTitle = () => {
        const titles: { [key in Exclude<ModalState['type'], null>]: string } = {
            ADD_WAREHOUSE: 'Yeni Depo Ekle', EDIT_WAREHOUSE: 'Depo Düzenle',
            ADD_SHELF: 'Yeni Raf Ekle', EDIT_SHELF: 'Raf Düzenle',
            ADD_PRODUCT: 'Yeni Ürün Ekle', EDIT_PRODUCT: 'Ürün Düzenle',
            ADD_UNIT: 'Yeni Birim Ekle', EDIT_UNIT: 'Birim Düzenle',
            ADD_PRODUCT_GROUP: 'Yeni Ürün Grubu Ekle', EDIT_PRODUCT_GROUP: 'Ürün Grubu Düzenle',
            ADD_WAREHOUSE_GROUP: 'Yeni Depo Grubu Ekle', EDIT_WAREHOUSE_GROUP: 'Depo Grubu Düzenle',
            ADD_ACCOUNT: 'Yeni Cari Ekle', EDIT_ACCOUNT: 'Cari Düzenle',
            STOCK_IN: 'Stok Giriş Fişi', STOCK_OUT: 'Stok Çıkış Fişi',
            EDIT_STOCK_VOUCHER: 'Stok Fişi Düzenle',
            STOCK_TRANSFER: 'Stok Transfer Fişi',
            EDIT_STOCK_TRANSFER: 'Stok Transfer Fişi Düzenle',
            ADD_PRODUCTION_VOUCHER: 'Yeni Üretim Fişi',
            EDIT_PRODUCTION_VOUCHER: 'Üretim Fişi Düzenle',
            CONFIRM_DELETE: 'Silme Onayı',
        };
        return titles[type] || '';
    };
    
    const renderContent = () => {
        const modalProps = { data, onClose, setModal, ...props };
        switch (type) {
            case 'ADD_WAREHOUSE': return <WarehouseFormModal isEdit={false} {...modalProps} />;
            case 'EDIT_WAREHOUSE': return <WarehouseFormModal isEdit={true} {...modalProps} data={data as Warehouse} />;
            case 'ADD_SHELF': return <ShelfFormModal isEdit={false} {...modalProps} />;
            case 'EDIT_SHELF': return <ShelfFormModal isEdit={true} {...modalProps} data={data as Shelf} />;
            
            case 'ADD_UNIT': return <SimpleFormModal {...modalProps} fields={[{ name: 'name', label: 'Birim Adı', value: '' }, { name: 'abbreviation', label: 'Kısaltma', value: '' }]} onSubmit={d => props.handleAddUnit({ name: d.name, abbreviation: d.abbreviation })} />;
            case 'EDIT_UNIT': return <SimpleFormModal {...modalProps} fields={[{ name: 'name', label: 'Birim Adı', value: data.name }, { name: 'abbreviation', label: 'Kısaltma', value: data.abbreviation }]} onSubmit={d => props.handleEditUnit({ ...data, ...d })} />;
            
            case 'ADD_PRODUCT_GROUP': return <ProductGroupFormModal isEdit={false} {...modalProps} />;
            case 'EDIT_PRODUCT_GROUP': return <ProductGroupFormModal isEdit={true} {...modalProps} />;
           
            case 'ADD_WAREHOUSE_GROUP': return <SimpleFormModal {...modalProps} fields={[{ name: 'name', label: 'Grup Adı', value: '' }]} onSubmit={d => props.handleAddWarehouseGroup({ name: d.name })} />;
            case 'EDIT_WAREHOUSE_GROUP': return <SimpleFormModal {...modalProps} fields={[{ name: 'name', label: 'Grup Adı', value: data.name }]} onSubmit={d => props.handleEditWarehouseGroup({ ...data, ...d })} />;
            
            case 'ADD_ACCOUNT':
            case 'EDIT_ACCOUNT': return <AccountFormModal isEdit={type === 'EDIT_ACCOUNT'} {...modalProps} />;
            
            case 'ADD_PRODUCT':
            case 'EDIT_PRODUCT': return <ProductFormModal isEdit={type === 'EDIT_PRODUCT'} {...modalProps} />;
            
            case 'STOCK_IN':
            case 'STOCK_OUT': return <StockMovementFormModal isStockIn={type === 'STOCK_IN'} {...modalProps} />;
            
            case 'EDIT_STOCK_VOUCHER': return <StockMovementFormModal isEdit={true} {...modalProps} />;

            case 'STOCK_TRANSFER': return <StockTransferFormModal isEdit={false} {...modalProps} />;
            case 'EDIT_STOCK_TRANSFER': return <StockTransferFormModal isEdit={true} {...modalProps} />;

            case 'ADD_PRODUCTION_VOUCHER': return <ProductionVoucherFormModal isEdit={false} {...modalProps} />;
            case 'EDIT_PRODUCTION_VOUCHER': return <ProductionVoucherFormModal isEdit={true} {...modalProps} />;

            case 'CONFIRM_DELETE': return <ConfirmDeleteModal {...modalProps} />;
            
            default: return null;
        }
    };

    const modalWidthClass = () => {
        if ([ 'STOCK_IN', 'STOCK_OUT', 'EDIT_STOCK_VOUCHER', 
              'STOCK_TRANSFER', 'EDIT_STOCK_TRANSFER', 
              'ADD_PRODUCTION_VOUCHER', 'EDIT_PRODUCTION_VOUCHER' ].includes(type)) return 'max-w-6xl';
        if (type === 'CONFIRM_DELETE') return 'max-w-md';
        return 'max-w-lg';
    }

    const topAlignedModals = new Set([
        'STOCK_IN', 'STOCK_OUT', 'EDIT_STOCK_VOUCHER', 
        'STOCK_TRANSFER', 'EDIT_STOCK_TRANSFER', 
        'ADD_PRODUCTION_VOUCHER', 'EDIT_PRODUCTION_VOUCHER'
    ]);

    const verticalAlignmentClass = topAlignedModals.has(type!) ? 'items-start pt-8' : 'items-center';

    return (
        <div id="modal-overlay" className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex ${verticalAlignmentClass} justify-center p-4 overflow-y-auto`}>
            <div ref={modalRef} id="modal-panel" className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${modalWidthClass()} p-6 relative`}>
                <div id="modal-header" className="flex justify-between items-start pb-4 border-b dark:border-slate-700 mb-6">
                    <h2 className="modal-title text-2xl font-bold text-slate-800 dark:text-slate-100">{renderTitle()}</h2>
                    <button id="modal-close-button" onClick={onClose} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500">
                        <XMarkIcon />
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default Modal;