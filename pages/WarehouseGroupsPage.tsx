import React from 'react';
import { WarehouseGroup, ModalState } from '../types';
import EntityManagementPage from '../components/EntityManagementPage';
import { findById } from '../utils/helpers';

const WarehouseGroupsPage: React.FC<{
    warehouseGroups: WarehouseGroup[],
    setModal: (modal: ModalState) => void;
    handleDeleteWarehouseGroup: (id: string) => void;
}> = ({ warehouseGroups, setModal, handleDeleteWarehouseGroup }) => {
     return (
        <EntityManagementPage
            title="Depo Grupları"
            items={warehouseGroups}
            columns={[
                { header: 'Grup Adı', key: 'name' },
            ]}
            onAddItem={() => setModal({ type: 'ADD_WAREHOUSE_GROUP' })}
            onEditItem={(item) => setModal({ type: 'EDIT_WAREHOUSE_GROUP', data: item })}
            onDeleteItem={(id) => {
                const item = findById(warehouseGroups, id);
                setModal({
                    type: 'CONFIRM_DELETE',
                    data: {
                        message: `"${item?.name || 'Seçili grubu'}" silmek istediğinizden emin misiniz?`,
                        onConfirm: () => handleDeleteWarehouseGroup(id)
                    }
                });
            }}
            addLabel="Yeni Grup Ekle"
        />
    );
}

export default WarehouseGroupsPage;
