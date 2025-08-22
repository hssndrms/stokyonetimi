import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, AccountType, StockItem, Unit, ModalState } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';

type Line = { id: number, productGroupId: string, productId: string, quantity: string };
type Header = { date: string, warehouseId: string, shelfId: string, accountId: string, notes: string };

interface StockMovementFormModalProps extends ModalComponentProps<{ 
    voucher_number?: string,
    restoredState?: { header: Header, lines: Line[] }
}> {
    isStockIn?: boolean;
    isEdit?: boolean;
    setModal: (modal: ModalState) => void;
}


const StockMovementFormModal: React.FC<StockMovementFormModalProps> = ({ isStockIn, isEdit, data, onClose, getNextVoucherNumber, shelves, accounts, products, warehouses, productGroups, handleStockIn, handleStockOut, handleEditStockVoucher, stockItems, units, stockMovements, setModal, handleDeleteStockVoucher }) => {
    const { addToast } = useToast();
    const isEditMode = !!(isEdit && data?.voucher_number);
    
    const [header, setHeader] = useState<Header>(() => {
        if(data?.restoredState) return data.restoredState.header;

        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number);
            if (movements.length > 0) {
                const firstMovement = movements[0];
                const account = accounts.find(a => a.name === firstMovement.source_or_destination);
                return {
                    date: new Date(firstMovement.date).toISOString().slice(0, 10),
                    warehouseId: firstMovement.warehouse_id,
                    shelfId: firstMovement.shelf_id || '',
                    accountId: account?.id || '',
                    notes: firstMovement.notes || '',
                };
            }
        }
        return {
            date: new Date().toISOString().slice(0, 10),
            warehouseId: '',
            shelfId: '',
            accountId: '',
            notes: '',
        };
    });

    const [lines, setLines] = useState<Line[]>(() => {
        if(data?.restoredState) return data.restoredState.lines;

        if (isEditMode) {
            const movements = stockMovements.filter(m => m.voucher_number === data.voucher_number);
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
        header?: { date?: boolean, warehouseId?: boolean, shelfId?: boolean, accountId?: boolean },
        lines?: { [id: number]: { productGroupId?: boolean, productId?: boolean, quantity?: boolean } }
    };
    const [errors, setErrors] = useState<FormErrors>({});

    const [voucherNumber, setVoucherNumber] = useState('');
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    
    const [accountType, setAccountType] = useState<AccountType>(() => {
        if (isEditMode) {
            const movement = stockMovements.find(m => m.voucher_number === data.voucher_number);
            if (movement) {
                return movement.type === 'IN' ? 'supplier' : 'customer';
            }
        }
        return isStockIn ? 'supplier' : 'customer';
    });
    
    const [showStock, setShowStock] = useState(false);
    
    const [voucherType, setVoucherType] = useState<'IN' | 'OUT'>(() => {
        if(isEditMode) {
            const movement = stockMovements.find(m => m.voucher_number === data.voucher_number);
            return movement?.type || 'IN';
        }
        return isStockIn ? 'IN' : 'OUT';
    });

    const availableAccounts = useMemo(() => accounts.filter(a => a.type === accountType), [accountType, accounts]);
    const selectedAccount = useMemo(() => accounts.find(a => a.id === header.accountId), [header.accountId, accounts]);

    useEffect(() => {
        const fetchVoucherNumber = async () => {
            if (isEditMode) {
                setVoucherNumber(data.voucher_number!);
            } else if (getNextVoucherNumber) {
                const newVoucherNumber = await getNextVoucherNumber(voucherType);
                setVoucherNumber(newVoucherNumber);
            }
        };
        fetchVoucherNumber();
    }, [isEditMode, data, getNextVoucherNumber, voucherType]);


    useEffect(() => {
        const shelvesForWarehouse = header.warehouseId ? shelves.filter(s => s.warehouse_id === header.warehouseId) : [];
        setAvailableShelves(shelvesForWarehouse);
        if (header.warehouseId) {
            const currentShelf = shelves.find(s => s.id === header.shelfId);
            if (currentShelf && currentShelf.warehouse_id !== header.warehouseId) {
                setHeader(h => ({ ...h, shelfId: '' }));
            }
        } else {
            setHeader(h => ({ ...h, shelfId: '' }));
            setShowStock(false);
        }
    }, [header.warehouseId, shelves]);
    
    useEffect(() => {
        if (!isEditMode && !data?.restoredState) {
            setHeader(h => ({ ...h, accountId: '' }));
        }
    }, [accountType, isEditMode, data]);

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

    const addLine = () => {
        setLines(ls => [...ls, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1' }]);
    };

    const removeLine = (id: number) => {
        if (lines.length > 1) {
            setLines(ls => ls.filter(l => l.id !== id));
        } else {
            addToast('En az bir ürün satırı olmalıdır.', 'info');
        }
    };

    const getProductSku = (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product?.sku || '';
    };

    const getStockInfo = (productId: string, warehouseId: string, shelfId: string): string => {
        const effectiveShelfId = shelfId === '' ? null : shelfId;
        const stockItem = stockItems.find(item => 
            item.product_id === productId && 
            item.warehouse_id === warehouseId && 
            item.shelf_id === effectiveShelfId
        );
        const product = products.find(p => p.id === productId);
        const unit = units.find(u => u.id === product?.unit_id);
        
        const quantity = stockItem?.quantity || 0;
        const unitAbbr = unit?.abbreviation || '';
        
        return `${Number(quantity).toLocaleString()} ${unitAbbr}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: FormErrors = { header: {}, lines: {} };
        if (!header.date) newErrors.header!.date = true;
        if (!header.warehouseId) newErrors.header!.warehouseId = true;
        
        if (availableShelves.length > 0 && !header.shelfId) {
            newErrors.header!.shelfId = true;
        }

        if (!header.accountId) newErrors.header!.accountId = true;

        lines.forEach(l => {
            const lineError: { productGroupId?: boolean, productId?: boolean, quantity?: boolean } = {};
            if (!l.productGroupId) lineError.productGroupId = true;
            if (!l.productId) lineError.productId = true;
            const quantityNumber = parseFloat(l.quantity);
            if (isNaN(quantityNumber) || quantityNumber <= 0) {
                lineError.quantity = true;
            }
            if (Object.keys(lineError).length > 0) newErrors.lines![l.id] = lineError;
        });

        const validLines = lines.filter(l => l.productId && parseFloat(l.quantity) > 0);

        if (Object.values(newErrors.header!).some(v => v) || Object.keys(newErrors.lines!).length > 0 || validLines.length === 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun ve geçerli miktar girin.', 'error');
            return;
        }

        if (!selectedAccount) {
            addToast('Geçerli bir cari seçilmedi.', 'error');
            return;
        }
        
        const linesData = validLines.map(l => ({ product_id: l.productId, quantity: parseFloat(l.quantity) }));

        let success = false;
        if (isEditMode) {
             const headerData = {
                date: header.date,
                warehouse_id: header.warehouseId,
                shelf_id: header.shelfId || null,
                source_or_destination: selectedAccount.name,
                notes: header.notes,
                type: voucherType
            };
            success = await handleEditStockVoucher(data.voucher_number!, headerData, linesData);
        } else {
             const headerData = {
                date: header.date,
                warehouse_id: header.warehouseId,
                shelf_id: header.shelfId || null,
                source_or_destination: selectedAccount.name,
                notes: header.notes,
            };
            if (voucherType === 'IN') {
                success = await handleStockIn(headerData, linesData);
            } else {
                success = await handleStockOut(headerData, linesData);
            }
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
    
    const handleAddNewAccount = () => {
        setModal({
            type: 'ADD_ACCOUNT',
            data: {
                onSuccess: (newAccountId: string) => {
                    setModal({
                        type: isEditMode ? 'EDIT_STOCK_VOUCHER' : (isStockIn ? 'STOCK_IN' : 'STOCK_OUT'),
                        data: {
                            ...data,
                            restoredState: {
                                header: { ...header, accountId: newAccountId },
                                lines,
                            }
                        }
                    });
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
                        type: isEditMode ? 'EDIT_STOCK_VOUCHER' : (isStockIn ? 'STOCK_IN' : 'STOCK_OUT'),
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div>
                        <label className={formLabelClass}>Fiş Numarası</label>
                        <input type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100`} readOnly />
                    </div>
                    <div>
                        <label htmlFor="date" className={formLabelClass}>Tarih</label>
                        <input type="date" id="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={`${formInputSmallClass} ${errors.header?.date ? 'border-red-500' : ''}`} />
                    </div>
                    <div>
                        <label className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={header.warehouseId} onChange={val => handleHeaderChange('warehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.warehouseId}/>
                    </div>
                    <div>
                        <label className={formLabelClass}>Raf</label>
                        <SearchableSelect
                            options={availableShelves}
                            value={header.shelfId}
                            onChange={val => handleHeaderChange('shelfId', val)}
                            placeholder={!header.warehouseId ? "Önce Depo Seçin" : availableShelves.length === 0 ? "Raf bulunmuyor" : "Raf Seçin"}
                            disabled={!header.warehouseId || availableShelves.length === 0}
                            error={!!errors.header?.shelfId}
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className={formLabelClass}>Notlar</label>
                    <input type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} />
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-md">
                <legend className="text-md font-medium text-slate-700 px-2 -mb-3">Cari Bilgileri</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div>
                        <label className={formLabelClass}>Cari Tipi</label>
                        <select
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value as AccountType)}
                            className={formInputSmallClass}
                            disabled={isEditMode}
                        >
                            <option value="supplier">Tedarikçi</option>
                            <option value="customer">Müşteri</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={formLabelClass}>Cari Adı ({selectedAccount?.code || 'Kod Yok'})</label>
                         <div className="flex items-center gap-2">
                            <div className="flex-grow">
                                <SearchableSelect options={availableAccounts} value={header.accountId} onChange={val => handleHeaderChange('accountId', val)} placeholder="Cari Seçin" error={!!errors.header?.accountId}/>
                            </div>
                            <button type="button" onClick={handleAddNewAccount} className="font-semibold py-1 px-3 text-sm rounded-md h-10 inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300" title="Yeni Cari Ekle">
                                <PlusIcon /> Yeni
                            </button>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-md font-medium text-slate-700">Fiş Detayları</h3>
                     <button 
                        type="button" 
                        onClick={() => setShowStock(s => !s)} 
                        disabled={!header.warehouseId}
                        className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        title={!header.warehouseId ? 'Lütfen önce bir depo seçin' : ''}
                    >
                        <i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        {showStock ? 'Stokları Gizle' : 'Mevcut Stokları Göster'}
                    </button>
                </div>
                <div className="border rounded-md">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-2 font-semibold text-slate-600 w-[25%]">Ürün Grubu</th>
                                <th className="p-2 font-semibold text-slate-600 w-[15%]">Ürün Kodu</th>
                                <th className="p-2 font-semibold text-slate-600 w-[30%]">Ürün Adı</th>
                                <th className="p-2 font-semibold text-slate-600 w-[15%]">Mevcut Stok</th>
                                <th className="p-2 font-semibold text-slate-600 w-[10%]">Miktar</th>
                                <th className="p-2 font-semibold text-slate-600 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line) => {
                                const sku = getProductSku(line.productId);
                                const availableProductsForLine = line.productGroupId
                                    ? products.filter(p => p.group_id === line.productGroupId)
                                    : [];
                                return (
                                    <tr key={line.id} className="border-t">
                                        <td className="p-2 align-middle">
                                            <SearchableSelect
                                                options={productGroups}
                                                value={line.productGroupId}
                                                onChange={val => handleLineChange(line.id, 'productGroupId', val)}
                                                placeholder="Grup Seçin"
                                                error={!!errors.lines?.[line.id]?.productGroupId}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={sku}
                                                className={`${formInputSmallClass} bg-slate-100 font-mono`}
                                                readOnly
                                                aria-label="Ürün Kodu"
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <SearchableSelect 
                                                options={availableProductsForLine} 
                                                value={line.productId} 
                                                onChange={val => handleLineChange(line.id, 'productId', val)} 
                                                placeholder="Ürün Seçin"
                                                disabled={!line.productGroupId}
                                                error={!!errors.lines?.[line.id]?.productId}
                                            />
                                        </td>
                                        <td className="p-2 align-middle text-slate-600 font-medium">
                                            {showStock && line.productId && header.warehouseId && (header.shelfId || availableShelves.length === 0) &&
                                                getStockInfo(line.productId, header.warehouseId, header.shelfId)
                                            }
                                        </td>
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
                                            <button 
                                                type="button" 
                                                onClick={() => removeLine(line.id)} 
                                                className="text-red-600 hover:text-red-800 disabled:text-slate-300"
                                                disabled={lines.length <= 1}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleAddNewProduct} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300">
                        <PlusIcon /> Yeni Ürün Ekle
                    </button>
                    <button type="button" onClick={addLine} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                        <PlusIcon /> Satır Ekle
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div>
                    {isEdit && (
                        <button 
                            type="button" 
                            onClick={handleDelete}
                            className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-red-600 text-white hover:bg-red-700"
                        >
                           <TrashIcon /> Sil
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">İptal</button>
                    <button type="submit" className="font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</button>
                </div>
            </div>
        </form>
    );
};

export default StockMovementFormModal;