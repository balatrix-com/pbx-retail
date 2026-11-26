import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
    Briefcase, 
    Plus, 
    Search, 
    Edit2, 
    Trash2,
    Save, 
    X, 
    Info, 
    CheckCircle, 
    AlertCircle, 
    Loader2,
    DollarSign,
    Phone,
    Users,
    Activity,
    Settings
} from 'lucide-react';
import clsx from 'clsx';
import Pagination from '../../components/common/Pagination';

const PackagesPage = () => {
    const { isSuperAdmin } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        }
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/packages');
            // Sub-billing /plans returns { success: true, data: [...] }
            // The NestJS proxy passes this through as-is, so response.data is the wrapper.
            const raw = response.data;
            const list = Array.isArray(raw) ? raw
                : Array.isArray(raw?.data) ? raw.data
                : [];
            setPackages(list);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePackage = async (formData) => {
        try {
            setModalLoading(true);
            if (editingPackage) {
                await api.put(`/admin/packages/${editingPackage.plan_id}`, formData);
            } else {
                await api.post('/admin/packages', formData);
            }
            setShowModal(false);
            setEditingPackage(null);
            fetchData();
        } catch (error) {
            console.error('Failed to save package:', error);
            alert('Error saving package: ' + (error.response?.data?.message || error.message));
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeletePackage = async (planId) => {
        if (!window.confirm(`Are you sure you want to delete the package "${planId}"? This action cannot be undone.`)) {
            return;
        }
        try {
            setLoading(true);
            await api.delete(`/admin/packages/${planId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete package:', error);
            alert('Error deleting package: ' + (error.response?.data?.message || error.message));
            setLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
    }

    const filteredPackages = packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.plan_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.system_plan_id && pkg.system_plan_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const paginatedPackages = filteredPackages.slice((page - 1) * limit, page * limit);

    // Calculations
    const avgPrice = packages.length > 0
        ? packages.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0) / packages.length
        : 0;
    const mappedPackagesCount = packages.filter(p => !!p.system_plan_id).length;

    return (
        <div className="w-full pb-12 space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Package & Plan Management
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Create and manage billing plans, setup fees, and resource bundles.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingPackage(null);
                        setShowModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 w-full sm:w-auto cursor-pointer"
                >
                    <Plus size={16} />
                    Add New Package
                </button>
            </header>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="platform-panel-dark rounded-2xl p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Packages</span>
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
                            <Briefcase className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {loading ? '—' : packages.length}
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            Configured retail billing packages
                        </p>
                    </div>
                </div>

                <div className="platform-panel-dark rounded-2xl p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Monthly Rate</span>
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            ${avgPrice.toFixed(2)}
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            Across all active catalog tiers
                        </p>
                    </div>
                </div>

                <div className="platform-panel-dark rounded-2xl p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Mapped</span>
                        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
                            <Settings className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {mappedPackagesCount} <span className="text-sm font-bold text-gray-400">/ {packages.length}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            Linked to backend engine policies
                        </p>
                    </div>
                </div>
            </div>

            {/* Packages Grid / Table Section */}
            <section className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Active Catalog Plans
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-200/50 dark:border-white/5">{packages.length}</span>
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Available subscription and capacity tiers</p>
                        </div>
                    </div>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search catalog plans..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/75 dark:bg-[#12131a]">
                                <th className="px-4 md:px-6 py-4 text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">Package Details</th>
                                <th className="px-4 py-4 text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 text-center">Cost & Term</th>
                                <th className="hidden sm:table-cell px-4 py-4 text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 text-center">Bundled Limits</th>
                                <th className="hidden lg:table-cell px-4 py-4 text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">System Mapping</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading packages...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPackages.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium">No packages found</td>
                                </tr>
                            ) : paginatedPackages.map(pkg => (
                                <tr key={pkg.plan_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">{pkg.name}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{pkg.plan_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs md:text-sm font-extrabold text-gray-900 dark:text-white">
                                                ${parseFloat(pkg.amount).toFixed(2)}
                                                <span className="text-[10px] text-gray-400 font-normal"> / {pkg.validity_months}mo</span>
                                            </span>
                                            {pkg.setup_fees > 0 && (
                                                <span className="text-[10px] bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold mt-1 ring-1 ring-emerald-500/20">
                                                    Setup: ${parseFloat(pkg.setup_fees).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs mx-auto">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-500/10">
                                                <Users size={10} /> Exts: {pkg.extensions}
                                            </span>
                                            {pkg.numbers > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-500/10">
                                                    <Phone size={10} /> Numbers: {pkg.numbers}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-500/10">
                                                <Activity size={10} /> Monitors: {pkg.monitoring_extensions || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 py-4">
                                        <div className="flex flex-col text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {pkg.system_plan_id ? (
                                                <span className="font-mono bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-lg break-all max-w-[150px] inline-block border border-gray-200/50 dark:border-white/5">
                                                    {pkg.system_plan_id}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 font-medium italic">Unmapped</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setEditingPackage(pkg);
                                                    setShowModal(true);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                                                title="Edit Package"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePackage(pkg.plan_id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                                                title="Delete Package"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredPackages.length}
                    onPageChange={setPage}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="packages"
                />
            </section>

            {/* Add/Edit Modal */}
            {showModal && (
                <AddEditPackageModal
                    pkg={editingPackage}
                    onClose={() => setShowModal(false)}
                    onSave={handleSavePackage}
                    loading={modalLoading}
                />
            )}
        </div>
    );
};

const AddEditPackageModal = ({ pkg, onClose, onSave, loading }) => {
    const [formData, setFormData] = useState({
        plan_id: pkg?.plan_id || '',
        name: pkg?.name || '',
        amount: pkg?.amount || 0.00,
        currency: pkg?.currency || 'usd',
        validity_months: pkg?.validity_months || 1,
        numbers: pkg?.numbers || 0,
        extensions: pkg?.extensions || 0,
        monitoring_extensions: pkg?.monitoring_extensions || 0,
        system_plan_id: pkg?.system_plan_id || '',
        setup_fees: pkg?.setup_fees || 0.00,
        metadata: pkg?.metadata || {}
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-100 p-2.5 rounded-2xl">
                            <Briefcase className="text-primary-600 h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{pkg ? 'Edit' : 'New'} Package</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Configuration Panel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Plan ID (Unique Slug)</label>
                            <input
                                required
                                disabled={!!pkg}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                value={formData.plan_id}
                                onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                                placeholder="e.g. price_premium_monthly"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Plan Display Name</label>
                            <input
                                required
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Premium Monthly Plan"
                            />
                        </div>
                    </div>

                    {/* Cost & Validity */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                <DollarSign size={14} /> Price
                            </label>
                            <input
                                required
                                type="number" step="0.01" min="0"
                                className="w-full rounded-2xl border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                placeholder="9.99"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Currency</label>
                            <select
                                className="w-full rounded-2xl border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900 uppercase"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="usd">USD</option>
                                <option value="cad">CAD</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Cycle (Months)</label>
                            <input
                                required
                                type="number" min="1" step="1"
                                className="w-full rounded-2xl border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                value={formData.validity_months}
                                onChange={e => setFormData({ ...formData, validity_months: parseInt(e.target.value) || 1 })}
                                placeholder="1"
                            />
                        </div>
                    </div>

                    {/* Resources Limits Bundle */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Resource Bundle Limits</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={14} className="text-primary-500" /> Extensions Limit
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.extensions}
                                    onChange={e => setFormData({ ...formData, extensions: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Phone size={14} className="text-purple-500" /> Numbers (TFN + DID)
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.numbers}
                                    onChange={e => setFormData({ ...formData, numbers: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={14} className="text-primary-500" /> Monitor Licenses
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.monitoring_extensions}
                                    onChange={e => setFormData({ ...formData, monitoring_extensions: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Setup & External Mapping */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Setup & External Integration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign size={14} className="text-green-600" /> One-Time Setup Fee
                                </label>
                                <input
                                    type="number" step="0.01" min="0"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.setup_fees}
                                    onChange={e => setFormData({ ...formData, setup_fees: parseFloat(e.target.value) || 0.00 })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Settings size={14} /> System Plan ID (Stripe Price ID)
                                </label>
                                <input
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900 font-mono"
                                    value={formData.system_plan_id}
                                    onChange={e => setFormData({ ...formData, system_plan_id: e.target.value })}
                                    placeholder="e.g. price_1OabcXYZ..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-2xl bg-white text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 rounded-2xl bg-primary-600 text-sm font-black text-white shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save size={18} />}
                            {pkg ? 'Update' : 'Create'} Package
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PackagesPage;
