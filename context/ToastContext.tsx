
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { XMarkIcon } from '../components/icons';

// Types for Toast
type ToastType = 'success' | 'error' | 'info';
interface ToastInfo {
  id: string;
  message: string;
  type: ToastType;
}

// Toast Component
const Toast: React.FC<{ toast: ToastInfo; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  const { id, message, type } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const toastIcons = {
    success: <i className="fa-solid fa-check-circle"></i>,
    error: <i className="fa-solid fa-times-circle"></i>,
    info: <i className="fa-solid fa-info-circle"></i>,
  };

  const toastStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div
      className={`relative flex items-center gap-4 p-4 mb-4 rounded-md shadow-lg transition-transform transform-gpu animate-toast-in ${toastStyles[type]}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="text-xl">{toastIcons[type]}</div>
      <div className="flex-grow">{message}</div>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <XMarkIcon />
      </button>
    </div>
  );
};

// Toast Container Component
const ToastContainer: React.FC<{ toasts: ToastInfo[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};


// Toast Context and Provider
interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast_${new Date().getTime()}_${Math.random()}`;
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// useToast Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
