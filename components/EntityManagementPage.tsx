
import React from 'react';
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
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
                <button onClick={onAddItem} className="font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 justify-center transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                    <PlusIcon /> {addLabel}
                </button>
            </div>
             <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                {columns.map(col => <th key={col.key} className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">{col.header}</th>)}
                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b hover:bg-slate-50">
                                    {columns.map(col => <td key={col.key} className="p-4 align-middle text-slate-700">{item[col.key]}</td>)}
                                    <td className="p-4 align-middle text-slate-700">
                                        <div className="flex gap-4">
                                            <button onClick={() => onEditItem(item)} className="text-blue-600 hover:text-blue-800"><PencilIcon /></button>
                                            <button onClick={() => onDeleteItem(item.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
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
