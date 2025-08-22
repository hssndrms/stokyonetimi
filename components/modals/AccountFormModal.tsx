import React, { useState, useEffect } from 'react';
import { Account, AccountType, ModalState } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';

interface AccountFormModalProps extends ModalComponentProps<Account & { onSuccess?: (newAccountId: string) => void }> {
    isEdit: boolean;
    setModal: (modal: ModalState) => void;
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({ isEdit, data, onClose, handleAddAccount, handleEditAccount }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: data?.name || '',
        type: data?.type || 'customer',
        phone: data?.phone || '',
        email: data?.email || '',
        address: data?.address || '',
    });
    const [errors, setErrors] = useState<{ name?: string }>({});
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
        if (name === 'name' && errors.name) {
            setErrors(prev => ({ ...prev, name: undefined }));
        }
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(p => ({ ...p, type: e.target.value as AccountType }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setErrors({ name: 'Zorunlu alan' });
            addToast('Lütfen zorunlu alanları doldurun.', 'error');
            return;
        }
        
        if (isEdit) {
            const success = await handleEditAccount({ ...data!, ...formData });
            if (success) onClose();
        } else {
            const newAccountId = await handleAddAccount(formData as Omit<Account, 'id' | 'code'>);
            if (newAccountId) {
                if (data?.onSuccess) {
                    data.onSuccess(newAccountId);
                } else {
                    onClose();
                }
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="type" className={formLabelClass}>Cari Tipi</label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleTypeChange}
                            className={formInputClass}
                            disabled={isEdit}
                        >
                            <option value="customer">Müşteri</option>
                            <option value="supplier">Tedarikçi</option>
                        </select>
                    </div>
                     <div>
                        <label className={formLabelClass}>Cari Kodu</label>
                        <input type="text" value={isEdit ? data!.code : '(Otomatik Oluşturulacak)'} className={`${formInputClass} bg-slate-100`} readOnly />
                    </div>
                </div>
                <div>
                    <label htmlFor="name" className={formLabelClass}>Cari Adı</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} />
                </div>
                
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-md font-medium text-slate-700 px-2 -mb-3">İletişim Bilgileri (İsteğe Bağlı)</legend>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label htmlFor="phone" className={formLabelClass}>Telefon</label>
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="email" className={formLabelClass}>E-posta</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="address" className={formLabelClass}>Adres</label>
                            <textarea id="address" name="address" value={formData.address} onChange={handleChange} className={`${formInputClass} resize-y`} rows={3}></textarea>
                        </div>
                    </div>
                </fieldset>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">İptal</button>
                <button type="submit" className="font-semibold py-2 px-4 rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700">Kaydet</button>
            </div>
        </form>
    );
};

export default AccountFormModal;