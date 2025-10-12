
import React, { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

const EntityManagementPage: React.FC<{
    title: string;
    items: any[];
    columns: { header: string, key: string }[];
    onAddItem: () => void;
    onEditItem: (item: any) => void;
    onDeleteItem: (id: string) => void;
    addLabel: string;
}> = ({ title, items, columns, onAddItem, onEditItem, onDeleteItem, addLabel }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="entity-management-page">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
                <button id="add-new-entity-button" onClick={onAddItem} className="primary-action-button font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                    <PlusIcon /> {addLabel}
                </button>
            </div>
             <div className="data-table-container bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table w-full text-left">
                        <thead>
                            <tr className="table-header-row border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                {columns.map(col => (
                                    <th key={col.key} className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => requestSort(col.key)} className="sort-button w-full text-left flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100">
                                            {col.header}
                                            {sortConfig?.key === col.key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                                        </button>
                                    </th>
                                ))}
                                <th className="table-header-cell p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {sortedItems.map(item => (
                                <tr key={item.id} className="table-row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    {columns.map(col => <td key={col.key} className={`table-cell p-4 align-middle text-slate-700 dark:text-slate-300 cell-${col.key}`}>{item[col.key]}</td>)}
                                    <td className="table-cell action-cell p-4 align-middle text-slate-700 dark:text-slate-300">
                                        <div className="flex gap-4">
                                            <button onClick={() => onEditItem(item)} className="edit-button text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><PencilIcon /></button>
                                            <button onClick={() => onDeleteItem(item.id)} className="delete-button text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"><TrashIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default EntityManagementPage;