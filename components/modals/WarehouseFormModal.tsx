

import React, { useState } from 'react';
import { Warehouse } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import SearchableSelect from '../SearchableSelect';
import { ModalComponentProps } from './ModalComponentProps';
import { SaveIcon, CancelIcon } from '../../components/icons';

interface WarehouseFormModalProps extends ModalComponentProps<Warehouse | { suggestedCode: string }> {
    isEdit: boolean;
}

const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({ isEdit, data, onClose, warehouseGroups, handleAddWarehouse, handleEditWarehouse }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        code: (data as Warehouse)?.code || (data as { suggestedCode: string })?.suggestedCode || '',
        name: (data as Warehouse)?.name || '',
        group_id: (data as Warehouse)?.group_id || '',
    });
    const [errors, setErrors] = useState<{ code?: string; name?: string; group_id?: string }>({});

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(p => ({ ...p, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { code?: string; name?: string; group_id?: string } = {};
        if (!formData.code.trim()) newErrors.code = 'Zorunlu alan';
        if (!formData.name.trim()) newErrors.name = 'Zorunlu alan';
        if (!formData.group_id) newErrors.group_id = 'Zorunlu alan';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }

        let success = false;
        if (isEdit) {
            success = await handleEditWarehouse({...(data as Warehouse), ...formData });
        } else {
            success = await handleAddWarehouse(formData);
        }

        if(success) onClose();
    }

    return (
        <form onSubmit={handleSubmit} id="warehouse-form">
            <div className="space-y-4">
                <div>
                    <label htmlFor="code" className={formLabelClass}>Depo Kodu</label>
                    <input type="text" id="code" name="code" value={formData.code} onChange={e => handleChange('code', e.target.value)} className={`${formInputClass} ${errors.code ? 'border-red-500' : ''}`} />
                </div>
                <div>
                    <label htmlFor="name" className={formLabelClass}>Depo Adı</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={e => handleChange('name', e.target.value)} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} />
                </div>
                 <div>
                    <label htmlFor="group_id" className={formLabelClass}>Depo Grubu</label>
                    <SearchableSelect options={warehouseGroups} value={formData.group_id} onChange={val => handleChange('group_id', val)} placeholder="Grup Seçin" error={!!errors.group_id}/>
                </div>
            </div>
            <div className="modal-actions flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                <button type="button" onClick={onClose} className="cancel-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">
                <CancelIcon />
                İptal</button>
                <button type="submit" className="submit-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                <SaveIcon />
                Kaydet</button>
            </div>
        </form>
    );
};

export default WarehouseFormModal;