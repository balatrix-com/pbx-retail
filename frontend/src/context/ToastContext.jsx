import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {createPortal(
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`flex items-start rounded-lg p-4 shadow-lg transition-all border-l-4 w-80 bg-white ${toast.type === 'success' ? 'border-green-500' :
                                    toast.type === 'error' ? 'border-red-500' :
                                        toast.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'
                                }`}
                        >
                            <div className="flex-shrink-0">
                                {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                                {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900">{toast.message}</p>
                            </div>
                            <div className="ml-4 flex flex-shrink-0">
                                <button
                                    className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={() => removeToast(toast.id)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
