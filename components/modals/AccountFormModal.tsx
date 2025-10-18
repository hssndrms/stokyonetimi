import React, { useState, useEffect, ChangeEvent } from 'react';
import { Account, AccountType, ModalState } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formInputClass, formLabelClass } from '../../styles/common';
import { ModalComponentProps } from './ModalComponentProps';
import { SaveIcon, CancelIcon } from '../../components/icons';

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
        <form onSubmit={handleSubmit} id="account-form">
            <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="type" className={formLabelClass}>Cari Tipi</label>
                        <select
                            id="account-type-select"
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
                        <label htmlFor="account-code-display" className={formLabelClass}>Cari Kodu</label>
                        <input id="account-code-display" type="text" value={isEdit ? data!.code : '(Otomatik Oluşturulacak)'} className={`${formInputClass} bg-slate-100 dark:bg-slate-700`} readOnly />
                    </div>
                </div>
                <div>
                    <label htmlFor="name" className={formLabelClass}>Cari Adı</label>
                    <input type="text" id="account-name-input" name="name" value={formData.name} onChange={handleChange} className={`${formInputClass} ${errors.name ? 'border-red-500' : ''}`} />
                </div>
                
                <fieldset className="contact-info-group border dark:border-slate-600 p-4 rounded-md">
                    <legend className="form-legend text-md font-medium text-slate-700 dark:text-slate-300 px-2 -mb-3">İletişim Bilgileri (İsteğe Bağlı)</legend>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label htmlFor="phone" className={formLabelClass}>Telefon</label>
                            {/* FIX: Corrected a broken input element that had textarea attributes and closing tag. Also added missing email and address fields. */}
                            <input type="tel" id="account-phone-input" name="phone" value={formData.phone} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="email" className={formLabelClass}>E-posta</label>
                            <input type="email" id="account-email-input" name="email" value={formData.email} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="address" className={formLabelClass}>Adres</label>
                            <textarea id="account-address-input" name="address" value={formData.address} onChange={handleChange} className={`${formInputClass} resize-y`} rows={3}></textarea>
                        </div>
                    </div>
                </fieldset>
            </div>
            <div className="modal-actions flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                <button id="cancel-account-button" type="button" onClick={onClose} className="cancel-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">
                <CancelIcon /> İptal
                </button>
                <button id="save-account-button" type="submit" className="submit-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-1 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                <SaveIcon /> Kaydet
                </button>
            </div>
        </form>
    );
};

export default AccountFormModal;