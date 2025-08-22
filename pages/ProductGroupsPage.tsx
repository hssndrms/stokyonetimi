import React from 'react';
import { ProductGroup, ModalState } from '../types';
import EntityManagementPage from '../components/EntityManagementPage';
import { findById } from '../utils/helpers';

const ProductGroupsPage: React.FC<{
    productGroups: ProductGroup[],
    setModal: (modal: ModalState) => void;
    handleDeleteProductGroup: (id: string) => void;
}> = ({ productGroups, setModal, handleDeleteProductGroup }) => {
     return (
        <EntityManagementPage
            title="Ürün Grupları"
            items={productGroups}
            columns={[
                { header: 'Grup Adı', key: 'name' },
                { header: 'SKU Öneki', key: 'sku_prefix' },
                { header: 'SKU Sayısal Uzunluk', key: 'sku_length' },
            ]}
            onAddItem={() => setModal({ type: 'ADD_PRODUCT_GROUP' })}
            onEditItem={(item) => setModal({ type: 'EDIT_PRODUCT_GROUP', data: item })}
            onDeleteItem={(id) => {
                const item = findById(productGroups, id);
                setModal({
                    type: 'CONFIRM_DELETE',
                    data: {
                        message: `"${item?.name || 'Seçili grubu'}" silmek istediğinizden emin misiniz?`,
                        onConfirm: () => handleDeleteProductGroup(id)
                    }
                });
            }}
            addLabel="Yeni Grup Ekle"
        />
    );
}

export default ProductGroupsPage;