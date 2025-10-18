import React, { useState, useEffect, useMemo } from 'react';
import { Shelf, AccountType, StockItem, Unit, ModalState, Product } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, TrashIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { formLabelClass, formInputSmallClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { formatNumber, findById } from '../../utils/helpers';

type Line = { id: number, productGroupId: string, productId: string, quantity: string, shelfId: string };
type Header = { date: string, warehouseId: string, accountId: string, notes: string };

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
                    accountId: account?.id || '',
                    notes: firstMovement.notes || '',
                };
            }
        }
        return {
            date: new Date().toISOString().slice(0, 10),
            warehouseId: '',
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
                        quantity: String(m.quantity),
                        shelfId: m.shelf_id || '',
                    };
                });
            }
        }
        return [{ id: Date.now(), productGroupId: '', productId: '', quantity: '1', shelfId: '' }];
    });
    
    type FormErrors = {
        header?: { date?: boolean, warehouseId?: boolean, accountId?: boolean },
        lines?: { [id: number]: { productGroupId?: boolean, productId?: boolean, quantity?: boolean, shelfId?: boolean } }
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
                const newVoucherNumber = await getNextVoucherNumber(voucherType);
                setVoucherNumber(newVoucherNumber);
            }
        };
        fetchVoucherNumber();
    }, [isEditMode, data, getNextVoucherNumber, voucherType]);


    useEffect(() => {
        const shelvesForWarehouse = header.warehouseId ? shelves.filter(s => s.warehouse_id === header.warehouseId) : [];
        setAvailableShelves(shelvesForWarehouse);
        if (!header.warehouseId) {
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

        if (field === 'warehouseId') {
            // Reset shelfId on lines if warehouse changes
            setLines(ls => ls.map(l => ({...l, shelfId: ''})));
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
                    updatedLine.shelfId = ''; // Reset shelf when group changes
                }
                if (field === 'productId') {
                    updatedLine.shelfId = ''; // Reset shelf when product changes
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

    const addLine = () => {
        setLines(ls => [...ls, { id: Date.now() + Math.random(), productGroupId: '', productId: '', quantity: '1', shelfId: '' }]);
    };

    const removeLine = (id: number) => {
        if (lines.length > 1) {
            setLines(ls => ls.filter(l => l.id !== id));
        } else {
            addToast('En az bir ürün satırı olmalıdır.', 'info');
        }
    };

    const getProductSku = (productId: string) => findById(products, productId)?.sku || '';

    const getStockInfo = (productId: string, warehouseId: string, shelfId: string): string => {
        if (!showStock || !productId || !warehouseId || (availableShelves.length > 0 && !shelfId)) return '';

        const effectiveShelfId = shelfId === '' ? null : shelfId;
        const stockItem = stockItems.find(item => 
            item.product_id === productId && 
            item.warehouse_id === warehouseId && 
            item.shelf_id === effectiveShelfId
        );
        const product = findById(products, productId);
        const unit = findById(units, product?.unit_id);
        
        const quantity = stockItem?.quantity || 0;
        const unitAbbr = unit?.abbreviation || '';
        
        return `${formatNumber(quantity)} ${unitAbbr}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: FormErrors = { header: {}, lines: {} };
        if (!header.date) newErrors.header!.date = true;
        if (!header.warehouseId) newErrors.header!.warehouseId = true;
        if (!header.accountId) newErrors.header!.accountId = true;

        lines.forEach(l => {
            const lineError: { productGroupId?: boolean, productId?: boolean, quantity?: boolean, shelfId?: boolean } = {};
            if (!l.productGroupId) lineError.productGroupId = true;
            if (!l.productId) lineError.productId = true;
            const quantityNumber = parseFloat(l.quantity);
            if (isNaN(quantityNumber) || quantityNumber <= 0) {
                lineError.quantity = true;
            }
            if(availableShelves.length > 0 && !l.shelfId) lineError.shelfId = true;

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
        
        const linesData = validLines.map(l => ({ 
            product_id: l.productId, 
            quantity: parseFloat(l.quantity),
            shelf_id: l.shelfId || null
        }));

        let success = false;
        if (isEditMode) {
             const headerData = {
                date: header.date,
                warehouse_id: header.warehouseId,
                source_or_destination: selectedAccount.name,
                notes: header.notes,
                type: voucherType
            };
            success = await handleEditStockVoucher(data.voucher_number!, headerData, linesData);
        } else {
             const headerData = {
                date: header.date,
                warehouse_id: header.warehouseId,
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
        const currentModalType = isEditMode ? 'EDIT_STOCK_VOUCHER' : (isStockIn ? 'STOCK_IN' : 'STOCK_OUT');
    
        setModal({
            type: 'ADD_ACCOUNT',
            data: {
                onSuccess: (newAccountId: string) => {
                    setModal({
                        type: currentModalType,
                        data: {
                            ...data,
                            restoredState: {
                                header: { ...header, accountId: newAccountId },
                                lines: lines
                            }
                        }
                    });
                }
            }
        });
    };

    const handleAddNewProduct = () => {
        const currentModalType = isEditMode ? 'EDIT_STOCK_VOUCHER' : (isStockIn ? 'STOCK_IN' : 'STOCK_OUT');
    
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
                            shelfId: ''
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
        <form id="stock-movement-form" onSubmit={handleSubmit} className="space-y-4">
            <fieldset id="voucher-header-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Fiş Başlık Bilgileri</legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                    <div>
                        <label htmlFor="voucher-number" className={formLabelClass}>Fiş Numarası</label>
                        <input id="voucher-number" type="text" value={voucherNumber} className={`${formInputSmallClass} bg-slate-100 dark:bg-slate-700`} readOnly />
                    </div>
                    <div>
                        <label htmlFor="voucher-date" className={formLabelClass}>Tarih</label>
                        <input id="voucher-date" type="date" value={header.date} onChange={e => handleHeaderChange('date', e.target.value)} className={`${formInputSmallClass} ${errors.header?.date ? 'border-red-500' : ''}`} />
                    </div>
                    <div>
                        <label htmlFor="warehouse-select" className={formLabelClass}>Depo</label>
                        <SearchableSelect options={warehouses} value={header.warehouseId} onChange={val => handleHeaderChange('warehouseId', val)} placeholder="Depo Seçin" error={!!errors.header?.warehouseId}/>
                    </div>
                     <div className="md:col-span-3">
                        <label htmlFor="voucher-notes" className={formLabelClass}>Notlar</label>
                        <input id="voucher-notes" type="text" value={header.notes} onChange={e => handleHeaderChange('notes', e.target.value)} className={formInputSmallClass} />
                    </div>
                </div>
            </fieldset>

            <fieldset id="account-info" className="form-fieldset border dark:border-slate-600 p-4 rounded-md">
                <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">Cari Bilgileri</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div>
                        <label htmlFor="account-type" className={formLabelClass}>Cari Tipi</label>
                        <select id="account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={formInputSmallClass} disabled={isEditMode}>
                            <option value="supplier">Tedarikçi</option>
                            <option value="customer">Müşteri</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="account-name" className={formLabelClass}>Cari Adı ({selectedAccount?.code || 'Kod Yok'})</label>
                         <div className="flex items-center gap-2">
                            <div className="flex-grow">
                                <SearchableSelect options={availableAccounts} value={header.accountId} onChange={val => handleHeaderChange('accountId', val)} placeholder="Cari Seçin" error={!!errors.header?.accountId}/>
                            </div>
                            <button id="add-new-account-button" type="button" onClick={handleAddNewAccount} className="font-semibold py-1 px-3 text-sm rounded-md h-10 inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500" title="Yeni Cari Ekle"><PlusIcon /> Yeni</button>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div id="voucher-details-section" className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="section-title text-md font-medium text-slate-700 dark:text-slate-300">Fiş Detayları</h3>
                     <button id="toggle-stock-visibility-button" type="button" onClick={() => setShowStock(s => !s)} disabled={!header.warehouseId} className="font-semibold py-1 px-3 text-xs rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed" title={!header.warehouseId ? 'Lütfen önce bir depo seçin' : ''}>
                        <i className={`fa-solid fa-fw ${showStock ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showStock ? 'Stokları Gizle' : 'Mevcut Stokları Göster'}
                    </button>
                </div>
                <div className="data-table-container border dark:border-slate-700 rounded-md overflow-x-auto">
                    <table id="movement-lines-table" className="data-table w-full text-left text-sm min-w-[900px]">
                        <thead className="table-header bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Grubu</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Ürün Kodu</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[20%]">Ürün Adı</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Raf</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[10%]">Mevcut Stok</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[15%]">Miktar</th>
                                <th className="table-header-cell p-2 font-semibold text-slate-600 dark:text-slate-300 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {lines.map((line) => {
                                const sku = getProductSku(line.productId);
                                const availableProductsForLine = useMemo(() => {
                                    if (!line.productGroupId) return [];
                                    const productIdsInGroup = new Set(products.filter(p => p.group_id === line.productGroupId).map(p => p.id));
                                    return productOptionsWithSku.filter(p => productIdsInGroup.has(p.id));
                                }, [line.productGroupId, productOptionsWithSku, products]);
                                
                                const shelvesForLine = (() => {
                                    if (voucherType === 'IN') return availableShelves;
                                    
                                    // Stok çıkışı için, ürünü içeren rafları filtrele
                                    if (!line.productId || !header.warehouseId) return [];
                                    const shelfIdsWithStock = stockItems
                                        .filter(si => si.product_id === line.productId && si.warehouse_id === header.warehouseId && si.quantity > 0 && si.shelf_id)
                                        .map(si => si.shelf_id);
                                    
                                    const shelvesWithStock = shelves.filter(shelf => shelf.warehouse_id === header.warehouseId && shelfIdsWithStock.includes(shelf.id));
                                
                                    // Düzenleme modunda, stoğu bitmiş olsa bile önceden seçili rafı listeye ekle
                                    if (isEditMode && line.shelfId && !shelvesWithStock.some(s => s.id === line.shelfId)) {
                                        const savedShelf = findById(shelves, line.shelfId);
                                        if (savedShelf && savedShelf.warehouse_id === header.warehouseId) {
                                            return Array.from(new Set([...shelvesWithStock, savedShelf]));
                                        }
                                    }
                                    
                                    return shelvesWithStock;
                                })();

                                return (
                                    <tr key={line.id} className="table-row border-t dark:border-slate-700">
                                        <td className="table-cell p-2 align-middle"><SearchableSelect options={productGroups} value={line.productGroupId} onChange={val => handleLineChange(line.id, 'productGroupId', val)} placeholder="Grup Seçin" error={!!errors.lines?.[line.id]?.productGroupId} /></td>
                                        <td className="p-2 align-middle font-mono text-slate-600 dark:text-slate-400">{sku}</td>
                                        <td className="table-cell p-2 align-middle"><SearchableSelect options={availableProductsForLine} value={line.productId} onChange={val => handleLineChange(line.id, 'productId', val)} placeholder="Ürün Seçin" disabled={!line.productGroupId} error={!!errors.lines?.[line.id]?.productId} /></td>
                                        <td className="table-cell p-2 align-middle">
                                            <SearchableSelect
                                                options={shelvesForLine}
                                                value={line.shelfId}
                                                onChange={val => handleLineChange(line.id, 'shelfId', val)}
                                                placeholder={availableShelves.length > 0 ? "Raf Seçin" : "Raf Bulunmuyor"}
                                                disabled={availableShelves.length === 0}
                                                error={!!errors.lines?.[line.id]?.shelfId}
                                            />
                                        </td>
                                        <td className="table-cell p-2 align-middle text-slate-600 dark:text-slate-400 font-medium">{getStockInfo(line.productId, header.warehouseId, line.shelfId)}</td>
                                        <td className="table-cell p-2 align-middle">
                                             <div className="flex items-center">
                                                <input type="number" step="any" min="0.0001" value={line.quantity} onChange={e => handleLineChange(line.id, 'quantity', e.target.value)} className={`${formInputSmallClass} ${errors.lines?.[line.id]?.quantity ? 'border-red-500' : ''} w-full text-right`} />
                                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium pl-2 w-12 text-left">{getUnitAbbrForProduct(line.productId)}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell p-2 text-center align-middle">
                                            <button type="button" onClick={() => removeLine(line.id)} className="remove-line-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 disabled:text-slate-300 dark:disabled:text-slate-600" disabled={lines.length <= 1}><TrashIcon /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button id="add-new-product-button" type="button" onClick={handleAddNewProduct} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-sky-200 text-sky-800 hover:bg-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"><PlusIcon /> Yeni Ürün Ekle</button>
                    <button id="add-line-button" type="button" onClick={addLine} className="font-semibold py-1 px-3 text-sm rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"><PlusIcon /> Satır Ekle</button>
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

export default StockMovementFormModal;