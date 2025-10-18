import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { SaveIcon, CancelIcon } from '../../components/icons';

interface SimpleFormModalProps extends ModalComponentProps<{
    onSuccess?: (newId: string) => void;
    [key: string]: any;
}> {
    fields: { name: string; label: string; value: string, required?: boolean }[];
    onSubmit: (data: Record<string, string>) => Promise<any>;
}

const SimpleFormModal: React.FC<SimpleFormModalProps> = ({ fields, onSubmit, onClose, data }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Record<string, string>>(() => fields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}));
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const handleChange = (name: string, value: string) => {
        setFormData(p => ({ ...p, [name]: value }));
        if (errors[name]) {
            setErrors(p => ({ ...p, [name]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        fields.forEach(f => {
            if (f.required !== false && !formData[f.name]?.trim()) {
                newErrors[f.name] = true;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            addToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }

        const result = await onSubmit(formData);
    
        // Priority 1: Handle the onSuccess callback if a new ID is returned
        if (data?.onSuccess && typeof result === 'string' && result) {
            data.onSuccess(result);
            return; // The callback handles the next step
        }

        // Priority 2: Handle standard modal closing on success
        if (result === undefined || result === true || (typeof result === 'string' && result !== '')) {
            onClose();
        }
        
        // If result is `false` or `''`, it's a failure, and we do nothing, keeping the modal open.
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                {fields.map(f => (
                    <div key={f.name}>
                        <label htmlFor={f.name} className={formLabelClass}>{f.label}</label>
                        <input type="text" id={f.name} name={f.name} value={formData[f.name]} onChange={e => handleChange(f.name, e.target.value)} className={`${formInputClass} ${errors[f.name] ? 'border-red-500' : ''}`}/>
                    </div>
                ))}
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

export default SimpleFormModal;