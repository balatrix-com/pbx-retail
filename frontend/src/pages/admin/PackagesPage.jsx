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

const PackagesPage = () => {
    const { isSuperAdmin } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2 md:gap-3">
                        <Briefcase className="text-primary-600 h-6 w-6 md:h-8 md:w-8" />
                        Package & Plan Management
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Create and manage billing plans, setup fees, and resource bundles</p>
                </div>
                <button
                    onClick={() => {
                        setEditingPackage(null);
                        setShowModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all w-full sm:w-auto"
                >
                    <Plus size={20} />
                    Add New Package
                </button>
            </header>

            {/* Packages Grid / Table Section */}
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Active Packages
                        <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{packages.length}</span>
                    </h2>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search packages..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Package Details</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Cost & Term</th>
                                <th className="hidden sm:table-cell px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Bundled Limits</th>
                                <th className="hidden lg:table-cell px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">System Mapping</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                            <p className="text-sm font-medium text-gray-500">Loading packages...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPackages.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No packages found</td>
                                </tr>
                            ) : filteredPackages.map(pkg => (
                                <tr key={pkg.plan_id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 text-sm">{pkg.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5">{pkg.plan_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs md:text-sm font-extrabold text-gray-900">
                                                ${parseFloat(pkg.amount).toFixed(2)}
                                                <span className="text-[10px] text-gray-400 font-normal"> / {pkg.validity_months}mo</span>
                                            </span>
                                            {pkg.setup_fees > 0 && (
                                                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-bold mt-1">
                                                    Setup: ${parseFloat(pkg.setup_fees).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xs mx-auto">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-500/10">
                                                <Users size={10} /> Exts: {pkg.extensions}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-500/10">
                                                <Activity size={10} /> Mins: {pkg.free_mins}
                                            </span>
                                            {(pkg.dids > 0 || pkg.tfns > 0) && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-500/10">
                                                    <Phone size={10} /> DIDs: {pkg.dids} | TFNs: {pkg.tfns}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 py-4">
                                        <div className="flex flex-col text-xs font-semibold text-gray-600">
                                            {pkg.system_plan_id ? (
                                                <span className="font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded-lg break-all max-w-[150px] inline-block">
                                                    {pkg.system_plan_id}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium italic">Unmapped</span>
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
                                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                title="Edit Package"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePackage(pkg.plan_id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Package"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
        tfns: pkg?.tfns || 0,
        dids: pkg?.dids || 0,
        free_mins: pkg?.free_mins || 0,
        extensions: pkg?.extensions || 0,
        monitoring_per_user: pkg?.monitoring_per_user || 0,
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
                                    <Activity size={14} className="text-orange-500" /> Free Minutes
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.free_mins}
                                    onChange={e => setFormData({ ...formData, free_mins: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Phone size={14} className="text-purple-500" /> Included DIDs
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.dids}
                                    onChange={e => setFormData({ ...formData, dids: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Phone size={14} className="text-purple-500" /> Included TFNs
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.tfns}
                                    onChange={e => setFormData({ ...formData, tfns: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={14} className="text-primary-500" /> Monitor Licenses
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2.5 px-4 font-bold text-gray-900"
                                    value={formData.monitoring_per_user}
                                    onChange={e => setFormData({ ...formData, monitoring_per_user: parseInt(e.target.value) || 0 })}
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
