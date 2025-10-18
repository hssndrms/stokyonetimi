import React, { useState } from 'react';
import { Product, ModalState } from '../../types';
import { useToast } from '../../context/ToastContext';
import { PlusIcon, MagicWandIcon } from '../icons';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { SaveIcon, CancelIcon } from '../../components/icons';

type RestoredState = {
    name: string;
    sku: string;
    unit_id: string;
    group_id: string;
}

type ProductFormData = Product & {
    restoredState?: RestoredState;
    onSuccess?: (newProduct: { id: string, group_id: string }) => void;
};

interface ProductFormModalProps extends ModalComponentProps<ProductFormData> {
    isEdit: boolean;
    setModal: (modal: ModalState) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isEdit, data, onClose, units, productGroups, handleAddProductGroup, handleAddProduct, handleEditProduct, generateSku, setModal }) => {
    const { addToast } = useToast();
    
    const [product, setProduct] = useState<RestoredState>(() => {
        if (data?.restoredState) {
            return data.restoredState;
        }
        return { name: data?.name || '', sku: data?.sku || '', unit_id: data?.unit_id || '', group_id: data?.group_id || '' };
    });
    
    const [errors, setErrors] = useState<{ name?: string; sku?: string; unit_id?: string; group_id?: string }>({});

    const handleChange = (field: keyof typeof product, value: string) => {
        setProduct(p => ({ ...p, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string; sku?: string; unit_id?: string; group_id?: string } = {};
        if (!product.name.trim()) newErrors.name = 'Zorunlu alan';
        if (!product.group_id) newErrors.group_id = 'Zorunlu alan';
        if (!product.sku.trim()) newErrors.sku = 'Zorunlu alan';
        if (!product.unit_id) newErrors.unit_id = 'Zorunlu alan';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }
        
        if (isEdit) {
            const productData = { id: data!.id, ...product };
            const success = await handleEditProduct(productData as Product);
            if (success) onClose();
        } else {
            const newProductData = await handleAddProduct(product);
            if (newProductData) {
                if (data?.onSuccess) {
                    data.onSuccess(newProductData);
                } else {
                    onClose();
                }
            }
        }
    };

    const handleAddNewUnit = () => {
        setModal({
            type: 'ADD_UNIT',
            data: {
                onSuccess: (newUnitId: string) => {
                    // Re-open this modal with its state preserved and the new unit selected.
                    setModal({
                        type: isEdit ? 'EDIT_PRODUCT' : 'ADD_PRODUCT',
                        data: {
                            ...data, // Pass original data (like product ID for edit mode) and onSuccess
                            restoredState: { ...product, unit_id: newUnitId }
                        }
                    });
                }
            }
        });
    };
    
    const handleAddNewGroup = () => {
        setModal({
            type: 'ADD_PRODUCT_GROUP',
            data: {
                onSuccess: (newGroupId: string) => {
                    // Re-open this modal with its state preserved and the new group selected.
                    setModal({
                        type: isEdit ? 'EDIT_PRODUCT' : 'ADD_PRODUCT',
                        data: {
                            ...data, // Pass original data (like product ID for edit mode) and onSuccess
                            restoredState: { ...product, group_id: newGroupId }
                        }
                    });
                }
            }
        });
    };

    const handleGenerateSku = async () => {
        if (!product.group_id) {
            addToast('Lütfen önce bir ürün grubu seçin.', 'info');
            return;
        }
        if (!generateSku) {
             addToast('SKU üretme fonksiyonu bulunamadı.', 'error');
             return;
        }
        const newSku = await generateSku(product.group_id);
        if (newSku) {
            handleChange('sku', newSku);
        }
    };


    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div><label className={formLabelClass}>Ürün Adı</label><input type="text" value={product.name} onChange={e => handleChange('name', e.target.value)} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} /></div>
                
                 <div>
                  <label className={formLabelClass}>Grup</label>
                    <div className="flex items-center gap-2">
                      <select value={product.group_id} onChange={e => handleChange('group_id', e.target.value)} className={`${formInputClass} flex-grow ${errors.group_id ? 'border-red-500' : ''}`}>
                        <option value="">Seçiniz...</option>
                        {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button type="button" onClick={handleAddNewGroup} className="flex-shrink-0 h-12 w-12 rounded-md inline-flex items-center justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300" title="Yeni Grup Ekle">
                        <PlusIcon />
                      </button>
                    </div>
                </div>

                <div>
                    <label className={formLabelClass}>SKU (Stok Kodu)</label>
                    <div className="flex items-center gap-2">
                        <input type="text" value={product.sku} onChange={e => handleChange('sku', e.target.value)} className={`${formInputClass} flex-grow ${errors.sku ? 'border-red-500' : ''}`} />
                        <button 
                            type="button" 
                            onClick={handleGenerateSku} 
                            disabled={!product.group_id}
                            className="flex-shrink-0 h-12 w-12 rounded-md inline-flex items-center justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" 
                            title={!product.group_id ? "Önce bir ürün grubu seçin" : "SKU Öner"}
                        >
                            <MagicWandIcon />
                        </button>
                    </div>
                </div>

                <div>
                    <label className={formLabelClass}>Birim</label>
                    <div className="flex items-center gap-2">
                        <select value={product.unit_id} onChange={e => handleChange('unit_id', e.target.value)} className={`${formInputClass} flex-grow ${errors.unit_id ? 'border-red-500' : ''}`}>
                        <option value="">Seçiniz...</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button type="button" onClick={handleAddNewUnit} className="flex-shrink-0 h-12 w-12 rounded-md inline-flex items-center justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300" title="Yeni Birim Ekle">
                        <PlusIcon />
                        </button>
                    </div>
                </div>

            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
            <CancelIcon />
            İptal</button>
            <button type="submit" className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
            <SaveIcon />
            Kaydet</button></div>
        </form>
    );
};

export default ProductFormModal;