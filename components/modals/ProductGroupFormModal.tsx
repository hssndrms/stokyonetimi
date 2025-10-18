import React, { useState } from 'react';
import { ProductGroup } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { SaveIcon, CancelIcon } from '../../components/icons';

interface ProductGroupFormModalProps extends ModalComponentProps<ProductGroup & { onSuccess?: (id: string) => void }> {
    isEdit: boolean;
}

const ProductGroupFormModal: React.FC<ProductGroupFormModalProps> = ({ isEdit, data, onClose, handleAddProductGroup, handleEditProductGroup, productGroups }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: data?.name || '',
        sku_prefix: data?.sku_prefix || '',
        sku_length: data?.sku_length || 5,
    });
    const [errors, setErrors] = useState<{ name?: string; sku_prefix?: string; sku_length?: string }>({});

    const handleChange = (field: 'name' | 'sku_prefix', value: string) => {
        let processedValue = value;
        if (field === 'sku_prefix') {
            processedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        }
        setFormData(p => ({ ...p, [field]: processedValue }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    
    const handleLengthChange = (value: string) => {
        const num = parseInt(value, 10);
        setFormData(p => ({...p, sku_length: isNaN(num) ? 0 : num }));
        if (errors.sku_length) {
            setErrors(prev => ({...prev, sku_length: undefined}));
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string; sku_prefix?: string; sku_length?: string } = {};
        if (!formData.name.trim()) newErrors.name = 'Zorunlu alan';

        const trimmedPrefix = formData.sku_prefix.trim();
        if (!trimmedPrefix) {
            newErrors.sku_prefix = 'Zorunlu alan';
        } else if (trimmedPrefix.length > 5) {
            newErrors.sku_prefix = 'En fazla 5 karakter olabilir';
        } else {
            const prefixInUse = productGroups.some(group => 
                group.sku_prefix.toLowerCase() === trimmedPrefix.toLowerCase() &&
                (!isEdit || group.id !== data!.id)
            );
            if (prefixInUse) {
                newErrors.sku_prefix = 'Bu önek zaten kullanılıyor.';
            }
        }
        
        if (!formData.sku_length || formData.sku_length < 3 || formData.sku_length > 10) {
            newErrors.sku_length = '3 ile 10 arasında olmalıdır';
        }


        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doğru şekilde doldurun.', 'error');
            return;
        }

        if (isEdit) {
            const success = await handleEditProductGroup({...(data as ProductGroup), ...formData, sku_prefix: trimmedPrefix });
            if (success) onClose();
        } else {
            const newGroupId = await handleAddProductGroup({...formData, sku_prefix: trimmedPrefix});
            if (newGroupId) {
                if (data?.onSuccess) {
                    data.onSuccess(newGroupId);
                } else {
                    onClose();
                }
            }
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className={formLabelClass}>Grup Adı</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={e => handleChange('name', e.target.value)} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="sku_prefix" className={formLabelClass}>SKU Öneki</label>
                        <input 
                            type="text" 
                            id="sku_prefix" 
                            name="sku_prefix" 
                            value={formData.sku_prefix} 
                            onChange={e => handleChange('sku_prefix', e.target.value)} 
                            className={`${formInputClass} ${errors.sku_prefix ? 'border-red-500' : ''}`} 
                            maxLength={5}
                            placeholder="Örn: KMS, URN"
                        />
                        {errors.sku_prefix && <p className="text-red-500 text-xs mt-1">{errors.sku_prefix}</p>}
                    </div>
                     <div>
                        <label htmlFor="sku_length" className={formLabelClass}>SKU Sayısal Uzunluk</label>
                        <input 
                            type="number" 
                            id="sku_length" 
                            name="sku_length" 
                            value={formData.sku_length} 
                            onChange={e => handleLengthChange(e.target.value)} 
                            className={`${formInputClass} ${errors.sku_length ? 'border-red-500' : ''}`} 
                            min="3"
                            max="10"
                        />
                        {errors.sku_length && <p className="text-red-500 text-xs mt-1">{errors.sku_length}</p>}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">
                <CancelIcon />
                İptal</button>
                <button type="submit" className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                <SaveIcon />
                Kaydet</button>
            </div>
        </form>
    );
};

export default ProductGroupFormModal;