

import React from 'react';
import { Product, Unit, ProductGroup, ModalState } from '../types';
import { findById } from '../utils/helpers';
import EntityManagementPage from '../components/EntityManagementPage';

const ProductsPage: React.FC<{
    products: Product[],
    units: Unit[],
    productGroups: ProductGroup[],
    setModal: (modal: ModalState) => void;
    handleDeleteProduct: (id: string) => void;
}> = ({ products, units, productGroups, setModal, handleDeleteProduct }) => {
    const getUnitName = (unit_id: string) => findById(units, unit_id)?.name || '?';
    const getGroupName = (group_id: string) => findById(productGroups, group_id)?.name || '?';
    
    const itemsWithDetails = products.map(p => ({
        ...p,
        unitName: getUnitName(p.unit_id),
        groupName: getGroupName(p.group_id)
    }));

    return (
        <EntityManagementPage
            title="Ürünler"
            items={itemsWithDetails}
            columns={[
                { header: 'Ürün Adı', key: 'name' },
                { header: 'Grup', key: 'groupName' },
                { header: 'SKU', key: 'sku' },
                { header: 'Birim', key: 'unitName' },
            ]}
            onAddItem={() => setModal({ type: 'ADD_PRODUCT' })}
            onEditItem={(item) => setModal({ type: 'EDIT_PRODUCT', data: item })}
            onDeleteItem={(id) => {
                const item = findById(products, id);
                setModal({
                    type: 'CONFIRM_DELETE',
                    data: {
                        message: `"${item?.name || 'Seçili öğeyi'}" silmek istediğinizden emin misiniz?`,
                        onConfirm: () => handleDeleteProduct(id)
                    }
                });
            }}
            addLabel="Yeni Ürün Ekle"
        />
    );
};

export default ProductsPage;