

import React, { useState, useMemo } from 'react';
import { Account, ModalState } from '../types';
import EntityManagementPage from '../components/EntityManagementPage';
import { findById } from '../utils/helpers';
import { formInputClass } from '../styles/common';

const AccountsPage: React.FC<{
    accounts: Account[],
    setModal: (modal: ModalState) => void;
    handleDeleteAccount: (id: string) => void;
}> = ({ accounts, setModal, handleDeleteAccount }) => {
    const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAccounts = useMemo(() => {
        let filtered = accounts;

        if (typeFilter !== 'all') {
            filtered = filtered.filter(acc => acc.type === typeFilter);
        }

        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(acc =>
                acc.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
            );
        }

        return filtered;
    }, [accounts, typeFilter, searchTerm]);

    const itemsWithDetails = filteredAccounts.map(acc => ({
        ...acc,
        typeName: acc.type === 'customer' ? 'Müşteri' : 'Tedarikçi',
        contact: [acc.phone, acc.email].filter(Boolean).join(' / ') || '-',
    }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Cariler</h1>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-6">
                        <label className="font-medium text-slate-700">Cari Tipi:</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="typeFilter" value="all" checked={typeFilter === 'all'} onChange={() => setTypeFilter('all')} className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                <span>Tümü</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="typeFilter" value="customer" checked={typeFilter === 'customer'} onChange={() => setTypeFilter('customer')} className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                <span>Müşteri</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="typeFilter" value="supplier" checked={typeFilter === 'supplier'} onChange={() => setTypeFilter('supplier')} className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                <span>Tedarikçi</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Cari adına göre ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={formInputClass}
                        />
                    </div>
                 </div>
            </div>

            <EntityManagementPage
                title="" // Title is now outside
                items={itemsWithDetails}
                columns={[
                    { header: 'Kod', key: 'code' },
                    { header: 'Cari Adı', key: 'name' },
                    { header: 'Tipi', key: 'typeName' },
                    { header: 'İletişim', key: 'contact' },
                ]}
                onAddItem={() => setModal({ type: 'ADD_ACCOUNT' })}
                onEditItem={(item) => setModal({ type: 'EDIT_ACCOUNT', data: item })}
                onDeleteItem={(id) => {
                    const item = findById(accounts, id);
                    setModal({
                        type: 'CONFIRM_DELETE',
                        data: {
                            message: `"${item?.name || 'Seçili cariyi'}" silmek istediğinizden emin misiniz?`,
                            onConfirm: () => handleDeleteAccount(id)
                        }
                    });
                }}
                addLabel="Yeni Cari Ekle"
            />
        </div>
    );
};

export default AccountsPage;