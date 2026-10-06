import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

const ConfirmActionModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = true,
    loading = false,
    icon: CustomIcon
}) => {
    if (!isOpen) return null;

    const IconComponent = CustomIcon || (isDanger ? Trash2 : AlertTriangle);

    return (
        <Dialog open={isOpen} onClose={() => !loading && onClose()} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-gray-900/10 dark:ring-slate-800 transition-all">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${
                                isDanger 
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-900/50' 
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900/50'
                            }`}>
                                <IconComponent className="h-5 w-5 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    {title}
                                </Dialog.Title>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-slate-300 font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-all disabled:opacity-50 shadow-xs"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={onConfirm}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                                isDanger
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:bg-rose-800'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20 active:bg-primary-800'
                            }`}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {confirmText}
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default ConfirmActionModal;
