import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, StockItem, Unit, ModalState, Product } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon, SaveIcon, CancelIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { formatNumber, findById } from '../../utils/helpers';

type Line = { id: number, productGroupId: string, productId: string, quantity: string, sourceShelfId: string, destShelfId: string };
type Header = { date: string, sourceWarehouseId: string, destWarehouseId: string, notes: string };

interface StockTransferFormModalProps extends ModalComponentProps<{ 
    voucher_number?: string,
    restoredState?: { header: Header, lines: Line[] }
}> {
    isEdit: boolean;
    setModal: (modal: ModalState) => void;
}


const StockTransferFormModal: React.FC<StockTransferFormModalProps> = ({ isEdit, data, onClose, getNextVoucherNumber, shelves, products, warehouses, productGroups, handleStockTransfer, handleEditStockTransfer, stockItems, units, stockMovements, setModal, handleDeleteStockVoucher }) => {
    const { addToast } = useToast();
    const isEditMode = !!(isEdit && data?.voucher_number);
    
    const [header, setHeader] = useState<Header>(() => {
        if (data?.restoredState) return data.restoredState.header;

        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number);
            const outMovement = movements.find(m => m.type === 'OUT');
            const inMovement = movements.find(m => m.type === 'IN');
            if (outMovement && inMovement) {
                return {
                    date: new Date(outMovement.date).toISOString().slice(0, 10),
                    sourceWarehouseId: outMovement.warehouse_id,
                    destWarehouseId: inMovement.warehouse_id,
                    notes: outMovement.notes || '',
                };
            }
        }
        return {
            date: new Date().toISOString().slice(0, 10),
            sourceWarehouseId: '',
            destWarehouseId: '',
            notes: '',
        };
    });

    const [lines, setLines] = useState<Line[]>(() => {
        if (data?.restoredState) return data.restoredState.lines;

        if (isEditMode) {
            const outMovements = stockMovements.filter(m => m.voucher_number === data.voucher_number && m.type === 'OUT');
            if (outMovements.length > 0) {
                return outMovements.map(outMov => {
                    const inMov = stockMovements.find(m => m.voucher_number === data.voucher_number && m.type === 'IN' && m.product_id === outMov.product_id);
                    const product = findById(products, outMov.product_id);
                    return {
                        id: Date.now() + Math.random(),
                        productGroupId: product?.group_id || '',
                        productId: outMov.product_id,
                        quantity: String(outMov.quantity),
                        sourceShelfId: outMov.shelf_id || '',
                        destShelfId: inMov?.shelf_id || '',
                    };
                });
            }
        }
        return [{ id: Date.now(), productGroupId: '', productId: '', quantity: '1', sourceShelfId: '', destShelfId: '' }];
    });
    
    type FormErrors = {
        header?: { date?: boolean, sourceWarehouseId?: boolean, destWarehouseId?: boolean },
        lines?: { [id: number]: { productGroupId?: boolean, productId?: boolean, quantity?: boolean, sourceShelfId?: boolean, destShelfId?: boolean } }
    };
    const [errors, setErrors] = useState<FormErrors>({});

    const [voucherNumber, setVoucherNumber] = useState('');
    const [availableSourceShelves, setAvailableSourceShelves] = useState<Shelf[]>([]);
    const [availableDestShelves, setAvailableDestShelves] = useState<Shelf[]>([]);
    const [showStock, setShowStock] = useState(false);
    
    const productOptionsWithSku = useMemo(() => products.map(p => ({
        id: p.id,
        name: `${p.name} (${p.sku})`
    })), [products]);

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
            } else if (getNextVoucherNumber) {
                const newVoucherNumber = await getNextVoucherNumber('TRANSFER');
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

    const handleHeaderChange = (field: keyof typeof header, value: string) => {
        setHeader(h => ({ ...h, [field]: value }));

        if (field === 'sourceWarehouseId') {
            setLines(ls => ls.map(l => ({...l, sourceShelfId: ''})));
        }
        if (field === 'destWarehouseId') {
            setLines(ls => ls.map(l => ({...l, destShelfId: ''})));
        }

         if (errors.header?.[field]) {
            setErrors(prev => ({ ...prev, header: { ...prev.header, [field]: false } }));
        }
    };

    const handleLineChange = (id: number, field: keyof Omit<Line, 'id'>, value: string) => {
        setLines(ls => ls.map(l => {
            if (l.id === id) {
                const updatedLine = { ...l, [field]: value };
                if (field === 'productGroupId') {
                    updatedLine.productId = '';
                    updatedLine.sourceShelfId = '';
                    updatedLine.destShelfId = '';
                }
                if (field === 'productId') {
                    updatedLine.sourceShelfId = '';
                }
                return updatedLine;
            }
            return l;
        }));
        if (errors.lines?.[id]?.[field]) {
            const newLinesError = { ...errors.lines[id], [field]: false };
            setErrors(prev => ({ ...prev, lines: { ...prev.lines, [id]: newLinesError } }));
        }
    };

    const addLine = () => setLines(ls => [...ls, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1', sourceShelfId: '', destShelfId: '' }]);
    const removeLine = (id: number) => {
        if (lines.length > 1) {
            setLines(ls => ls.filter(l => l.id !== id));
        } else {
            addToast('En az bir ürün satırı olmalıdır.', 'info');
        }
    };
    
    const getProductSku = (productId: string) => products.find(p => p.id === productId)?.sku || '';
    const getStockInfo = (productId: string, shelfId: string): string => {
        if (!showStock || !productId || !header.sourceWarehouseId || (availableSourceShelves.length > 0 && !shelfId)) return '';
        const effectiveShelfId = shelfId === '' ? null : shelfId;
        const stockItem = stockItems.find(item => 
            item.product_id === productId && 
            item.warehouse_id === header.sourceWarehouseId && 
            item.shelf_id === effectiveShelfId
        );
        const product = products.find(p => p.id === productId);
        const unit = units.find(u => u.id === product?.unit_id);
        return `${formatNumber(stockItem?.quantity || 0)} ${unit?.abbreviation || ''}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: FormErrors = { header: {}, lines: {} };
        if (!header.date) newErrors.header!.date = true;
        if (!header.sourceWarehouseId) newErrors.header!.sourceWarehouseId = true;
        if (!header.destWarehouseId) newErrors.header!.destWarehouseId = true;

        if (header.sourceWarehouseId && header.destWarehouseId && header.sourceWarehouseId === header.destWarehouseId) {
             const hasIdenticalLine = lines.some(l => l.sourceShelfId && l.destShelfId && l.sourceShelfId === l.destShelfId);
             if (hasIdenticalLine) {
                 addToast('Aynı depo içinde kaynak ve hedef raf aynı olamaz.', 'error');
                 return;
             }
        }

        lines.forEach(l => {
            const lineError: any = {};
            if (!l.productGroupId) lineError.productGroupId = true;
            if (!l.productId) lineError.productId = true;
            const quantityNumber = parseFloat(l.quantity);
            if (isNaN(quantityNumber) || quantityNumber <= 0) lineError.quantity = true;
            if (availableSourceShelves.length > 0 && !l.sourceShelfId) lineError.sourceShelfId = true;
            if (availableDestShelves.length > 0 && !l.destShelfId) lineError.destShelfId = true;
            if (Object.keys(lineError).length > 0) newErrors.lines![l.id] = lineError;
        });
        
        const validLines = lines.filter(l => l.productId && parseFloat(l.quantity) > 0);
        if (Object.values(newErrors.header!).some(v => v) || Object.keys(newErrors.lines!).length > 0 || validLines.length === 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doğru şekilde doldurun ve geçerli değerler girin.', 'error');
            return;
        }

        const headerData = { 
            date: header.date,
            source_warehouse_id: header.sourceWarehouseId,
            dest_warehouse_id: header.destWarehouseId,
            notes: header.notes
        };
        const linesData = validLines.map(l => ({ 
            product_id: l.productId, 
            quantity: parseFloat(l.quantity),
            source_shelf_id: l.sourceShelfId || null,
            dest_shelf_id: l.destShelfId || null,
        }));

        let success = false;
        if (isEditMode) {
             success = await handleEditStockTransfer(data.voucher_number!, headerData, linesData);
        } else {
             success = await handleStockTransfer(headerData, linesData);
        }
        
        if (success) onClose();
    };

    const handleDelete = () => {
        if (!isEditMode || !handleDeleteStockVoucher) return;
        setModal({
            type: 'CONFIRM_DELETE',
            data: {
                message: `"${voucherNumber}" numaralı fişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
                onConfirm: () => {
                    handleDeleteStockVoucher(voucherNumber);
                    onClose();
                }
            }
        });
    };
    
    const handleAddNewProduct = () => {
        const currentModalType = isEditMode ? 'EDIT_STOCK_TRANSFER' : 'STOCK_TRANSFER';
    
        setModal({
            type: 'ADD_PRODUCT',
            data: {
                onSuccess: (newProduct: { id: string, group_id: string }) => {
                    const newLines = [
                        ...lines,
                        {
                            id: Date.now() + Math.random(),
                            productGroupId: newProduct.group_id,
                            productId: newProduct.id,
                            quantity: '1',
                            sourceShelfId: '',
                            destShelfId: ''
                        }
                    ];
    
                    setModal({
                        type: currentModalType,
                        data: {
                            ...data,
                            restoredState: {
                                header: header,
                                lines: newLines
                            }
                        }
                    });
                }
            }
        });
    };

    return (
        <form id="stock-transfer-form" onSubmit={handleSubmit} className="space-y-4">
            <fieldset id="voucher-header-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Fiş Başlık Bilgileri</legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                    <div><label htmlFor="voucher-number" className={formLabelClass}>Fiş Numarası</label><input id="voucher-number" type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100 dark:bg-slate-700`} readOnly /></div>
                    <div><label htmlFor="voucher-date" className={formLabelClass}>Tarih</label><input id="voucher-date" type="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={`${formInputSmallClass} ${errors.header?.date ? 'border-red-500' : ''}`} /></div>
                     <div className="md:col-span-3"><label htmlFor="voucher-notes" className={formLabelClass}>Notlar</label><input id="voucher-notes" type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} /></div>
                </div>
            </fieldset>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fieldset id="source-location-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                    <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Kaynak Depo</legend>
                    <div className="pt-4">
                        <label htmlFor="source-warehouse" className={formLabelClass}>Çıkan Depo</label>
                        <SearchableSelect options={warehouses} value={header.sourceWarehouseId} onChange={val => handleHeaderChange('sourceWarehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.sourceWarehouseId}/>
                    </div>
                </fieldset>
                 <fieldset id="destination-location-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                    <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Hedef Depo</legend>
                    <div className="pt-4">
                        <label htmlFor="dest-warehouse" className={formLabelClass}>Giren Depo</label>
                        <SearchableSelect options={warehouses} value={header.destWarehouseId} onChange={val => handleHeaderChange('destWarehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.destWarehouseId}/>
                    </div>
                </fieldset>
            </div>

            <div id="voucher-details-section">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="section-title text-md font-medium text-slate-700 dark:text-slate-300">Fiş Detayları</h3>
                     <button id="toggle-stock-visibility-button" type="button" onClick={() => setShowStock(s => !s)} disabled={!header.sourceWarehouseId} className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"><i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showStock ? 'Stokları Gizle' : 'Kaynak Stokları Göster'}</button>
                </div>
                <div className="data-table-container border dark:border-slate-700 rounded-md overflow-x-auto">
                    <table id="transfer-lines-table" className="data-table w-full text-left text-sm min-w-[1100px]">
                        <thead className="table-header bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[18%]">Ürün Grubu</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[12%]">Ürün Kodu</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[16%]">Ürün Adı</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[12%]">Kaynak Raf</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[12%]">Hedef Raf</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[10%]">Kaynak Stok</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[12%]">Miktar</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {lines.map((line) => {
                                const availableProductsForLine = useMemo(() => {
                                    if (!line.productGroupId) return [];
                                    const productIdsInGroup = new Set(products.filter(p => p.group_id === line.productGroupId).map(p => p.id));
                                    return productOptionsWithSku.filter(p => productIdsInGroup.has(p.id));
                                }, [line.productGroupId, productOptionsWithSku, products]);

                                 const sourceShelvesForLine = (() => {
                                    if (!line.productId || !header.sourceWarehouseId) return [];
                                    const shelfIdsWithStock = stockItems
                                        .filter(si => si.product_id === line.productId && si.warehouse_id === header.sourceWarehouseId && si.quantity > 0 && si.shelf_id)
                                        .map(si => si.shelf_id);
                                    
                                    const shelvesWithStock = shelves.filter(shelf => shelf.warehouse_id === header.sourceWarehouseId && shelfIdsWithStock.includes(shelf.id));

                                    if (isEditMode && line.sourceShelfId && !shelvesWithStock.some(s => s.id === line.sourceShelfId)) {
                                        const savedShelf = findById(shelves, line.sourceShelfId);
                                        if (savedShelf && savedShelf.warehouse_id === header.sourceWarehouseId) {
                                             return Array.from(new Set([...shelvesWithStock, savedShelf]));
                                        }
                                    }
                                    return shelvesWithStock;
                                })();

                                return (
                                <tr key={line.id} className="table-row border-t dark:border-slate-700">
                                    <td className="p-2"><SearchableSelect options={productGroups} value={line.productGroupId} onChange={val => handleLineChange(line.id, 'productGroupId', val)} placeholder="Grup Seçin" error={!!errors.lines?.[line.id]?.productGroupId} /></td>
                                    <td className="p-2 align-middle font-mono text-slate-600 dark:text-slate-400">{getProductSku(line.productId)}</td>
                                    <td className="p-2"><SearchableSelect options={availableProductsForLine} value={line.productId} onChange={val => handleLineChange(line.id, 'productId', val)} placeholder="Ürün Seçin" disabled={!line.productGroupId} error={!!errors.lines?.[line.id]?.productId} /></td>
                                    <td className="p-2">
                                         <SearchableSelect options={sourceShelvesForLine} value={line.sourceShelfId} onChange={val => handleLineChange(line.id, 'sourceShelfId', val)} placeholder={availableSourceShelves.length > 0 ? "Raf Seçin" : "Raf Bulunmuyor"} disabled={availableSourceShelves.length === 0} error={!!errors.lines?.[line.id]?.sourceShelfId}/>
                                    </td>
                                     <td className="p-2">
                                         <SearchableSelect options={availableDestShelves} value={line.destShelfId} onChange={val => handleLineChange(line.id, 'destShelfId', val)} placeholder={availableDestShelves.length > 0 ? "Raf Seçin" : "Raf Bulunmuyor"} disabled={availableDestShelves.length === 0} error={!!errors.lines?.[line.id]?.destShelfId}/>
                                    </td>
                                    <td className="p-2 align-middle text-slate-600 dark:text-slate-400 font-medium">{getStockInfo(line.productId, line.sourceShelfId)}</td>
                                    <td className="p-2">
                                        <div className="flex items-center">
                                            <input type="number" step="any" min="0.0001" value={line.quantity} onChange={e => handleLineChange(line.id, 'quantity', e.target.value)} className={`${formInputSmallClass} ${errors.lines?.[line.id]?.quantity ? 'border-red-500' : ''} w-full text-right`} />
                                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium pl-2 w-12 text-left">{getUnitAbbrForProduct(line.productId)}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center"><button type="button" onClick={() => removeLine(line.id)} className="remove-line-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 disabled:text-slate-300 dark:disabled:text-slate-600" disabled={lines.length <= 1}><TrashIcon /></button></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-2 gap-2">
                    <button id="add-new-product-button" type="button" onClick={handleAddNewProduct} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"><PlusIcon /> Yeni Ürün Ekle</button>
                    <button id="add-line-button" type="button" onClick={addLine} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"><PlusIcon /> Satır Ekle</button>
                </div>
            </div>

            <div className="modal-actions flex justify-between items-center mt-6 pt-4 border-t dark:border-slate-700">
                <div>{isEdit && (<button id="delete-voucher-button" type="button" onClick={handleDelete} className="danger-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"><TrashIcon /> Sil</button>)}</div>
                <div className="flex gap-3">
                    <button id="cancel-voucher-button" type="button" onClick={onClose} className="secondary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">
                    <CancelIcon />
                    İptal</button>
                    <button id="save-voucher-button" type="submit" className="primary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                    <SaveIcon />
                    Kaydet</button>
                </div>
            </div>
        </form>
    );
};

export default StockTransferFormModal;