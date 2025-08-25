
import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, StockItem, Unit, ModalState } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { formatNumber } from '../../utils/helpers';

type Line = { id: number, productGroupId: string, productId: string, quantity: string };
type Header = { date: string, sourceWarehouseId: string, sourceShelfId: string, destWarehouseId: string, destShelfId: string, notes: string };

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
                    sourceShelfId: outMovement.shelf_id || '',
                    destWarehouseId: inMovement.warehouse_id,
                    destShelfId: inMovement.shelf_id || '',
                    notes: outMovement.notes || '',
                };
            }
        }
        return {
            date: new Date().toISOString().slice(0, 10),
            sourceWarehouseId: '', sourceShelfId: '',
            destWarehouseId: '', destShelfId: '',
            notes: '',
        };
    });

    const [lines, setLines] = useState<Line[]>(() => {
        if (data?.restoredState) return data.restoredState.lines;

        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number && m.type === 'OUT');
            if (movements.length > 0) {
                return movements.map(m => {
                    const product = products.find(p => p.id === m.product_id);
                    return {
                        id: Date.now() + Math.random(),
                        productGroupId: product?.group_id || '',
                        productId: m.product_id,
                        quantity: String(m.quantity)
                    };
                });
            }
        }
        return [{ id: Date.now(), productGroupId: '', productId: '', quantity: '1' }];
    });
    
    type FormErrors = {
        header?: { date?: boolean, sourceWarehouseId?: boolean, sourceShelfId?: boolean, destWarehouseId?: boolean, destShelfId?: boolean },
        lines?: { [id: number]: { productGroupId?: boolean, productId?: boolean, quantity?: boolean } }
    };
    const [errors, setErrors] = useState<FormErrors>({});

    const [voucherNumber, setVoucherNumber] = useState('');
    const [availableSourceShelves, setAvailableSourceShelves] = useState<Shelf[]>([]);
    const [availableDestShelves, setAvailableDestShelves] = useState<Shelf[]>([]);
    const [showStock, setShowStock] = useState(false);
    
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
        if (header.sourceWarehouseId) {
            const currentShelf = shelves.find(s => s.id === header.sourceShelfId);
            if (currentShelf && currentShelf.warehouse_id !== header.sourceWarehouseId) {
                setHeader(h => ({ ...h, sourceShelfId: '' }));
            }
        } else {
            setHeader(h => ({ ...h, sourceShelfId: '' }));
        }
    }, [header.sourceWarehouseId, shelves]);
    
    useEffect(() => {
        const shelvesForWarehouse = header.destWarehouseId ? shelves.filter(s => s.warehouse_id === header.destWarehouseId) : [];
        setAvailableDestShelves(shelvesForWarehouse);
        if (header.destWarehouseId) {
            const currentShelf = shelves.find(s => s.id === header.destShelfId);
            if (currentShelf && currentShelf.warehouse_id !== header.destWarehouseId) {
                setHeader(h => ({ ...h, destShelfId: '' }));
            }
        } else {
             setHeader(h => ({ ...h, destShelfId: '' }));
        }
    }, [header.destWarehouseId, shelves]);

    const handleHeaderChange = (field: keyof typeof header, value: string) => {
        setHeader(h => ({ ...h, [field]: value }));
         if (errors.header?.[field]) {
            setErrors(prev => ({ ...prev, header: { ...prev.header, [field]: false } }));
        }
    };

    const handleLineChange = (id: number, field: 'productGroupId' | 'productId' | 'quantity', value: string) => {
        setLines(ls => ls.map(l => {
            if (l.id === id) {
                const updatedLine = { ...l, [field]: value };
                if (field === 'productGroupId') updatedLine.productId = '';
                return updatedLine;
            }
            return l;
        }));
        if (errors.lines?.[id]?.[field]) {
            const newLinesError = { ...errors.lines[id], [field]: false };
            setErrors(prev => ({ ...prev, lines: { ...prev.lines, [id]: newLinesError } }));
        }
    };

    const addLine = () => setLines(ls => [...ls, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1' }]);
    const removeLine = (id: number) => {
        if (lines.length > 1) {
            setLines(ls => ls.filter(l => l.id !== id));
        } else {
            addToast('En az bir ürün satırı olmalıdır.', 'info');
        }
    };
    
    const getProductSku = (productId: string) => products.find(p => p.id === productId)?.sku || '';
    const getStockInfo = (productId: string): string => {
        if (!showStock || !productId || !header.sourceWarehouseId || (availableSourceShelves.length > 0 && !header.sourceShelfId)) return '';
        const effectiveShelfId = header.sourceShelfId === '' ? null : header.sourceShelfId;
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
        if (availableSourceShelves.length > 0 && !header.sourceShelfId) {
            newErrors.header!.sourceShelfId = true;
        }
        if (!header.destWarehouseId) newErrors.header!.destWarehouseId = true;
        if (availableDestShelves.length > 0 && !header.destShelfId) {
            newErrors.header!.destShelfId = true;
        }

        if (header.sourceWarehouseId && header.destWarehouseId &&
            header.sourceWarehouseId === header.destWarehouseId &&
            header.sourceShelfId === header.destShelfId) {
            addToast('Kaynak ve hedef konum tamamen aynı olamaz.', 'error');
            newErrors.header!.sourceWarehouseId = true;
            newErrors.header!.sourceShelfId = true;
            newErrors.header!.destWarehouseId = true;
            newErrors.header!.destShelfId = true;
        }

        lines.forEach(l => {
            const lineError: { productGroupId?: boolean, productId?: boolean, quantity?: boolean } = {};
            if (!l.productGroupId) lineError.productGroupId = true;
            if (!l.productId) lineError.productId = true;
            const quantityNumber = parseFloat(l.quantity);
            if (isNaN(quantityNumber) || quantityNumber <= 0) lineError.quantity = true;
            if (Object.keys(lineError).length > 0) newErrors.lines![l.id] = lineError;
        });
        
        const validLines = lines.filter(l => l.productId && parseFloat(l.quantity) > 0);
        if (Object.values(newErrors.header!).some(v => v) || Object.keys(newErrors.lines!).length > 0 || validLines.length === 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun ve geçerli değerler girin.', 'error');
            return;
        }

        const headerData = { 
            date: header.date,
            source_warehouse_id: header.sourceWarehouseId,
            source_shelf_id: header.sourceShelfId || null,
            dest_warehouse_id: header.destWarehouseId,
            dest_shelf_id: header.destShelfId || null,
            notes: header.notes
        };
        const linesData = validLines.map(l => ({ product_id: l.productId, quantity: parseFloat(l.quantity) }));

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
        setModal({
            type: 'ADD_PRODUCT',
            data: {
                onSuccess: (newProduct: { id: string, group_id: string }) => {
                     const newLine = { id: Date.now(), productGroupId: newProduct.group_id, productId: newProduct.id, quantity: '1' };
                     setModal({
                        type: isEditMode ? 'EDIT_STOCK_TRANSFER' : 'STOCK_TRANSFER',
                        data: {
                            ...data,
                            restoredState: {
                                header: header,
                                lines: [...lines, newLine]
                            }
                        }
                    });
                }
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="border p-4 rounded-md">
                <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Fiş Başlık Bilgileri</legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                    <div>
                        <label className={formLabelClass}>Fiş Numarası</label>
                        <input type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100`} readOnly />
                    </div>
                    <div>
                        <label htmlFor="date" className={formLabelClass}>Tarih</label>
                        <input type="date" id="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={`${formInputSmallClass} ${errors.header?.date ? 'border-red-500' : ''}`} />
                    </div>
                     <div className="md:col-span-3">
                        <label className={formLabelClass}>Notlar</label>
                        <input type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} />
                    </div>
                </div>
            </fieldset>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Kaynak Konum</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                            <label className={formLabelClass}>Çıkan Depo</label>
                            <SearchableSelect options={warehouses} value={header.sourceWarehouseId} onChange={val => handleHeaderChange('sourceWarehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.sourceWarehouseId}/>
                        </div>
                        <div>
                            <label className={formLabelClass}>Çıkan Raf</label>
                            <SearchableSelect 
                                options={availableSourceShelves} 
                                value={header.sourceShelfId} 
                                onChange={val => handleHeaderChange('sourceShelfId', val)} 
                                placeholder={!header.sourceWarehouseId ? "Önce Depo Seçin" : availableSourceShelves.length === 0 ? "Raf bulunmuyor" : "Raf Seçin"}
                                disabled={!header.sourceWarehouseId || availableSourceShelves.length === 0} 
                                error={!!errors.header?.sourceShelfId} 
                            />
                        </div>
                    </div>
                </fieldset>
                 <fieldset className="border p-4 rounded-md">
                    <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Hedef Konum</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                            <label className={formLabelClass}>Giren Depo</label>
                            <SearchableSelect options={warehouses} value={header.destWarehouseId} onChange={val => handleHeaderChange('destWarehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.destWarehouseId}/>
                        </div>
                        <div>
                            <label className={formLabelClass}>Giren Raf</label>
                             <SearchableSelect 
                                options={availableDestShelves} 
                                value={header.destShelfId} 
                                onChange={val => handleHeaderChange('destShelfId', val)} 
                                placeholder={!header.destWarehouseId ? "Önce Depo Seçin" : availableDestShelves.length === 0 ? "Raf bulunmuyor" : "Raf Seçin"}
                                disabled={!header.destWarehouseId || availableDestShelves.length === 0} 
                                error={!!errors.header?.destShelfId} 
                            />
                        </div>
                    </div>
                </fieldset>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium text-slate-700">Fiş Detayları</h3>
                     <button type="button" onClick={() => setShowStock(s => !s)} disabled={!header.sourceWarehouseId} className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                        <i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showStock ? 'Stokları Gizle' : 'Kaynak Stokları Göster'}
                    </button>
                </div>
                <div className="border rounded-md">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-2 font-semibold text-slate-600 w-[25%]">Ürün Grubu</th>
                                <th className="p-2 font-semibold text-slate-600 w-[15%]">Ürün Kodu</th>
                                <th className="p-2 font-semibold text-slate-600 w-[30%]">Ürün Adı</th>
                                <th className="p-2 font-semibold text-slate-600 w-[15%]">Kaynak Stok</th>
                                <th className="p-2 font-semibold text-slate-600 w-[10%]">Miktar</th>
                                <th className="p-2 font-semibold text-slate-600 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line) => (
                                <tr key={line.id} className="border-t">
                                    <td className="p-2 align-middle">
                                        <SearchableSelect options={productGroups} value={line.productGroupId} onChange={val => handleLineChange(line.id, 'productGroupId', val)} placeholder="Grup Seçin" error={!!errors.lines?.[line.id]?.productGroupId} />
                                    </td>
                                    <td className="p-2 align-middle"><input type="text" value={getProductSku(line.productId)} className={`${formInputSmallClass} bg-slate-100 font-mono`} readOnly /></td>
                                    <td className="p-2 align-middle">
                                        <SearchableSelect options={line.productGroupId ? products.filter(p => p.group_id === line.productGroupId) : []} value={line.productId} onChange={val => handleLineChange(line.id, 'productId', val)} placeholder="Ürün Seçin" disabled={!line.productGroupId} error={!!errors.lines?.[line.id]?.productId} />
                                    </td>
                                    <td className="p-2 align-middle text-slate-600 font-medium">{getStockInfo(line.productId)}</td>
                                    <td className="p-2 align-middle">
                                        <input 
                                            type="number" 
                                            step="any"
                                            min="0.0001" 
                                            value={line.quantity} 
                                            onChange={e => handleLineChange(line.id, 'quantity', e.target.value)} 
                                            className={`${formInputSmallClass} ${errors.lines?.[line.id]?.quantity ? 'border-red-500' : ''}`}
                                        />
                                    </td>
                                    <td className="p-2 text-center align-middle">
                                        <button type="button" onClick={() => removeLine(line.id)} className="text-red-600 hover:text-red-800 disabled:text-slate-300" disabled={lines.length <= 1}><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-2 gap-2">
                    <button type="button" onClick={handleAddNewProduct} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300">
                        <PlusIcon /> Yeni Ürün Ekle
                    </button>
                    <button type="button" onClick={addLine} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                        <PlusIcon /> Satır Ekle
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div>{isEdit && (<button type="button" onClick={handleDelete} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700"><TrashIcon /> Sil</button>)}</div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">İptal</button>
                    <button type="submit" className="font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</button>
                </div>
            </div>
        </form>
    );
};

export default StockTransferFormModal;
