

import React, { useState, useMemo } from 'react';
import { Product, Unit, ProductGroup, ModalState } from '../types';
import { findById } from '../utils/helpers';
import EntityManagementPage from '../components/EntityManagementPage';
import { formInputClass, formLabelClass } from '../styles/common';

const ProductsPage: React.FC<{
    products: Product[],
    units: Unit[],
    productGroups: ProductGroup[],
    setModal: (modal: ModalState) => void;
    handleDeleteProduct: (id: string) => void;
}> = ({ products, units, productGroups, setModal, handleDeleteProduct }) => {
    const [filters, setFilters] = useState({
        name: '',
        groupId: '',
        sku: ''
    });

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const getUnitName = (unit_id: string) => findById(units, unit_id)?.name || '?';
    const getGroupName = (group_id: string) => findById(productGroups, group_id)?.name || '?';

    const filteredItems = useMemo(() => {
        const { name, groupId, sku } = filters;
        const nameFilter = name.toLowerCase().trim();
        const skuFilter = sku.toLowerCase().trim();

        if (!nameFilter && !groupId && !skuFilter) {
            return products;
        }

        return products.filter(product => {
            const nameMatch = !nameFilter || product.name.toLowerCase().includes(nameFilter);
            const groupMatch = !groupId || product.group_id === groupId;
            const skuMatch = !skuFilter || product.sku.toLowerCase().includes(skuFilter);

            return nameMatch && groupMatch && skuMatch;
        });
    }, [products, filters]);

    const itemsWithDetails = useMemo(() => filteredItems.map(p => ({
        ...p,
        unitName: getUnitName(p.unit_id),
        groupName: getGroupName(p.group_id)
    })), [filteredItems, units, productGroups]);

    return (
        <div id="products-page" className="products-page">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="page-title text-3xl font-bold text-slate-800 dark:text-slate-100">Ürünler</h1>
            </div>

            <div id="filter-panel" className="filter-panel bg-white dark:bg-slate-800 p-4 rounded-lg shadow border dark:border-slate-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="filter-group">
                        <label htmlFor="nameFilter" className={formLabelClass}>Ürün Adı</label>
                        <input
                            id="nameFilter"
                            type="text"
                            placeholder="Ada göre ara..."
                            value={filters.name}
                            onChange={e => handleFilterChange('name', e.target.value)}
                            className={formInputClass}
                        />
                    </div>
                     <div className="filter-group">
                        <label htmlFor="skuFilter" className={formLabelClass}>SKU</label>
                        <input
                            id="skuFilter"
                            type="text"
                            placeholder="SKU'ya göre ara..."
                            value={filters.sku}
                            onChange={e => handleFilterChange('sku', e.target.value)}
                            className={formInputClass}
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="groupFilter" className={formLabelClass}>Ürün Grubu</label>
                        <select
                            id="groupFilter"
                            value={filters.groupId}
                            onChange={e => handleFilterChange('groupId', e.target.value)}
                            className={formInputClass}
                        >
                            <option value="">Tümü</option>
                            {productGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <EntityManagementPage
                title=""
                items={itemsWithDetails}
                columns={[
                    { header: 'Ürün Adı', key: 'name' },
                    { header: 'Grup', key: 'groupName' },
                    { header: 'SKU', key: 'sku' },
                    { header: 'Birim', key: 'unitName' },
                ]}
                onAddItem={() => setModal({ type: 'ADD_PRODUCT' })}
                onEditItem={(item) => {
                    const originalProduct = findById(products, item.id);
                    setModal({ type: 'EDIT_PRODUCT', data: originalProduct });
                }}
                onDeleteItem={(id) => {
                    const originalProduct = findById(products, id);
                    setModal({
                        type: 'CONFIRM_DELETE',
                        data: {
                            message: `"${originalProduct?.name || 'Seçili öğeyi'}" silmek istediğinizden emin misiniz?`,
                            onConfirm: () => handleDeleteProduct(id)
                        }
                    });
                }}
                addLabel="Yeni Ürün Ekle"
            />
        </div>
    );
};

export default ProductsPage;