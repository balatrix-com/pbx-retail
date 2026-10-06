import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Package, Loader2, DollarSign, Layers, Hash, Sparkles } from 'lucide-react';
import { addonsService } from '../../services/addons.service';
import { useToast } from '../../context/ToastContext';

const AddonFormModal = ({ isOpen, onClose, onSuccess }) => {
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        addon_id: '',
        name: '',
        resource_type: 'extension',
        units_count: 1, // Default: 1 unit in bundle
        unit_price: '',
        currency: 'USD',
        is_active: true
    });

    const [errors, setErrors] = useState({});

    if (!isOpen) return null;

    const handleReset = () => {
        setFormData({
            addon_id: '',
            name: '',
            resource_type: 'extension',
            units_count: 1,
            unit_price: '',
            currency: 'USD',
            is_active: true
        });
        setErrors({});
    };

    const handleClose = () => {
        if (!submitting) {
            handleReset();
            onClose();
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear field validation error
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Helper to auto-suggest an addon_id slug based on name and resource type
    const handleNameChange = (e) => {
        const nameVal = e.target.value;
        setFormData(prev => {
            const next = { ...prev, name: nameVal };
            // If user hasn't manually entered a custom addon_id or it was auto-derived
            if (!prev.addon_id || prev.addon_id.startsWith('addon_')) {
                const cleanSlug = nameVal
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '');
                if (cleanSlug) {
                    next.addon_id = `addon_${cleanSlug}`;
                }
            }
            return next;
        });

        if (errors.name) {
            setErrors(prev => ({ ...prev, name: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.addon_id.trim()) {
            newErrors.addon_id = 'Add-on ID is required (e.g., addon_ext_5)';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.addon_id.trim())) {
            newErrors.addon_id = 'Add-on ID can only contain letters, numbers, hyphens and underscores';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Add-on name is required';
        }

        if (formData.unit_price === '' || formData.unit_price === null || isNaN(formData.unit_price) || Number(formData.unit_price) < 0) {
            newErrors.unit_price = 'A valid positive unit price is required';
        }

        if (!formData.resource_type) {
            newErrors.resource_type = 'Resource type is required';
        }

        if (formData.units_count !== '' && (isNaN(formData.units_count) || Number(formData.units_count) < 1)) {
            newErrors.units_count = 'Bundle units must be at least 1';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const payload = {
                addon_id: formData.addon_id.trim(),
                name: formData.name.trim(),
                resource_type: formData.resource_type,
                units_count: parseInt(formData.units_count, 10) || 1,
                unit_price: parseFloat(formData.unit_price),
                currency: formData.currency || 'USD',
                is_active: formData.is_active !== undefined ? formData.is_active : true
            };

            const res = await addonsService.createAddonCatalogItem(payload);
            addToast('success', res?.message || `Add-on "${formData.name}" created successfully!`);
            handleReset();
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create addon catalog item:', err);
            const msg = err.response?.data?.message || err.normalized?.message || err.message || 'Failed to create add-on';
            addToast('error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-gray-900/10 dark:ring-slate-800 transition-all">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 ring-1 ring-primary-200 dark:ring-primary-900/40">
                                <Package className="h-5 w-5 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    Add Catalog Add-on
                                </Dialog.Title>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                                    Create a new purchasable resource bundle for tenants
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                                Add-on Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="e.g. 5 Extra Extensions"
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none ${
                                    errors.name ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-slate-700'
                                }`}
                            />
                            {errors.name && <p className="text-xs text-rose-500 font-medium mt-1">{errors.name}</p>}
                        </div>

                        {/* Addon ID */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                                    Add-on Identifier (ID) <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[11px] text-gray-400 font-mono">Unique slug</span>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <Hash className="h-4 w-4" />
                                </span>
                                <input
                                    type="text"
                                    name="addon_id"
                                    value={formData.addon_id}
                                    onChange={handleChange}
                                    placeholder="e.g. addon_ext_5"
                                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none ${
                                        errors.addon_id ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-slate-700'
                                    }`}
                                />
                            </div>
                            {errors.addon_id && <p className="text-xs text-rose-500 font-medium mt-1">{errors.addon_id}</p>}
                        </div>

                        {/* Resource Type & Units Included Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                                    Resource Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="resource_type"
                                    value={formData.resource_type}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="extension">Extension (SIP)</option>
                                    <option value="tfn">Toll-Free Number (TFN)</option>
                                    <option value="did">DID Number</option>
                                    <option value="supervisor">Supervisor Seat</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                                    Units Included in Bundle <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="units_count"
                                    min="1"
                                    step="1"
                                    value={formData.units_count}
                                    onChange={handleChange}
                                    placeholder="e.g. 3"
                                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none ${
                                        errors.units_count ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-slate-700'
                                    }`}
                                />
                                {errors.units_count ? (
                                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.units_count}</p>
                                ) : (
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                                        How many extensions / DIDs / TFNs the tenant gets per pack.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Unit Price & Currency Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                                    Unit Price (Monthly) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        name="unit_price"
                                        step="0.01"
                                        min="0"
                                        value={formData.unit_price}
                                        onChange={handleChange}
                                        placeholder="25.00"
                                        className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-mono font-bold focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none ${
                                            errors.unit_price ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-slate-700'
                                        }`}
                                    />
                                </div>
                                {errors.unit_price && <p className="text-xs text-rose-500 font-medium mt-1">{errors.unit_price}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                                    Currency
                                </label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/60 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="CAD">CAD (C$)</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleClose}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-bold text-white shadow-md shadow-primary-600/20 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving Add-on...
                                    </>
                                ) : (
                                    'Create Add-on'
                                )}
                            </button>
                        </div>
                    </form>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default AddonFormModal;
