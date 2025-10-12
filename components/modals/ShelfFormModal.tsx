

import React, { useState } from 'react';
import { Shelf } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';

interface ShelfFormModalProps extends ModalComponentProps<Shelf | { warehouse_id: string; suggestedCode: string }> {
    isEdit: boolean;
}

const ShelfFormModal: React.FC<ShelfFormModalProps> = ({ isEdit, data, onClose, handleAddShelf, handleEditShelf }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        code: (data as Shelf)?.code || (data as { suggestedCode: string })?.suggestedCode || '',
        name: (data as Shelf)?.name || '',
    });
    const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(p => ({ ...p, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { code?: string; name?: string } = {};
        if (!formData.code.trim()) newErrors.code = 'Zorunlu alan';
        if (!formData.name.trim()) newErrors.name = 'Zorunlu alan';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }

        let success = false;
        if (isEdit) {
            success = await handleEditShelf({...(data as Shelf), ...formData });
        } else {
            success = await handleAddShelf({ ...formData, warehouse_id: (data as { warehouse_id: string }).warehouse_id });
        }

        if(success) onClose();
    }

    return (
        <form onSubmit={handleSubmit} id="shelf-form">
            <div className="space-y-4">
                <div>
                    <label htmlFor="code" className={formLabelClass}>Raf Kodu</label>
                    <input type="text" id="code" name="code" value={formData.code} onChange={e => handleChange('code', e.target.value)} className={`${formInputClass} ${errors.code ? 'border-red-500' : ''}`} />
                </div>
                <div>
                    <label htmlFor="name" className={formLabelClass}>Raf Adı</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={e => handleChange('name', e.target.value)} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} />
                </div>
            </div>
            <div className="modal-actions flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                <button type="button" onClick={onClose} className="cancel-button font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">İptal</button>
                <button type="submit" className="submit-button font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">Kaydet</button>
            </div>
        </form>
    );
};

export default ShelfFormModal;