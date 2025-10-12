
import React from 'react';
import { ModalComponentProps } from './ModalComponentProps';

interface ConfirmDeleteProps {
    message: string;
    onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ModalComponentProps<ConfirmDeleteProps>> = ({ data, onClose }) => {
    if (!data) return null;

    return (
        <div id="confirm-delete-modal">
            <p className="confirm-message text-slate-700 dark:text-slate-300 mb-6">{data.message}</p>
            <div className="modal-actions flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                <button type="button" onClick={onClose} className="cancel-button font-semibold py-2 px-4 rounded-md transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">Hayır</button>
                <button
                    type="button"
                    onClick={() => {
                        data.onConfirm();
                        onClose();
                    }}
                    className="confirm-delete-button font-semibold py-2 px-4 rounded-md transition-colors bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                >
                    Evet
                </button>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;