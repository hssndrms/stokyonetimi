
import React from 'react';
import { Unit, ModalState } from '../types';
import EntityManagementPage from '../components/EntityManagementPage';
import { findById } from '../utils/helpers';

const UnitsPage: React.FC<{
    units: Unit[],
    setModal: (modal: ModalState) => void;
    handleDeleteUnit: (id: string) => void;
}> = ({ units, setModal, handleDeleteUnit }) => {
     return (
        <EntityManagementPage
            title="Birimler"
            items={units}
            columns={[
                { header: 'Birim Adı', key: 'name' },
                { header: 'Kısaltma', key: 'abbreviation' },
            ]}
            onAddItem={() => setModal({ type: 'ADD_UNIT' })}
            onEditItem={(item) => setModal({ type: 'EDIT_UNIT', data: item })}
            onDeleteItem={(id) => {
                const item = findById(units, id);
                setModal({
                    type: 'CONFIRM_DELETE',
                    data: {
                        message: `"${item?.name || 'Seçili birimi'}" silmek istediğinizden emin misiniz?`,
                        onConfirm: () => handleDeleteUnit(id)
                    }
                });
            }}
            addLabel="Yeni Birim Ekle"
        />
    );
}

export default UnitsPage;
