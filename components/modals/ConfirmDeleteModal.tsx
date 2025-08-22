
import React from 'react';
import { ModalComponentProps } from './ModalComponentProps';

interface ConfirmDeleteProps {
    message: string;
    onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ModalComponentProps<ConfirmDeleteProps>> = ({ data, onClose }) => {
    if (!data) return null;

    return (
        <div>
            <p className="text-slate-700 mb-6">{data.message}</p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300">Hayır</button>
                <button
                    type="button"
                    onClick={() => {
                        data.onConfirm();
                        onClose();
                    }}
                    className="font-semibold py-2 px-4 rounded-md transition-colors bg-red-600 text-white hover:bg-red-700"
                >
                    Evet
                </button>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
