import React, { useState, useEffect } from 'react';
import { 
    Package, 
    Plus, 
    Trash2, 
    Search, 
    RefreshCw, 
    Loader2, 
    Users, 
    Phone, 
    Hash, 
    ShieldCheck, 
    AlertCircle, 
    DollarSign,
    Layers,
    SlidersHorizontal
} from 'lucide-react';
import { addonsService } from '../../services/addons.service';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import AddonFormModal from './AddonFormModal';
import ConfirmActionModal from './ConfirmActionModal';

const RESOURCE_TYPE_CONFIG = {
    extension: {
        label: 'SIP Extension',
        icon: Users,
        badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    },
    tfn: {
        label: 'Toll-Free (TFN)',
        icon: Phone,
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    did: {
        label: 'DID Number',
        icon: Hash,
        badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    },
    supervisor: {
        label: 'Supervisor Seat',
        icon: ShieldCheck,
        badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    }
};

const AddonCatalogManagement = () => {
    const { addToast } = useToast();
    const { isSuperAdmin, isAdmin } = useAuth();
    const canManageAddons = isSuperAdmin || isAdmin;

    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deactivatingAddon, setDeactivatingAddon] = useState(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);

    useEffect(() => {
        loadCatalog();
    }, []);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const res = await addonsService.getAddonCatalog();
            const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            setCatalog(items);
        } catch (err) {
            console.error('Failed to load add-on catalog:', err);
            addToast('error', 'Failed to load add-on catalog');
            setCatalog([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDeactivate = async () => {
        if (!deactivatingAddon) return;
        setDeactivateLoading(true);
        try {
            const res = await addonsService.deleteAddonCatalogItem(deactivatingAddon.addon_id);
            addToast('success', res?.message || `Add-on "${deactivatingAddon.name}" deactivated successfully`);
            setDeactivatingAddon(null);
            loadCatalog();
        } catch (err) {
            console.error('Failed to deactivate add-on:', err);
            const msg = err.response?.data?.message || err.normalized?.message || err.message || 'Cannot deactivate add-on';
            addToast('error', msg);
        } finally {
            setDeactivateLoading(false);
        }
    };

    // Filter items
    const filteredCatalog = catalog.filter((item) => {
        // Filter out inactive items if any are returned
        if (item.is_active === false) return false;

        const matchesQuery = 
            (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.addon_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.resource_type || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = typeFilter === 'ALL' || item.resource_type === typeFilter;

        return matchesQuery && matchesType;
    });

    return (
        <div className="space-y-6">
            
            {/* Action Bar & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by add-on name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                        />
                    </div>

                    {/* Resource Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                    >
                        <option value="ALL">All Types</option>
                        <option value="extension">Extensions</option>
                        <option value="tfn">Toll-Free (TFN)</option>
                        <option value="did">DIDs</option>
                        <option value="supervisor">Supervisors</option>
                    </select>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={loadCatalog}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>

                    {canManageAddons && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-600/20 hover:bg-primary-700 transition-all"
                        >
                            <Plus size={18} />
                            Add Addon
                        </button>
                    )}
                </div>
            </div>

            {/* Catalog Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-2" />
                        <p className="text-sm font-medium">Loading add-on catalog...</p>
                    </div>
                ) : filteredCatalog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
                            <Package className="h-8 w-8" />
                        </div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">No Add-ons Found</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
                            {searchQuery || typeFilter !== 'ALL'
                                ? 'No catalog items match the active filters.'
                                : 'The add-on catalog is currently empty. Click "Add Addon" to define new bundles.'}
                        </p>
                        {canManageAddons && !searchQuery && typeFilter === 'ALL' && (
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-xs font-bold text-white shadow-sm hover:bg-primary-700 transition-all"
                            >
                                <Plus size={16} />
                                Create First Add-on
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    <th className="py-3.5 px-6">Name & ID</th>
                                    <th className="py-3.5 px-6">Resource Type</th>
                                    <th className="py-3.5 px-6">Bundle Units</th>
                                    <th className="py-3.5 px-6">Unit Price</th>
                                    <th className="py-3.5 px-6">Currency</th>
                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                                {filteredCatalog.map((item) => {
                                    const resourceConfig = RESOURCE_TYPE_CONFIG[item.resource_type] || {
                                        label: item.resource_type || 'Custom',
                                        icon: Layers,
                                        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200'
                                    };
                                    const ResourceIcon = resourceConfig.icon;

                                    return (
                                        <tr 
                                            key={item.addon_id || item.id}
                                            className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            {/* Name & ID */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 dark:text-white">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-xs font-mono text-gray-400 dark:text-slate-500 mt-0.5">
                                                            {item.addon_id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Resource Type */}
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${resourceConfig.badgeClass}`}>
                                                    <ResourceIcon className="h-3.5 w-3.5" />
                                                    {resourceConfig.label}
                                                </span>
                                            </td>

                                            {/* Bundle Units */}
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    item.units_count > 1
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                                                }`}>
                                                    {item.units_count > 1 ? `${item.units_count} Units / Pack` : 'Single Unit'}
                                                </span>
                                            </td>

                                            {/* Unit Price */}
                                            <td className="py-4 px-6">
                                                <div className="font-extrabold font-mono text-gray-900 dark:text-white">
                                                    ${Number(item.unit_price || 0).toFixed(2)}
                                                    <span className="text-xs font-normal text-gray-400 dark:text-slate-500 font-sans"> / mo</span>
                                                </div>
                                            </td>

                                            {/* Currency */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                                    {item.currency || 'USD'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                {canManageAddons ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeactivatingAddon(item)}
                                                        title="Deactivate Add-on"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/40 transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span>Deactivate</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Addon Modal */}
            <AddonFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={loadCatalog}
            />

            {/* Deactivate Addon Confirmation Modal */}
            <ConfirmActionModal
                isOpen={!!deactivatingAddon}
                onClose={() => setDeactivatingAddon(null)}
                onConfirm={handleConfirmDeactivate}
                title="Deactivate Add-on"
                message={`Deactivate add-on "${deactivatingAddon?.name}"? It will no longer be available for purchase.`}
                confirmText="Deactivate"
                cancelText="Cancel"
                isDanger={true}
                loading={deactivateLoading}
            />

        </div>
    );
};

export default AddonCatalogManagement;
