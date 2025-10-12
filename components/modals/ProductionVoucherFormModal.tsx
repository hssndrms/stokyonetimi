import React, { useState, useEffect } from 'react';
import { Shelf, ModalState, Unit, StockItem, Product, Warehouse, ProductGroup } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { formatNumber } from '../../utils/helpers';

type Line = { 
    id: number | string, 
    productGroupId: string, 
    productId: string, 
    quantity: string 
};
type Header = { 
    date: string, 
    notes: string,
    sourceWarehouseId: string,
    sourceShelfId: string,
    destWarehouseId: string,
    destShelfId: string
};

interface ProductionVoucherFormModalProps extends ModalComponentProps<{ voucher_number?: string }> {
    isEdit: boolean;
    setModal: (modal: ModalState) => void;
}

// LineRow component is moved outside of the main component to prevent re-creation on every render,
// which solves the input focus loss issue.
const LineRow: React.FC<{
    line: Line;
    lineType: 'consumed' | 'produced';
    onLineChange: (id: number | string, field: keyof Omit<Line, 'id'>, value: string) => void;
    onRemove: (id: number | string) => void;
    isRemovalDisabled: boolean;
    productGroups: ProductGroup[];
    products: Product[];
    getProductSku: (productId: string) => string;
    stockInfo: string;
    errors: any;
}> = ({
    line,
    lineType,
    onLineChange,
    onRemove,
    isRemovalDisabled,
    productGroups,
    products,
    getProductSku,
    stockInfo,
    errors
}) => {
    const sku = getProductSku(line.productId);
    
    return (
        <tr className="border-t">
            <td className="p-2 w-[25%]">
                <SearchableSelect 
                    options={productGroups} 
                    value={line.productGroupId} 
                    onChange={val => onLineChange(line.id, 'productGroupId', val)} 
                    placeholder="Grup Seçin" 
                />
            </td>
            <td className="p-2 w-[15%]"><input type="text" value={sku} className={`${formInputSmallClass} bg-slate-100 font-mono`} readOnly /></td>
            <td className="p-2 w-[30%]">
                <SearchableSelect 
                    options={line.productGroupId ? products.filter(p => p.group_id === line.productGroupId) : []} 
                    value={line.productId} 
                    onChange={val => onLineChange(line.id, 'productId', val)} 
                    placeholder="Ürün Seçin" 
                    disabled={!line.productGroupId} 
                    error={errors[lineType]?.[line.id]?.productId} 
                />
            </td>
            <td className="p-2 w-[15%] text-slate-600 font-medium text-right">{stockInfo}</td>
            <td className="p-2 w-[10%]">
                <input 
                    type="number" 
                    step="any" 
                    min="0.01" 
                    value={line.quantity} 
                    onChange={e => onLineChange(line.id, 'quantity', e.target.value)} 
                    className={`${formInputSmallClass} ${errors[lineType]?.[line.id]?.quantity ? 'border-red-500' : ''}`} 
                />
            </td>
            <td className="p-2 w-[5%] text-center">
                <button 
                    type="button" 
                    onClick={() => onRemove(line.id)} 
                    className="text-red-600 hover:text-red-800 disabled:text-slate-300" 
                    disabled={isRemovalDisabled}
                >
                    <TrashIcon />
                </button>
            </td>
        </tr>
    );
};


const ProductionVoucherFormModal: React.FC<ProductionVoucherFormModalProps> = ({ 
    isEdit, data, onClose, getNextVoucherNumber, shelves, products, warehouses, 
    productGroups, handleProcessProductionVoucher, handleEditProductionVoucher, stockMovements, 
    setModal, handleDeleteStockVoucher, stockItems, units
}) => {
    const { addToast } = useToast();
    const isEditMode = !!(isEdit && data?.voucher_number);

    const initializeState = () => {
        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number);
            if (movements.length > 0) {
                const outMovement = movements.find(m => m.type === 'OUT');
                const inMovement = movements.find(m => m.type === 'IN');
                
                const headerData: Header = {
                    date: new Date(movements[0].date).toISOString().slice(0, 10),
                    notes: movements[0].notes || '',
                    sourceWarehouseId: outMovement?.warehouse_id || '',
                    sourceShelfId: outMovement?.shelf_id || '',
                    destWarehouseId: inMovement?.warehouse_id || '',
                    destShelfId: inMovement?.shelf_id || ''
                };

                const mapMovementsToLines = (type: 'IN' | 'OUT'): Line[] => {
                    const filteredMovements = movements.filter(m => m.type === type);
                    if (filteredMovements.length === 0) return [{ id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1' }];
                    return filteredMovements.map(m => {
                        const product = products.find(p => p.id === m.product_id);
                        return {
                            id: m.id, // Use stable movement ID as key
                            productGroupId: product?.group_id || '',
                            productId: m.product_id,
                            quantity: String(m.quantity)
                        };
                    });
                };

                const consumed = mapMovementsToLines('OUT');
                const produced = mapMovementsToLines('IN');
                
                return { header: headerData, consumed, produced };
            }
        }
        // Default state for new voucher
        return {
            header: {
                date: new Date().toISOString().slice(0, 10),
                notes: '',
                sourceWarehouseId: '', sourceShelfId: '',
                destWarehouseId: '', destShelfId: '',
            },
            consumed: [{ id: Date.now(), productGroupId: '', productId: '', quantity: '1' }],
            produced: [{ id: Date.now() + 1, productGroupId: '', productId: '', quantity: '1' }],
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
        // If the currently selected shelf doesn't belong to the new warehouse, reset it
        if (header.sourceShelfId && !shelvesForWarehouse.some(s => s.id === header.sourceShelfId)) {
            setHeader(h => ({ ...h, sourceShelfId: '' }));
        }
    }, [header.sourceWarehouseId, shelves]);

    useEffect(() => {
        const shelvesForWarehouse = header.destWarehouseId ? shelves.filter(s => s.warehouse_id === header.destWarehouseId) : [];
        setAvailableDestShelves(shelvesForWarehouse);
        // If the currently selected shelf doesn't belong to the new warehouse, reset it
        if (header.destShelfId && !shelvesForWarehouse.some(s => s.id === header.destShelfId)) {
            setHeader(h => ({ ...h, destShelfId: '' }));
        }
    }, [header.destWarehouseId, shelves]);

    const handleHeaderChange = (field: keyof Header, value: string) => setHeader(h => ({ ...h, [field]: value }));

    const handleLineChange = (lineType: 'consumed' | 'produced', id: number | string, field: keyof Omit<Line, 'id'>, value: string) => {
        const setLines = lineType === 'consumed' ? setConsumedLines : setProducedLines;
        setLines(lines => lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line, [field]: value };
                if (field === 'productGroupId') updatedLine.productId = '';
                return updatedLine;
            }
            return line;
        }));
    };

    const addLine = (lineType: 'consumed' | 'produced') => {
        const setLines = lineType === 'consumed' ? setConsumedLines : setProducedLines;
        setLines(lines => [...lines, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1' }]);
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

    const getProductSku = (productId: string) => products.find(p => p.id === productId)?.sku || '';
    
    const getStockInfo = (productId: string, warehouseId: string, shelfId: string): string => {
        if (!showStock || !productId || !warehouseId) return '';
        const effectiveShelfId = shelfId === '' ? null : shelfId;
        const stockItem = stockItems.find(item => 
            item.product_id === productId && 
            item.warehouse_id === warehouseId && 
            item.shelf_id === effectiveShelfId
        );
        const product = products.find(p => p.id === productId);
        const unit = units.find(u => u.id === product?.unit_id);
        
        return `${formatNumber(stockItem?.quantity || 0)} ${unit?.abbreviation || ''}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let validationErrors: any = { header: {}, consumed: {}, produced: {} };
        let isValid = true;
        
        if (!header.sourceWarehouseId) { isValid = false; validationErrors.header.sourceWarehouseId = true; }
        if (availableSourceShelves.length > 0 && !header.sourceShelfId) { isValid = false; validationErrors.header.sourceShelfId = true; }
        if (!header.destWarehouseId) { isValid = false; validationErrors.header.destWarehouseId = true; }
        if (availableDestShelves.length > 0 && !header.destShelfId) { isValid = false; validationErrors.header.destShelfId = true; }
        
        const validateLines = (lines: Line[], type: 'consumed' | 'produced') => {
            lines.forEach(line => {
                const lineErrors: any = {};
                if (!line.productId) { isValid = false; lineErrors.productId = true; }
                if (parseFloat(line.quantity) <= 0 || isNaN(parseFloat(line.quantity))) { isValid = false; lineErrors.quantity = true; }
                if (Object.keys(lineErrors).length > 0) validationErrors[type][line.id] = lineErrors;
            });
        };

        validateLines(consumedLines, 'consumed');
        validateLines(producedLines, 'produced');

        setErrors(validationErrors);

        if (!isValid) {
            addToast('Lütfen tüm zorunlu alanları doğru şekilde doldurun.', 'error');
            return;
        }
        
        const apiHeader = {
            date: header.date,
            notes: header.notes,
            source_warehouse_id: header.sourceWarehouseId,
            source_shelf_id: header.sourceShelfId || null,
            dest_warehouse_id: header.destWarehouseId,
            dest_shelf_id: header.destShelfId || null
        };

        const mapLinesForApi = (lines: Line[]) => lines.map(l => ({
            product_id: l.productId,
            quantity: parseFloat(l.quantity)
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

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Fiş Başlık Bilgileri</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                        <div><label className={formLabelClass}>Fiş Numarası</label><input type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100`} readOnly /></div>
                        <div><label className={formLabelClass}>Tarih</label><input type="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={formInputSmallClass} /></div>
                        <div className="md:col-span-3"><label className={formLabelClass}>Notlar</label><input type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} /></div>
                    </div>
                </fieldset>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <fieldset className="border p-4 rounded-md">
                        <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Kaynak Konum</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div>
                                <label className={formLabelClass}>Çıkan Depo</label>
                                <SearchableSelect options={warehouses} value={header.sourceWarehouseId} onChange={val => handleHeaderChange('sourceWarehouseId', val)} placeholder="Depo Seçin" error={errors.header?.sourceWarehouseId}/>
                            </div>
                            <div>
                                <label className={formLabelClass}>Çıkan Raf</label>
                                <SearchableSelect options={availableSourceShelves} value={header.sourceShelfId} onChange={val => handleHeaderChange('sourceShelfId', val)} placeholder={!header.sourceWarehouseId ? "Önce Depo Seçin" : availableSourceShelves.length === 0 ? "Raf bulunmuyor" : "Raf Seçin"} disabled={!header.sourceWarehouseId || availableSourceShelves.length === 0} error={errors.header?.sourceShelfId} />
                            </div>
                        </div>
                    </fieldset>
                     <fieldset className="border p-4 rounded-md">
                        <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Hedef Konum</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                           <div>
                                <label className={formLabelClass}>Giren Depo</label>
                                <SearchableSelect options={warehouses} value={header.destWarehouseId} onChange={val => handleHeaderChange('destWarehouseId', val)} placeholder="Depo Seçin" error={errors.header?.destWarehouseId}/>
                            </div>
                            <div>
                                <label className={formLabelClass}>Giren Raf</label>
                                <SearchableSelect options={availableDestShelves} value={header.destShelfId} onChange={val => handleHeaderChange('destShelfId', val)} placeholder={!header.destWarehouseId ? "Önce Depo Seçin" : availableDestShelves.length === 0 ? "Raf bulunmuyor" : "Raf Seçin"} disabled={!header.destWarehouseId || availableDestShelves.length === 0} error={errors.header?.destShelfId} />
                            </div>
                        </div>
                    </fieldset>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-lg font-bold text-slate-800">Kullanılan Malzemeler (Gider)</h3>
                         <div className="flex items-center gap-4">
                             <button type="button" onClick={() => setShowStock(s => !s)} disabled={!header.sourceWarehouseId} className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                                <i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showStock ? 'Stokları Gizle' : 'Mevcut Stokları Göster'}
                            </button>
                            <button type="button" onClick={() => addLine('consumed')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300"><PlusIcon /> Satır Ekle</button>
                         </div>
                    </div>
                    <div className="border rounded-md">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-2 font-semibold text-slate-600 w-[25%]">Ürün Grubu</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[15%]">Ürün Kodu</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[30%]">Ürün Adı</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[15%] text-right">Mevcut Stok</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[10%]">Miktar</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody>{consumedLines.map(line => {
                                const warehouseId = header.sourceWarehouseId;
                                const shelfId = header.sourceShelfId;
                                const stock = getStockInfo(line.productId, warehouseId, shelfId);
                                return (
                                    <LineRow
                                        key={line.id}
                                        line={line}
                                        lineType="consumed"
                                        onLineChange={(id, field, value) => handleLineChange('consumed', id, field, value)}
                                        onRemove={(id) => removeLine('consumed', id)}
                                        isRemovalDisabled={consumedLines.length <= 1}
                                        productGroups={productGroups}
                                        products={products}
                                        getProductSku={getProductSku}
                                        stockInfo={stock}
                                        errors={errors}
                                    />
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>

                 <div>
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="text-lg font-bold text-slate-800">Üretilen Ürünler (Girdi)</h3>
                         <button type="button" onClick={() => addLine('produced')} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300"><PlusIcon /> Satır Ekle</button>
                    </div>
                    <div className="border rounded-md">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-2 font-semibold text-slate-600 w-[25%]">Ürün Grubu</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[15%]">Ürün Kodu</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[30%]">Ürün Adı</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[15%] text-right">Mevcut Stok</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[10%]">Miktar</th>
                                    <th className="p-2 font-semibold text-slate-600 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody>{producedLines.map(line => {
                                const warehouseId = header.destWarehouseId;
                                const shelfId = header.destShelfId;
                                const stock = getStockInfo(line.productId, warehouseId, shelfId);
                                return (
                                    <LineRow
                                        key={line.id}
                                        line={line}
                                        lineType="produced"
                                        onLineChange={(id, field, value) => handleLineChange('produced', id, field, value)}
                                        onRemove={(id) => removeLine('produced', id)}
                                        isRemovalDisabled={producedLines.length <= 1}
                                        productGroups={productGroups}
                                        products={products}
                                        getProductSku={getProductSku}
                                        stockInfo={stock}
                                        errors={errors}
                                    />
                                );
                            })}</tbody>
                        </table>
                    </div>
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

export default ProductionVoucherFormModal;
