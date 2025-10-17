import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, ModalState, Unit, StockItem, Product, Warehouse, ProductGroup } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { formatNumber, findById } from '../../utils/helpers';

type Line = { 
    id: number | string, 
    productGroupId: string, 
    productId: string, 
    quantity: string,
    shelfId: string,
};
type Header = { 
    date: string, 
    notes: string,
    sourceWarehouseId: string,
    destWarehouseId: string
};

interface ProductionVoucherFormModalProps extends ModalComponentProps<{ 
    voucher_number?: string,
    restoredState?: { header: Header, consumed: Line[], produced: Line[] }
}> {
    isEdit: boolean;
    setModal: (modal: ModalState) => void;
}

const ProductionVoucherFormModal: React.FC<ProductionVoucherFormModalProps> = ({ 
    isEdit, data, onClose, getNextVoucherNumber, shelves, products, warehouses, 
    productGroups, handleProcessProductionVoucher, handleEditProductionVoucher, stockMovements, 
    setModal, handleDeleteStockVoucher, stockItems, units
}) => {
    const { addToast } = useToast();
    const isEditMode = !!(isEdit && data?.voucher_number);

    const initializeState = () => {
        if (data?.restoredState) {
            return data.restoredState;
        }

        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number);
            if (movements.length > 0) {
                const outMovement = movements.find(m => m.type === 'OUT');
                const inMovement = movements.find(m => m.type === 'IN');
                
                const headerData: Header = {
                    date: new Date(movements[0].date).toISOString().slice(0, 10),
                    notes: movements[0].notes || '',
                    sourceWarehouseId: outMovement?.warehouse_id || '',
                    destWarehouseId: inMovement?.warehouse_id || ''
                };

                const mapMovementsToLines = (type: 'IN' | 'OUT'): Line[] => {
                    const filteredMovements = movements.filter(m => m.type === type);
                    if (filteredMovements.length === 0) return [{ id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1', shelfId: '' }];
                    return filteredMovements.map(m => {
                        const product = products.find(p => p.id === m.product_id);
                        return {
                            id: m.id,
                            productGroupId: product?.group_id || '',
                            productId: m.product_id,
                            quantity: String(m.quantity),
                            shelfId: m.shelf_id || ''
                        };
                    });
                };

                const consumed = mapMovementsToLines('OUT');
                const produced = mapMovementsToLines('IN');
                
                return { header: headerData, consumed, produced };
            }
        }
        return {
            header: {
                date: new Date().toISOString().slice(0, 10),
                notes: '',
                sourceWarehouseId: '',
                destWarehouseId: '',
            },
            consumed: [{ id: Date.now(), productGroupId: '', productId: '', quantity: '1', shelfId: '' }],
            produced: [{ id: Date.now() + 1, productGroupId: '', productId: '', quantity: '1', shelfId: '' }],
        };
    };

    const [header, setHeader] = useState(initializeState().header);
    const [consumedLines, setConsumedLines] = useState(initializeState().consumed);
    const [producedLines, setProducedLines] = useState(initializeState().produced);
    
    const [voucherNumber, setVoucherNumber] = useState('');
    const [errors, setErrors] = useState<any>({});
    const [showStock, setShowStock] = useState(false);

    const [availableSourceShelves, setAvailableSourceShelves] = useState<Shelf[]>([]);
    const [availableDestShelves, setAvailableDestShelves] = useState<Shelf[]>([]);

    const getUnitAbbrForProduct = (productId: string): string => {
        const product = findById(products, productId);
        if (!product) return '';
        const unit = findById(units, product.unit_id);
        return unit?.abbreviation || '';
    };
    
    useEffect(() => {
        const fetchVoucherNumber = async () => {
            if (isEditMode) {
                setVoucherNumber(data.voucher_number!);
            } else {
                const newVoucherNumber = await getNextVoucherNumber('PRODUCTION');
                setVoucherNumber(newVoucherNumber);
            }
        };
        fetchVoucherNumber();
    }, [isEditMode, data, getNextVoucherNumber]);
    
    useEffect(() => {
        const shelvesForWarehouse = header.sourceWarehouseId ? shelves.filter(s => s.warehouse_id === header.sourceWarehouseId) : [];
        setAvailableSourceShelves(shelvesForWarehouse);
    }, [header.sourceWarehouseId, shelves]);

    useEffect(() => {
        const shelvesForWarehouse = header.destWarehouseId ? shelves.filter(s => s.warehouse_id === header.destWarehouseId) : [];
        setAvailableDestShelves(shelvesForWarehouse);
    }, [header.destWarehouseId, shelves]);

    const handleHeaderChange = (field: keyof Header, value: string) => {
        setHeader(h => ({ ...h, [field]: value }));
        if (field === 'sourceWarehouseId') {
            setConsumedLines(ls => ls.map(l => ({...l, shelfId: ''})));
        }
        if (field === 'destWarehouseId') {
            setProducedLines(ls => ls.map(l => ({...l, shelfId: ''})));
        }
    };

    const handleLineChange = (lineType: 'consumed' | 'produced', id: number | string, field: keyof Omit<Line, 'id'>, value: string) => {
        const setLines = lineType === 'consumed' ? setConsumedLines : setProducedLines;
        setLines(lines => lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line, [field]: value };
                if (field === 'productGroupId') {
                    updatedLine.productId = '';
                    updatedLine.shelfId = '';
                }
                 if (field === 'productId') {
                    updatedLine.shelfId = '';
                }
                return updatedLine;
            }
            return line;
        }));
    };

    const addLine = (lineType: 'consumed' | 'produced') => {
        const setLines = lineType === 'consumed' ? setConsumedLines : setProducedLines;
        setLines(lines => [...lines, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1', shelfId: '' }]);
    };
    
    const removeLine = (lineType: 'consumed' | 'produced', id: number | string) => {
        const lines = lineType === 'consumed' ? consumedLines : producedLines;
        const setLines = lineType === 'consumed' ? setConsumedLines : setProducedLines;
        if (lines.length > 1) {
            setLines(currentLines => currentLines.filter(l => l.id !== id));
        } else {
            addToast('En az bir satır olmalıdır.', 'info');
        }
    };

    const getProductSku = (productId: string) => findById(products, productId)?.sku || '';
    
    const getStockInfo = (productId: string, warehouseId: string, shelfId: string): string => {
        if (!showStock || !productId || !warehouseId) return '';
        
        const allShelvesInWarehouse = shelves.filter(s => s.warehouse_id === warehouseId);
        if (allShelvesInWarehouse.length > 0 && !shelfId) return '';
        
        const effectiveShelfId = shelfId === '' ? null : shelfId;
        const stockItem = stockItems.find(item => 
            item.product_id === productId && 
            item.warehouse_id === warehouseId && 
            item.shelf_id === effectiveShelfId
        );
        const product = findById(products, productId);
        const unit = findById(units, product?.unit_id);
        
        return `${formatNumber(stockItem?.quantity || 0)} ${unit?.abbreviation || ''}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let validationErrors: any = { header: {}, consumed: {}, produced: {} };
        let isValid = true;
        
        if (!header.sourceWarehouseId) { isValid = false; validationErrors.header.sourceWarehouseId = true; }
        if (!header.destWarehouseId) { isValid = false; validationErrors.header.destWarehouseId = true; }
        
        const validateLines = (lines: Line[], type: 'consumed' | 'produced', availableShelves: Shelf[]) => {
            lines.forEach(line => {
                const lineErrors: any = {};
                if (!line.productId) { isValid = false; lineErrors.productId = true; }
                if (parseFloat(line.quantity) <= 0 || isNaN(parseFloat(line.quantity))) { isValid = false; lineErrors.quantity = true; }
                if (availableShelves.length > 0 && !line.shelfId) {isValid = false; lineErrors.shelfId = true;}
                if (Object.keys(lineErrors).length > 0) validationErrors[type][line.id] = lineErrors;
            });
        };

        validateLines(consumedLines, 'consumed', availableSourceShelves);
        validateLines(producedLines, 'produced', availableDestShelves);

        setErrors(validationErrors);

        if (!isValid) {
            addToast('Lütfen tüm zorunlu alanları doğru şekilde doldurun.', 'error');
            return;
        }
        
        const apiHeader = {
            date: header.date,
            notes: header.notes,
            source_warehouse_id: header.sourceWarehouseId,
            dest_warehouse_id: header.destWarehouseId
        };

        const mapLinesForApi = (lines: Line[]) => lines.map(l => ({
            product_id: l.productId,
            quantity: parseFloat(l.quantity),
            shelf_id: l.shelfId || null
        }));

        let success = false;
        if (isEditMode) {
            success = await handleEditProductionVoucher(data.voucher_number!, apiHeader, mapLinesForApi(consumedLines), mapLinesForApi(producedLines));
        } else {
            success = await handleProcessProductionVoucher(apiHeader, mapLinesForApi(consumedLines), mapLinesForApi(producedLines));
        }

        if (success) onClose();
    };

    const handleDelete = () => {
        if (!isEditMode || !handleDeleteStockVoucher) return;
        setModal({
            type: 'CONFIRM_DELETE',
            data: {
                message: `"${voucherNumber}" numaralı üretim fişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
                onConfirm: () => {
                    handleDeleteStockVoucher(voucherNumber);
                    onClose();
                }
            }
        });
    };

    const handleAddNewProduct = (lineType: 'consumed' | 'produced') => {
        const currentModalType = isEditMode ? 'EDIT_PRODUCTION_VOUCHER' : 'ADD_PRODUCTION_VOUCHER';
    
        setModal({
            type: 'ADD_PRODUCT',
            data: {
                onSuccess: (newProduct: { id: string, group_id: string }) => {
                    const newLine = {
                        id: Date.now() + Math.random(),
                        productGroupId: newProduct.group_id,
                        productId: newProduct.id,
                        quantity: '1',
                        shelfId: ''
                    };
    
                    const restoredState = {
                        header: header,
                        consumed: lineType === 'consumed' ? [...consumedLines, newLine] : consumedLines,
                        produced: lineType === 'produced' ? [...producedLines, newLine] : producedLines
                    };
    
                    setModal({
                        type: currentModalType,
                        data: {
                            ...data,
                            restoredState: restoredState
                        }
                    });
                }
            }
        });
    };

    const LineRow: React.FC<{
        line: Line;
        lineType: 'consumed' | 'produced';
        onLineChange: (id: number | string, field: keyof Omit<Line, 'id'>, value: string) => void;
        onRemove: (id: number | string) => void;
        isRemovalDisabled: boolean;
        availableShelves: Shelf[];
    }> = ({ line, lineType, onLineChange, onRemove, isRemovalDisabled, availableShelves }) => {
        
        const shelvesForLine = (() => {
            if (lineType === 'produced') return availableShelves;
            
            // Tüketilen malzemeler için, sadece stoğu olan rafları göster
            if (!line.productId || !header.sourceWarehouseId) return [];
            
            const shelfIdsWithStock = stockItems
                .filter(si => si.product_id === line.productId && si.warehouse_id === header.sourceWarehouseId && si.quantity > 0 && si.shelf_id)
                .map(si => si.shelf_id);
            
            const shelvesWithStock = shelves.filter(shelf => shelf.warehouse_id === header.sourceWarehouseId && shelfIdsWithStock.includes(shelf.id));

            // Düzenleme modunda, stoğu bitmiş olsa bile önceden seçili rafı listeye ekle
            if (isEditMode && line.shelfId && !shelvesWithStock.some(s => s.id === line.shelfId)) {
                const savedShelf = findById(shelves, line.shelfId);
                if (savedShelf && savedShelf.warehouse_id === header.sourceWarehouseId) {
                    return Array.from(new Set([...shelvesWithStock, savedShelf]));
                }
            }
            
            return shelvesWithStock;
        })();

        return (
            <tr className="table-row border-t dark:border-slate-700">
                <td className="p-2 w-[20%]"><SearchableSelect options={productGroups} value={line.productGroupId} onChange={val => onLineChange(line.id, 'productGroupId', val)} placeholder="Grup Seçin" /></td>
                <td className="p-2 w-[15%]"><input type="text" value={getProductSku(line.productId)} className={`${formInputSmallClass} bg-slate-100 dark:bg-slate-700 font-mono`} readOnly /></td>
                <td className="p-2 w-[20%]"><SearchableSelect options={line.productGroupId ? products.filter(p => p.group_id === line.productGroupId) : []} value={line.productId} onChange={val => onLineChange(line.id, 'productId', val)} placeholder="Ürün Seçin" disabled={!line.productGroupId} error={errors[lineType]?.[line.id]?.productId} /></td>
                <td className="p-2 w-[15%]">
                     <SearchableSelect options={shelvesForLine} value={line.shelfId} onChange={val => onLineChange(line.id, 'shelfId', val)} placeholder={availableShelves.length > 0 ? "Raf Seçin" : "Raf Bulunmuyor"} disabled={availableShelves.length === 0} error={errors[lineType]?.[line.id]?.shelfId}/>
                </td>
                <td className="p-2 w-[10%] text-slate-600 dark:text-slate-400 font-medium text-right">{getStockInfo(line.productId, lineType === 'consumed' ? header.sourceWarehouseId : header.destWarehouseId, line.shelfId)}</td>
                <td className="p-2 w-[15%]">
                     <div className="flex items-center">
                        <input type="number" step="any" min="0.01" value={line.quantity} onChange={e => onLineChange(line.id, 'quantity', e.target.value)} className={`${formInputSmallClass} ${errors[lineType]?.[line.id]?.quantity ? 'border-red-500' : ''} w-full text-right`} />
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium pl-2 w-12 text-left">{getUnitAbbrForProduct(line.productId)}</span>
                    </div>
                </td>
                <td className="p-2 w-[5%] text-center"><button type="button" onClick={() => onRemove(line.id)} className="remove-line-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 disabled:text-slate-300 dark:disabled:text-slate-600" disabled={isRemovalDisabled}><TrashIcon /></button></td>
            </tr>
        );
    };

    return (
        <form id="production-voucher-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
                <fieldset id="voucher-header-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                    <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Fiş Başlık Bilgileri</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                        <div><label htmlFor="voucher-number" className={formLabelClass}>Fiş Numarası</label><input id="voucher-number" type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100 dark:bg-slate-700`} readOnly /></div>
                        <div><label htmlFor="voucher-date" className={formLabelClass}>Tarih</label><input id="voucher-date" type="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={formInputSmallClass} /></div>
                        <div className="md:col-span-3"><label htmlFor="voucher-notes" className={formLabelClass}>Notlar</label><input id="voucher-notes" type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} /></div>
                    </div>
                </fieldset>
                
                <div id="produced-products-section">
                     <h3 className="section-title text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Üretilen Ürünler (Girdi)</h3>
                     <fieldset className="border dark:border-slate-600 p-4 rounded-md">
                        <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Hedef Konum</legend>
                        <div className="pt-4"><label className={formLabelClass}>Giren Depo</label><SearchableSelect options={warehouses} value={header.destWarehouseId} onChange={val => handleHeaderChange('destWarehouseId', val)} placeholder="Depo Seçin" error={errors.header?.destWarehouseId}/></div>
                    </fieldset>
                    <div className="data-table-container border dark:border-slate-700 rounded-md mt-4 overflow-x-auto">
                        <table className="data-table w-full text-left text-sm min-w-[900px]">
                            <thead className="table-header bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Grubu</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Ürün Kodu</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Adı</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Raf</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-right">Mevcut Stok</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Miktar</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">{producedLines.map(line => (
                                <LineRow key={line.id} line={line} lineType="produced" onLineChange={(id, field, value) => handleLineChange('produced', id, field, value)} onRemove={(id) => removeLine('produced', id)} isRemovalDisabled={producedLines.length <= 1} availableShelves={availableDestShelves} />
                            ))}</tbody>
                        </table>
                    </div>
                     <div className="flex justify-end mt-2 gap-2">
                        <button id="add-new-produced-product-button" type="button" onClick={() => handleAddNewProduct('produced')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"><PlusIcon /> Yeni Ürün Ekle</button>
                        <button id="add-produced-line-button" type="button" onClick={() => addLine('produced')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"><PlusIcon /> Satır Ekle</button>
                    </div>
                </div>

                <div id="consumed-materials-section">
                     <h3 className="section-title text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Kullanılan Malzemeler (Gider)</h3>
                     <fieldset className="border dark:border-slate-600 p-4 rounded-md">
                        <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Kaynak Konum</legend>
                         <div className="pt-4"><label className={formLabelClass}>Çıkan Depo</label><SearchableSelect options={warehouses} value={header.sourceWarehouseId} onChange={val => handleHeaderChange('sourceWarehouseId', val)} placeholder="Depo Seçin" error={errors.header?.sourceWarehouseId}/></div>
                    </fieldset>
                    <div className="data-table-container border dark:border-slate-700 rounded-md mt-4 overflow-x-auto">
                        <table className="data-table w-full text-left text-sm min-w-[900px]">
                            <thead className="table-header bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Grubu</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Ürün Kodu</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Adı</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Raf</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-right">Mevcut Stok</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Miktar</th><th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">{consumedLines.map(line => (
                                <LineRow key={line.id} line={line} lineType="consumed" onLineChange={(id, field, value) => handleLineChange('consumed', id, field, value)} onRemove={(id) => removeLine('consumed', id)} isRemovalDisabled={consumedLines.length <= 1} availableShelves={availableSourceShelves} />
                            ))}</tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-2 gap-2">
                         <button id="toggle-stock-visibility-button" type="button" onClick={() => setShowStock(s => !s)} disabled={!header.sourceWarehouseId} className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"><i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showStock ? 'Stokları Gizle' : 'Mevcut Stokları Göster'}</button>
                         <button id="add-new-consumed-product-button" type="button" onClick={() => handleAddNewProduct('consumed')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"><PlusIcon /> Yeni Ürün Ekle</button>
                        <button id="add-consumed-line-button" type="button" onClick={() => addLine('consumed')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"><PlusIcon /> Satır Ekle</button>
                     </div>
                </div>
            </div>

             <div className="modal-actions flex justify-between items-center mt-6 pt-4 border-t dark:border-slate-700">
                <div>{isEdit && (<button id="delete-voucher-button" type="button" onClick={handleDelete} className="danger-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"><TrashIcon /> Sil</button>)}</div>
                <div className="flex gap-3">
                    <button id="cancel-voucher-button" type="button" onClick={onClose} className="secondary-action-button font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">İptal</button>
                    <button id="save-voucher-button" type="submit" className="primary-action-button font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">Kaydet</button>
                </div>
            </div>
        </form>
    );
};

export default ProductionVoucherFormModal;