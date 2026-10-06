import React, { useState, useEffect } from 'react';
import { X, Wallet, Phone, Users, Info, Building2, Plus, Trash2, Loader, CreditCard, RefreshCw, User, LogIn, Sliders, ShieldAlert, Clock, Server, Mic, Zap, Loader2, Radio, HardDrive, Activity, Package, Palette, Edit3, Save, Check, CheckCircle2, Globe, MapPin, Mail, Lock, Eye, EyeOff, Search, Pencil } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import MonitoringExtensionModal from '../../../components/admin/MonitoringExtensionModal';
import { formatCustomerId } from '../../../utils/billing.utils';
import { subscriptionService } from '../../../services/subscription.service';
import AddonPurchaseModal from '../../../components/subscription/AddonPurchaseModal';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'numbers', label: 'Numbers', icon: Phone },
    { id: 'extensions', label: 'Extensions', icon: Users },
    { id: 'users', label: 'Users', icon: User },
    { id: 'features', label: 'Feature Controller', icon: Sliders },
    { id: 'carrier', label: 'Outbound Carrier', icon: Server },
    { id: 'addons', label: 'Add-ons', icon: CreditCard },
    { id: 'customize', label: 'Customize', icon: Palette }
];

const TenantManager = ({ tenantId, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [tenant, setTenant] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch tenant details on mount and refresh
    useEffect(() => {
        fetchTenantDetails();
    }, [tenantId, refreshTrigger]);

    const fetchTenantDetails = async () => {
        setLoading(true);

        try {
            const [tenantRes, subscriptionRes] = await Promise.all([
                api.get(`/tenants/${tenantId}`),
                subscriptionService.getSubscription(tenantId)
            ]);

            setTenant(tenantRes.data);
            setSubscription(subscriptionRes);
        } catch (err) {
            console.error('Failed to fetch tenant details:', err);
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    if (loading && !tenant) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl"><Loader className="animate-spin" /></div>
            </div>
        );
    }

    if (!tenant) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-[1040px] max-w-[95vw] h-[640px] max-h-[90vh] overflow-hidden flex flex-col ring-1 ring-gray-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-50 p-2.5 rounded-xl ring-1 ring-inset ring-primary-100 shadow-sm">
                            <Building2 className="text-primary-600 h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{tenant.name}</h2>
                            <p className="text-sm font-mono text-gray-500 font-medium">ID: {tenant.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-56 bg-gray-50/50 border-r border-gray-100 flex flex-col p-4 space-y-1.5 shrink-0 overflow-y-auto">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-extrabold transition-all ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md font-bold'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                                        }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-8 bg-white">
                        {activeTab === 'overview' && (<OverviewTab tenant={tenant} subscription={subscription} />)}
                        {activeTab === 'wallet' && <WalletTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'numbers' && <NumbersTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'extensions' && <ExtensionsTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'users' && <UsersTab tenant={tenant} />}
                        {activeTab === 'features' && <FeaturesTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'carrier' && <CarrierTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'addons' && <AddonsTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'customize' && <CustomizeTab tenant={tenant} onUpdate={handleRefresh} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const OverviewTab = ({ tenant, subscription }) => (
    <div className="space-y-6 w-full">
        <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Organization Overview</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Core platform details and system status for this tenant.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        Company Code
                    </div>
                    <p className="text-2xl font-mono font-extrabold text-gray-900">{formatCustomerId(tenant.customerCode)}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        Created At
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        {new Date(tenant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${tenant.serviceBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        System Status
                    </div>
                    <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset uppercase tracking-wider ${tenant.serviceBlocked ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-green-50 text-green-700 ring-green-600/20'
                            }`}>
                            {tenant.serviceBlocked ? 'Blocked' : 'Active'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                        Total Users
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">{tenant.stats?.users || 0}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        Current Subscription
                    </div>
                    <p className="text-2xl font-mono font-extrabold text-gray-900">
                        {subscription?.plan?.name || subscription?.planName || subscription?.plan_name || 'No Active Plan'}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const WalletTab = ({ tenant, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('CREDIT');
    const [description, setDescription] = useState('Admin adjustment');
    const [loading, setLoading] = useState(false);

    const [creditLimitInput, setCreditLimitInput] = useState('');
    const [creditLimitLoading, setCreditLimitLoading] = useState(false);

    // Sync input value with current creditLimit when tenant changes
    useEffect(() => {
        if (tenant?.wallet?.creditLimit !== undefined) {
            setCreditLimitInput(String(tenant.wallet.creditLimit));
        }
    }, [tenant]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/wallet/internal-adjust', {
                targetTenantId: tenant.id,
                amount: Number(amount),
                type,
                description
            });
            setAmount('');
            onUpdate();
        } catch (err) {
            alert('Failed to update wallet: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCreditLimitSubmit = async (e) => {
        e.preventDefault();
        setCreditLimitLoading(true);
        try {
            await api.post('/wallet/credit-limit', {
                targetTenantId: tenant.id,
                creditLimit: Number(creditLimitInput)
            });
            onUpdate();
        } catch (err) {
            alert('Failed to update credit limit: ' + (err.response?.data?.message || err.message));
        } finally {
            setCreditLimitLoading(false);
        }
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex sm:justify-between sm:items-center flex-col sm:flex-row gap-4">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Wallet Management</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Adjust tenant funds and view balance.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl shadow-sm ring-1 ring-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 text-right">Current Balance</p>
                        <p className={`text-3xl font-mono font-extrabold tracking-tight ${Number(tenant.wallet?.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${Number(tenant.wallet?.balance || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl shadow-sm ring-1 ring-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 text-right">Credit Limit</p>
                        <p className="text-3xl font-mono font-extrabold tracking-tight text-gray-900">
                            ${Number(tenant.wallet?.creditLimit || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Administrative Adjustment Card */}
                <div className="bg-gray-50/50 p-6 sm:p-8 rounded-2xl ring-1 ring-inset ring-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h4 className="text-base font-extrabold text-gray-900 mb-6 flex items-center gap-2 tracking-tight">
                            <CreditCard className="h-5 w-5 text-primary-500" /> Administrative Adjustment
                        </h4>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Transaction Type</label>
                                    <select
                                        className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                    >
                                        <option value="CREDIT">Add Credit (Deposit)</option>
                                        <option value="DEBIT">Remove Credit (Charge)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-500 sm:text-sm font-medium">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="block w-full rounded-xl border-0 py-2.5 pl-7 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all font-mono"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description (Internal Note)</label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="E.g., Platform fee adjustment"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <><Loader className="animate-spin -ml-1 mr-2 h-4 w-4" /> Processing...</>
                                    ) : (
                                        'Process Transaction'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Edit Credit Limit Card */}
                <div className="bg-gray-50/50 p-6 sm:p-8 rounded-2xl ring-1 ring-inset ring-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h4 className="text-base font-extrabold text-gray-900 mb-6 flex items-center gap-2 tracking-tight">
                            <CreditCard className="h-5 w-5 text-primary-500" /> Credit Limit Control
                        </h4>
                        <form onSubmit={handleCreditLimitSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tenant Credit Limit</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm font-medium">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="block w-full rounded-xl border-0 py-2.5 pl-7 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all font-mono"
                                        value={creditLimitInput}
                                        onChange={e => setCreditLimitInput(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Determines how much negative balance this tenant is permitted before outbound services are restricted.
                                </p>
                            </div>
                            <div className="flex justify-end pt-8">
                                <button
                                    type="submit"
                                    disabled={creditLimitLoading}
                                    className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creditLimitLoading ? (
                                        <><Loader className="animate-spin -ml-1 mr-2 h-4 w-4" /> Updating...</>
                                    ) : (
                                        'Update Credit Limit'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NumbersTab = ({ tenant, onUpdate }) => {
    const [assets, setAssets] = useState({ tfns: [], dids: [] });
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState(null); // { type: 'tfn' | 'did', item: assetItem }
    const [editModal, setEditModal] = useState(null); // { type: 'tfn' | 'did', item: assetItem, phoneNumber: string }
    const [actionLoading, setActionLoading] = useState(false);
    const [tfnSearch, setTfnSearch] = useState('');
    const [didSearch, setDidSearch] = useState('');
    const { addToast } = useToast() || {};

    useEffect(() => {
        if (tenant?.id) {
            fetchAssets();
        }
    }, [tenant?.id]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/wallet/assets?tenantId=${tenant.id}`);
            setAssets({
                tfns: Array.isArray(res.data?.tfns) ? res.data.tfns : [],
                dids: Array.isArray(res.data?.dids) ? res.data.dids : []
            });
        } catch (err) {
            console.error('Failed to fetch assets:', err);
            // Fallback to subscription endpoints if needed
            try {
                const [tfnRes, didRes] = await Promise.all([
                    api.get(`/subscription/tfns?tenantId=${tenant.id}`),
                    api.get(`/subscription/dids?tenantId=${tenant.id}`).catch(() => ({ data: [] }))
                ]);
                setAssets({
                    tfns: Array.isArray(tfnRes.data) ? tfnRes.data : [],
                    dids: Array.isArray(didRes.data) ? didRes.data : []
                });
            } catch (fallbackErr) {
                console.error('Fallback fetch also failed', fallbackErr);
                setAssets({ tfns: [], dids: [] });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnassign = async (type, number) => {
        if (!number) return;
        if (!window.confirm(`Are you sure you want to unassign ${number}?`)) return;

        setActionLoading(true);
        try {
            const endpoint = type === 'tfn' ? '/subscription/tfns/unassign' : '/subscription/dids/unassign';
            await api.post(endpoint, { number });
            if (addToast) addToast('success', `${number} unassigned successfully`);
            await fetchAssets();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error(`Failed to unassign ${type}:`, err);
            const msg = err.response?.data?.message || `Failed to unassign ${number}`;
            if (addToast) addToast('error', msg);
            else alert(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const renderAssetTable = (title, items, type, numberField, searchValue, setSearchValue) => {
        const filteredItems = items.filter(item => {
            if (!searchValue) return true;
            const query = searchValue.toLowerCase();
            const phoneNumber = (item[numberField] || item.number || item.phone_number || '').toLowerCase();
            const sourceId = (item.source_id || item.sourceId || '').toLowerCase();
            const sourceType = (item.source_type || item.sourceType || '').toLowerCase();
            return phoneNumber.includes(query) || sourceId.includes(query) || sourceType.includes(query);
        });

        return (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {title} ({filteredItems.length}{filteredItems.length !== items.length ? ` of ${items.length}` : ''})
                    </h4>
                    {/* Search Engine on Top Right */}
                    <div className="relative w-full sm:w-64">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <Search size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder={`Search ${type === 'tfn' ? 'TFN' : 'DID'} or Source...`}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="block w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-2xs"
                        />
                        {searchValue && (
                            <button
                                type="button"
                                onClick={() => setSearchValue('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <Phone className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-500">
                                {items.length === 0
                                    ? `No ${title.toLowerCase()} configured for this tenant.`
                                    : `No matches found for "${searchValue}".`}
                            </p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/75">
                                <tr>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                                        Source ID
                                    </th>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                                        Source Type
                                    </th>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                                        Phone Number
                                    </th>
                                    <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredItems.map((item, idx) => {
                                    const phoneNumber = item[numberField] || item.number || item.phone_number || '';
                                    const isAssigned = !!phoneNumber;
                                    const sourceType = (item.source_type || item.sourceType || 'PLAN').toUpperCase();

                                    return (
                                        <tr key={item.id || item.source_id || idx} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-gray-900 font-mono">
                                                {item.source_id || item.sourceId || 'N/A'}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-xs">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${sourceType === 'PLAN'
                                                    ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20'
                                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                    }`}>
                                                    {sourceType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm">
                                                {isAssigned ? (
                                                    <span className="font-mono font-bold text-gray-900 flex items-center gap-1.5">
                                                        <Phone size={13} className="text-primary-600" />
                                                        {phoneNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs font-medium">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isAssigned ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Edit Number Details & Routing"
                                                                onClick={() => setEditModal({ type, item, phoneNumber })}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 ring-1 ring-inset ring-gray-300 transition-all active:scale-[0.98]"
                                                            >
                                                                <Pencil size={12} className="text-gray-600" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading}
                                                                onClick={() => handleUnassign(type, phoneNumber)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                                            >
                                                                <Trash2 size={12} />
                                                                Unassign
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading}
                                                            onClick={() => setAssignModal({ type, item })}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 ring-1 ring-inset ring-primary-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                                        >
                                                            <Plus size={13} />
                                                            Assign Number
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Phone Numbers</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Manage DIDs and Toll-Free Numbers assigned to this tenant.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAssets}
                        disabled={loading || actionLoading}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none disabled:opacity-50"
                        title="Refresh numbers"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TFNs Table */}
                    {renderAssetTable('Toll-Free Numbers (TFNs)', assets.tfns, 'tfn', 'tfn_number', tfnSearch, setTfnSearch)}

                    {/* DIDs Table */}
                    {renderAssetTable('Local / Mobile Numbers (DIDs)', assets.dids, 'did', 'did_number', didSearch, setDidSearch)}
                </div>
            )}

            {/* Assign Number Modal */}
            {assignModal && (
                <AssignNumberModal
                    type={assignModal.type}
                    targetItem={assignModal.item}
                    tenantId={tenant.id}
                    onClose={() => setAssignModal(null)}
                    onSuccess={() => {
                        setAssignModal(null);
                        fetchAssets();
                        if (onUpdate) onUpdate();
                    }}
                />
            )}

            {/* Edit Number Routing & Details Modal */}
            {editModal && (
                <EditNumberModal
                    type={editModal.type}
                    phoneNumber={editModal.phoneNumber}
                    targetItem={editModal.item}
                    tenantId={tenant.id}
                    onClose={() => setEditModal(null)}
                    onSuccess={() => {
                        setEditModal(null);
                        fetchAssets();
                        if (onUpdate) onUpdate();
                    }}
                />
            )}
        </div>
    );
};

// Modal for editing number details & routing (TFN or DID)
const EditNumberModal = ({ type, phoneNumber, targetItem, tenantId, onClose, onSuccess }) => {
    const isTfn = type === 'tfn';
    const title = isTfn ? 'Toll-Free Number (TFN)' : 'Direct Inward Dialing (DID)';

    const [routeType, setRouteType] = useState('extension');
    const [routeDestinationId, setRouteDestinationId] = useState('');
    const [forwardNumber, setForwardNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [destinations, setDestinations] = useState({
        extensions: [],
        ringGroups: [],
        ivrs: [],
        schedules: []
    });
    const { addToast } = useToast() || {};

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch existing details for this number and available route targets in parallel
                const [numberRes, extRes, rgRes, ivrRes, schedRes] = await Promise.all([
                    api.get(`/telecom/${isTfn ? 'tfns' : 'dids'}/${phoneNumber}`, {
                        params: { tenantId }
                    }).catch(() => null),
                    api.get(`/telecom/extensions?tenantId=${tenantId}`).catch(() => ({ data: [] })),
                    api.get(`/telecom/ring-groups?tenantId=${tenantId}`).catch(() => ({ data: [] })),
                    api.get(`/telecom/ivrs?tenantId=${tenantId}`).catch(() => ({ data: [] })),
                    api.get(`/telecom/operational-schedules?tenantId=${tenantId}`).catch(() => ({ data: [] })),
                ]);

                setDestinations({
                    extensions: Array.isArray(extRes?.data) ? extRes.data : [],
                    ringGroups: Array.isArray(rgRes?.data) ? rgRes.data : [],
                    ivrs: Array.isArray(ivrRes?.data) ? ivrRes.data : [],
                    schedules: Array.isArray(schedRes?.data) ? schedRes.data : []
                });

                if (numberRes?.data) {
                    const data = numberRes.data;
                    const rType = data.routeType || (data.forwardEnabled ? 'forward' : 'extension');
                    setRouteType(rType);
                    setRouteDestinationId(data.routeTargetId || '');
                    setForwardNumber(data.forwardNumber || '');
                }
            } catch (err) {
                console.error('Failed to fetch number route details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [phoneNumber, tenantId, isTfn]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const endpoint = `/telecom/${isTfn ? 'tfns' : 'dids'}/${phoneNumber}`;
            const payload = {
                tenantId,
                routeType,
                routeDestinationId: routeType === 'forward' ? undefined : routeDestinationId,
                forwardNumber: routeType === 'forward' ? forwardNumber : undefined,
                ...(isTfn ? { tfnNumber: phoneNumber } : { didNumber: phoneNumber })
            };

            await api.put(endpoint, payload);
            if (addToast) addToast('success', `${phoneNumber} routing updated successfully`);
            onSuccess();
        } catch (err) {
            console.error('Failed to update number routing:', err);
            const msg = err.response?.data?.message || 'Failed to update number routing';
            if (addToast) addToast('error', msg);
            else alert(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col ring-1 ring-gray-200">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                            <Pencil size={18} />
                        </div>
                        <div>
                            <h4 className="text-base font-extrabold text-gray-900 tracking-tight">Edit {title}</h4>
                            <p className="text-xs font-mono font-bold text-primary-600 mt-0.5">{phoneNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                    Assigned Number
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={phoneNumber}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono font-bold text-gray-700 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                    Call Route Destination
                                </label>
                                <select
                                    value={routeType}
                                    onChange={(e) => {
                                        setRouteType(e.target.value);
                                        setRouteDestinationId('');
                                    }}
                                    className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                >
                                    <option value="extension">Direct Extension</option>
                                    <option value="ring_group">Ring Group</option>
                                    <option value="ivr">Interactive Voice Response (IVR)</option>
                                    <option value="schedule">Operational Schedule</option>
                                    <option value="forward">External Number (Forward)</option>
                                </select>
                            </div>

                            {routeType === 'extension' && (
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                        Select Extension
                                    </label>
                                    <select
                                        value={routeDestinationId}
                                        onChange={(e) => setRouteDestinationId(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                    >
                                        <option value="">-- Choose Extension --</option>
                                        {destinations.extensions.map((ext) => (
                                            <option key={ext.id} value={ext.id}>
                                                Ext {ext.extensionNumber} {ext.name ? `(${ext.name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {routeType === 'ring_group' && (
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                        Select Ring Group
                                    </label>
                                    <select
                                        value={routeDestinationId}
                                        onChange={(e) => setRouteDestinationId(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                    >
                                        <option value="">-- Choose Ring Group --</option>
                                        {destinations.ringGroups.map((rg) => (
                                            <option key={rg.id} value={rg.id}>
                                                {rg.name} {rg.extensionNumber ? `(Ext ${rg.extensionNumber})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {routeType === 'ivr' && (
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                        Select IVR Menu
                                    </label>
                                    <select
                                        value={routeDestinationId}
                                        onChange={(e) => setRouteDestinationId(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                    >
                                        <option value="">-- Choose IVR --</option>
                                        {destinations.ivrs.map((ivr) => (
                                            <option key={ivr.id} value={ivr.id}>
                                                {ivr.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {routeType === 'schedule' && (
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                        Select Schedule
                                    </label>
                                    <select
                                        value={routeDestinationId}
                                        onChange={(e) => setRouteDestinationId(e.target.value)}
                                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                    >
                                        <option value="">-- Choose Operational Schedule --</option>
                                        {destinations.schedules.map((sch) => (
                                            <option key={sch.id} value={sch.id}>
                                                {sch.name} ({sch.startTime} - {sch.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {routeType === 'forward' && (
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
                                        External Forwarding Number (E.164)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+18005550199"
                                        value={forwardNumber}
                                        onChange={(e) => setForwardNumber(e.target.value)}
                                        required
                                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Incoming calls will be immediately bridged to this external number.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                    {saving && <Loader2 size={13} className="animate-spin" />}
                                    Save Routing Changes
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

const ExtensionsTab = ({ tenant, onUpdate }) => {
    const [extensions, setExtensions] = useState([]);
    const [monitoringUsers, setMonitoringUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newExt, setNewExt] = useState({ name: '', password: '' });
    const [predictedExt, setPredictedExt] = useState('...');

    // Monitoring Edit State
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);
    const [selectedMonitoringUser, setSelectedMonitoringUser] = useState(null);

    useEffect(() => {
        fetchExtensions();
    }, [tenant.id]);

    // Fetch the real next extension number from the backend whenever the Add modal opens
    useEffect(() => {
        if (!showAdd) return;
        const fetchNextNumber = async () => {
            try {
                const res = await api.get('/telecom/extensions/next-number', { params: { tenantId: tenant.id } });
                if (res.data.nextExtensionNumber) {
                    setPredictedExt(res.data.nextExtensionNumber.toString());
                }
            } catch (err) {
                console.error('Failed to fetch next extension number', err);
            }
        };
        fetchNextNumber();
    }, [showAdd, tenant.id]);

    const fetchExtensions = async () => {
        setLoading(true);
        try {
            const [extRes, usersRes] = await Promise.all([
                api.get(`/telecom/extensions?tenantId=${tenant.id}`),
                api.get(`/users?tenantId=${tenant.id}`)
            ]);

            setExtensions(extRes.data);

            // Filter users for monitoring extensions
            const users = usersRes.data.data || [];
            const monitoring = users.filter(u => u.monitoringEnabled && u.monitoringExtension);
            setMonitoringUsers(monitoring);
        } catch (err) {
            console.error('Failed to fetch extensions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExtension = async (e) => {
        e.preventDefault();
        try {
            await api.post('/telecom/extensions', {
                targetTenantId: tenant.id,
                name: newExt.name,
                password: newExt.password
            });
            setShowAdd(false);
            setNewExt({ name: '', password: '' });
            fetchExtensions();
            onUpdate();
        } catch (err) {
            alert('Failed to add extension: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEditMonitoring = (user) => {
        setSelectedMonitoringUser(user);
        setShowMonitoringModal(true);
    };

    const handleUpdateMonitoring = async ({ monitoringExtension, monitoringSecret, name }) => {
        if (!selectedMonitoringUser) return;
        try {
            await api.patch(`/users/${selectedMonitoringUser.id}/permissions`, {
                monitoringEnabled: true,
                monitoringExtension,
                monitoringSecret,
                name
            });
            setShowMonitoringModal(false);
            setSelectedMonitoringUser(null);
            fetchExtensions(); // Refresh
        } catch (err) {
            console.error("Failed to update monitoring user", err);
            alert("Failed to update: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDisableMonitoring = async (user) => {
        if (!window.confirm(`Are you sure you want to disable monitoring for ${user.name || user.email}?`)) {
            return;
        }

        try {
            await api.patch(`/users/${user.id}/permissions`, {
                monitoringEnabled: false,
                monitoringExtension: null, // Clear these too nicely
                monitoringSecret: null
            });
            fetchExtensions();
        } catch (err) {
            console.error('Failed to disable monitoring:', err);
            alert('Failed to disable monitoring: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteExtension = async (extension) => {
        if (!window.confirm(`Are you sure you want to delete extension ${extension.extensionNumber}?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/extensions/${extension.id}`, {
                params: { tenantId: tenant.id }
            });
            fetchExtensions();
            onUpdate();
        } catch (err) {
            console.error('Failed to delete extension:', err);
            alert('Failed to delete extension: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Extensions</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Manage standard and monitoring lines.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 gap-1.5"
                    >
                        <Plus size={16} /> Add Extension
                    </button>
                    <button
                        onClick={fetchExtensions}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-primary-600 h-8 w-8" />
                </div>
            ) : (
                <>
                    {/* Standard Extensions list */}
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14} className="text-gray-400" /> Standard Extensions
                            </h4>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {extensions.length === 0 ? <div className="col-span-full text-center py-6 text-sm font-medium text-gray-500">No standard extensions found.</div> :
                                    extensions.map(ext => (
                                        <div key={ext.id} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                            <div>
                                                <span className="font-mono font-extrabold text-sm text-gray-900 mr-2">{ext.extensionNumber}</span>
                                                <span className="text-sm font-medium text-gray-600">{ext.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded ring-1 ring-inset ring-gray-500/10">
                                                    {ext.ringGroupMembers?.length > 0 ? 'Ring Grp' : 'Std'}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteExtension(ext)}
                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:outline-none"
                                                    title="Delete Extension"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    {/* Monitoring Extensions Section */}
                    {monitoringUsers.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden mt-6">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={14} className="text-blue-500" /> Monitoring Extensions
                                </h4>
                            </div>
                            <div className="p-5">
                                <div className="space-y-3 max-w-2xl">
                                    {monitoringUsers.map(user => (
                                        <div key={user.id} className="flex justify-between items-center bg-blue-50/30 p-4 rounded-xl ring-1 ring-inset ring-blue-100 shadow-sm hover:shadow-md transition-all">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono font-extrabold text-sm text-blue-900">{user.monitoringExtension}</span>
                                                    <span className="text-sm font-bold text-blue-800">{user.name || 'Unnamed'}</span>
                                                </div>
                                                <p className="text-xs font-medium text-blue-600/80">{user.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditMonitoring(user)}
                                                    className="inline-flex justify-center items-center rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 hover:bg-blue-50 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDisableMonitoring(user)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none"
                                                    title="Disable Monitoring"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAdd(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ring-1 ring-gray-200 p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">Add Extension</h4>
                            <button onClick={() => setShowAdd(false)} className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExtension} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Predicted Number</label>
                                <input
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-200 bg-gray-50 sm:text-sm font-medium font-mono cursor-not-allowed"
                                    disabled
                                    value={predictedExt}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Name</label>
                                <input
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                                    placeholder="E.g., Support Team"
                                    value={newExt.name}
                                    onChange={e => setNewExt({ ...newExt, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">SIP Password</label>
                                <input
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all font-mono"
                                    placeholder="Secure password"
                                    type="text"
                                    value={newExt.password}
                                    onChange={e => setNewExt({ ...newExt, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAdd(false)}
                                    className="inline-flex justify-center items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    Create Extension
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMonitoringModal && selectedMonitoringUser && (
                <MonitoringExtensionModal
                    onClose={() => {
                        setShowMonitoringModal(false);
                        setSelectedMonitoringUser(null);
                    }}
                    onSubmit={handleUpdateMonitoring}
                    initialExtension={selectedMonitoringUser.monitoringExtension}
                    initialSecret={selectedMonitoringUser.monitoringSecret}
                    initialName={selectedMonitoringUser.name}
                    isEditing={true}
                    tenantId={tenant.id}
                />
            )}
        </div>
    );
};

// Modal for assigning numbers from available inventory (TFN or DID)
const AssignNumberModal = ({ type, targetItem, tenantId, onClose, onSuccess }) => {
    const [available, setAvailable] = useState([]);
    const [selectedNumber, setSelectedNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast() || {};

    const isTfn = type === 'tfn';
    const title = isTfn ? 'Toll-Free Number (TFN)' : 'Direct Inward Dialing (DID)';

    useEffect(() => {
        const fetchAvailable = async () => {
            setLoading(true);
            try {
                const endpoint = isTfn ? '/subscription/tfns/available' : '/subscription/dids/available';
                const res = await api.get(endpoint);
                const list = Array.isArray(res.data) ? res.data : [];
                setAvailable(list);
                if (list.length > 0) {
                    setSelectedNumber(list[0].number || list[0].id || '');
                }
            } catch (err) {
                console.error('Failed to fetch available inventory:', err);
                if (addToast) addToast('error', 'Failed to load available inventory');
            } finally {
                setLoading(false);
            }
        };

        fetchAvailable();
    }, [isTfn]);

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedNumber) return;

        setSubmitting(true);
        try {
            const endpoint = isTfn ? '/subscription/tfns/assign' : '/subscription/dids/assign';
            await api.post(endpoint, {
                number: selectedNumber,
                tenantId: tenantId
            });

            if (addToast) addToast('success', `${selectedNumber} assigned successfully`);
            onSuccess();
        } catch (err) {
            console.error('Failed to assign number:', err);
            const msg = err.response?.data?.message || 'Failed to assign number';
            if (addToast) addToast('error', msg);
            else alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ring-1 ring-gray-200">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">Assign {title}</h4>
                        {targetItem?.source_id && (
                            <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                                Slot: {targetItem.source_id}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleAssign} className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
                        </div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-8">
                            <Phone className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-600">No available {title} inventory found.</p>
                            <p className="text-xs text-gray-400 mt-1">Add more numbers to global inventory in Numbers Management.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                                Select Number from Inventory
                            </label>
                            <select
                                className="block w-full rounded-xl border-0 py-3 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 text-sm font-mono font-bold bg-white transition-all"
                                value={selectedNumber}
                                onChange={(e) => setSelectedNumber(e.target.value)}
                                required
                            >
                                {available.map((num) => {
                                    const val = num.number || num.id;
                                    return (
                                        <option key={num.id || val} value={val}>
                                            {val} {num.provider ? `(${num.provider})` : ''} {num.isDemo ? '• Demo' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex justify-center items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading || available.length === 0}
                            className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Assigning...</>
                            ) : (
                                'Assign Number'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UsersTab = ({ tenant }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { } = useAuth();
    const [impersonatingId, setImpersonatingId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [tenant.id]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/users?tenantId=${tenant.id}`);
            setUsers(res.data.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async (userId) => {
        if (!window.confirm('Open impersonation session in a new tab?')) return;

        setImpersonatingId(userId);
        try {
            const response = await api.post(`/users/impersonate/${userId}`);
            const { accessToken, refreshToken } = response.data;
            const url = `/impersonate?token=${accessToken}&refresh=${refreshToken}`;
            window.open(url, '_blank');
        } catch (err) {
            alert('Impersonation failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setImpersonatingId(null);
        }
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Users</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Manage users and impersonation sessions.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-primary-600 h-8 w-8" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden text-left">
                    {users.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p className="text-sm font-medium text-gray-500">No users found for this tenant.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {users.map(user => (
                                <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-gray-100 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-inset ring-gray-200">
                                            <span className="text-sm font-extrabold text-gray-600">
                                                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-extrabold text-sm text-gray-900">{user.name || 'Unnamed User'}</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                                    user.role === 'SUPPORT' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                        'bg-gray-50 text-gray-600 ring-gray-500/10'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0">
                                        <button
                                            onClick={() => handleImpersonate(user.id)}
                                            disabled={impersonatingId === user.id}
                                            className="inline-flex justify-center items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-primary-600 shadow-sm ring-1 ring-inset ring-primary-200 hover:bg-primary-50 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {impersonatingId === user.id ? <Loader className="animate-spin h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                                            Impersonate
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FeaturesTab = ({ tenant, onUpdate }) => {
    const [features, setFeatures] = useState(tenant.tenantFeatures || {
        ivrEnabled: true,
        ivrLimit: 10,
        ringGroupEnabled: true,
        ringGroupLimit: 10,
        schedulerEnabled: true,
        schedulerLimit: 10,
        didForwardEnabled: true,
        didForwardLimit: 10,
    });
    const [updatingFeature, setUpdatingFeature] = useState(null);
    const [adminUser, setAdminUser] = useState(null);
    const [userMonitoringEnabled, setUserMonitoringEnabled] = useState(false);
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);

    // Fetch tenant admin user to know user-level monitoring status
    useEffect(() => {
        fetchAdminUser();
    }, [tenant.id]);

    const fetchAdminUser = async () => {
        try {
            const res = await api.get(`/users?tenantId=${tenant.id}`);
            const usersList = res.data?.data || [];
            // Find tenant admin (or first user)
            const targetAdmin = usersList.find(u => u.role === 'ADMIN') || usersList[0] || null;
            setAdminUser(targetAdmin);
            setUserMonitoringEnabled(targetAdmin?.monitoringEnabled || false);
        } catch (err) {
            console.error('Failed to fetch admin user for monitoring toggle:', err);
        }
    };

    // Keep state in sync if tenant prop updates
    useEffect(() => {
        if (tenant.tenantFeatures) {
            setFeatures(tenant.tenantFeatures);
        }
    }, [tenant.tenantFeatures]);

    const handleToggle = async (key) => {
        if (key === 'monitoringEnabled') {
            if (!adminUser) {
                alert('No admin user found for this tenant to configure monitoring permissions.');
                return;
            }

            if (!userMonitoringEnabled) {
                // Opening modal to collect monitoring extension and secret
                setShowMonitoringModal(true);
            } else {
                // Turn OFF via user permissions API
                setUpdatingFeature('monitoringEnabled');
                try {
                    await api.patch(`/users/${adminUser.id}/permissions`, {
                        monitoringEnabled: false
                    });
                    setUserMonitoringEnabled(false);
                    await fetchAdminUser();
                    onUpdate();
                } catch (err) {
                    console.error('Failed to disable monitoring:', err);
                    alert('Failed to disable monitoring: ' + (err.response?.data?.message || err.message));
                } finally {
                    setUpdatingFeature(null);
                }
            }
            return;
        }

        setUpdatingFeature(key);
        const updatedFeatures = {
            ...features,
            [key]: !features[key]
        };
        try {
            await api.patch(`/tenants/${tenant.id}/features`, updatedFeatures);
            setFeatures(updatedFeatures);
            onUpdate(); // refresh parent details
        } catch (err) {
            console.error('Failed to update tenant features:', err);
            alert('Failed to update tenant features');
        } finally {
            setUpdatingFeature(null);
        }
    };

    const handleEnableMonitoring = async ({ monitoringExtension, monitoringSecret, name }) => {
        if (!adminUser) return;
        setUpdatingFeature('monitoringEnabled');
        try {
            await api.patch(`/users/${adminUser.id}/permissions`, {
                monitoringEnabled: true,
                monitoringExtension,
                monitoringSecret,
                name
            });
            setUserMonitoringEnabled(true);
            setShowMonitoringModal(false);
            await fetchAdminUser();
            onUpdate();
        } catch (err) {
            console.error('Failed to enable monitoring:', err);
            alert('Failed to enable monitoring: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingFeature(null);
        }
    };

    const handleLimitChange = async (limitKey, value) => {
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || intValue < 0) return;

        setUpdatingFeature(limitKey);
        const updatedFeatures = {
            ...features,
            [limitKey]: intValue
        };
        try {
            await api.patch(`/tenants/${tenant.id}/features`, { [limitKey]: intValue });
            setFeatures(updatedFeatures);
            onUpdate(); // refresh parent details
        } catch (err) {
            console.error('Failed to update tenant feature limit:', err);
            alert('Failed to update tenant feature limit');
        } finally {
            setUpdatingFeature(null);
        }
    };

    const FEATURE_ITEMS = [
        {
            key: 'recordingAllowed',
            title: 'Call Recording Permission',
            description: 'Allow tenant administrators to toggle automatic call recording for extensions.',
            icon: Mic,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'monitoringEnabled',
            title: 'Call Monitoring',
            description: 'Allows administrators to view real-time calls and listen-in to active calls.',
            icon: ShieldAlert,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'ivrEnabled',
            limitKey: 'ivrLimit',
            title: 'Interactive Voice Response (IVR)',
            description: 'Enable multi-level auto-attendant phone menus and call routing prompts.',
            icon: Phone,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'ringGroupEnabled',
            limitKey: 'ringGroupLimit',
            title: 'Ring Groups',
            description: 'Group extensions together to ring sequentially or simultaneously for incoming calls.',
            icon: Users,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'schedulerEnabled',
            limitKey: 'schedulerLimit',
            title: 'Operational Schedules (Scheduler)',
            description: 'Route calls automatically based on operational business hours, holidays, and times.',
            icon: Clock,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'didForwardEnabled',
            limitKey: 'didForwardLimit',
            title: 'DID Forwarding',
            description: 'Directly forward incoming phone numbers to external lines or specific destinations.',
            icon: Phone,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        }
    ];

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div className="text-left">
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Feature Controller</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Control active features and set creation limits for this tenant.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {FEATURE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isEnabled = item.key === 'monitoringEnabled' ? userMonitoringEnabled : features[item.key];
                    const isUpdating = updatingFeature === item.key || updatingFeature === item.limitKey;
                    const limitVal = features[item.limitKey] ?? 10;

                    return (
                        <div
                            key={item.key}
                            className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm ${isEnabled
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-50/50 border-gray-100 opacity-75'
                                }`}
                        >
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-xl border shrink-0 ${item.color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="font-extrabold text-gray-900 text-sm tracking-tight">{item.title}</h4>
                                    <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed max-w-xl">{item.description}</p>

                                    {isEnabled && item.limitKey && (
                                        <div className="mt-3 flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-flex">
                                            <span className="text-xs font-bold text-gray-700">Creation Limit:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={limitVal}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFeatures(prev => ({
                                                        ...prev,
                                                        [item.limitKey]: val === '' ? '' : parseInt(val, 10)
                                                    }));
                                                }}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    const intVal = val === '' ? 10 : parseInt(val, 10);
                                                    handleLimitChange(item.limitKey, intVal);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value;
                                                        const intVal = val === '' ? 10 : parseInt(val, 10);
                                                        handleLimitChange(item.limitKey, intVal);
                                                        e.target.blur();
                                                    }
                                                }}
                                                disabled={isUpdating}
                                                className="w-16 px-2 py-1 text-xs font-extrabold text-gray-800 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center shadow-sm"
                                            />
                                            <span className="text-[10px] text-gray-400 font-bold">resources</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center shrink-0 justify-end">
                                <button
                                    onClick={() => !isUpdating && handleToggle(item.key)}
                                    disabled={isUpdating}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${isEnabled ? 'bg-primary-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    >
                                        {isUpdating && <Loader className="animate-spin h-3 w-3 text-primary-600" />}
                                    </span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showMonitoringModal && adminUser && (
                <MonitoringExtensionModal
                    onClose={() => setShowMonitoringModal(false)}
                    onSubmit={handleEnableMonitoring}
                    tenantId={tenant.id}
                    initialUserId={adminUser.id}
                />
            )}
        </div>
    );
};

const CarrierTab = ({ tenant, onUpdate }) => {
    const [carriers, setCarriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEndpointId, setSelectedEndpointId] = useState(tenant.outboundEndpointId || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/carriers').then(res => {
            setCarriers(res.data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (selectedEndpointId) {
                await api.put(`/tenants/${tenant.id}/outbound-endpoint`, { endpointId: Number(selectedEndpointId) });
            } else {
                await api.delete(`/tenants/${tenant.id}/outbound-endpoint`);
            }
            onUpdate();
            alert('Carrier routing updated successfully.');
        } catch (error) {
            alert('Failed to update carrier routing');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading carriers...</div>;

    return (
        <div className="space-y-8 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div className="text-left">
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Outbound Carrier Routing</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Select the default outbound carrier endpoint for this tenant's calls.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Endpoint</label>
                <select
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3 border"
                    value={selectedEndpointId}
                    onChange={(e) => setSelectedEndpointId(e.target.value)}
                >
                    <option value="">-- No Carrier Assigned (Uses Default/Local) --</option>
                    {carriers.map(c => (
                        <optgroup key={c.id} label={c.name}>
                            {c.endpoints.map(ep => (
                                <option key={ep.id} value={ep.id}>
                                    {ep.name} ({ep.sipHost}:{ep.sipPort})
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>

                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddonsTab = ({ tenant, onUpdate }) => {
    const { addToast } = useToast();
    const [catalog, setCatalog] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [quantityMap, setQuantityMap] = useState({});
    const [quotingAddonId, setQuotingAddonId] = useState(null);
    const [quoteData, setQuoteData] = useState(null);
    const [addonModalOpen, setAddonModalOpen] = useState(false);

    useEffect(() => {
        loadCatalog();
    }, [tenant?.id]);

    const loadCatalog = async () => {
        setCatalogLoading(true);
        try {
            const addonsData = await subscriptionService.getCatalog();
            setCatalog(addonsData || []);
        } catch (err) {
            console.error('Failed to load add-on catalog:', err);
            if (addToast) addToast('error', 'Failed to load add-ons');
        } finally {
            setCatalogLoading(false);
        }
    };

    const getQuantity = (addonId) => quantityMap[addonId] || 1;

    const handleQuantityChange = (addonId, val) => {
        const q = Math.max(1, parseInt(val, 10) || 1);
        setQuantityMap((prev) => ({ ...prev, [addonId]: q }));
    };

    const getAddonIcon = (addonType = '') => {
        const type = String(addonType).toLowerCase();
        const iconClasses = "h-5 w-5 text-indigo-600";
        switch (type) {
            case 'ext':
            case 'extension':
                return <Radio className={iconClasses} />;
            case 'tfn':
            case 'did':
                return <Phone className={iconClasses} />;
            case 'storage':
                return <HardDrive className={iconClasses} />;
            case 'mon':
                return <Activity className={iconClasses} />;
            default:
                return <Package className={iconClasses} />;
        }
    };

    const handleGetQuote = async (addon) => {
        const qty = getQuantity(addon.addon_id);
        setQuotingAddonId(addon.addon_id);
        try {
            const quote = await subscriptionService.getQuote(
                tenant?.id,
                addon.addon_id,
                qty
            );
            setQuoteData(quote);
            setAddonModalOpen(true);
        } catch (err) {
            console.error('Failed to calculate quote:', err);
            if (addToast) addToast('error', err.response?.data?.message || 'Failed to calculate quote');
        } finally {
            setQuotingAddonId(null);
        }
    };

    const handleRefreshAll = () => {
        loadCatalog();
        if (onUpdate) onUpdate();
    };

    return (
        <div className="space-y-8 w-full">
            {/* Catalog Section Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                        Mid-Cycle Add-ons Catalog
                    </h3>
                </div>
                <p className="text-sm font-medium text-gray-500">
                    Select capacity add-ons to upgrade your tenant resources with instant prorated billing
                </p>
            </div>

            {/* Catalog Grid */}
            {catalogLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catalog.map((addon) => (
                        <div
                            key={addon.addon_id}
                            className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                        {getAddonIcon(addon.resource_type || addon.addon_type)}
                                    </div>
                                    <span className="text-lg font-extrabold font-mono text-gray-900">
                                        ${Number(addon.unit_price || addon.price || 0).toFixed(2)}
                                        <span className="text-xs text-gray-400 font-sans font-normal"> / mo</span>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-base font-bold text-gray-900 tracking-tight">
                                        {addon.name}
                                    </h4>
                                    {addon.units_count > 1 && (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {addon.units_count} Units / Pack
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-gray-500 mt-1.5 leading-relaxed min-h-[36px]">
                                    {addon.description || `Resource type: ${addon.resource_type || 'addon'}`}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                                {/* Quantity Selector */}
                                <div className="w-24">
                                    <label className="sr-only">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={getQuantity(addon.addon_id)}
                                        onChange={(e) => handleQuantityChange(addon.addon_id, e.target.value)}
                                        className="w-full text-center font-mono font-bold text-sm rounded-xl border border-gray-200 bg-gray-50 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                {/* Trigger Quote & Purchase Button */}
                                <button
                                    type="button"
                                    onClick={() => handleGetQuote(addon)}
                                    disabled={quotingAddonId === addon.addon_id}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {quotingAddonId === addon.addon_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Purchase Add-on
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Prorated Add-on Quote & Purchase Modal */}
            <AddonPurchaseModal
                isOpen={addonModalOpen}
                onClose={() => setAddonModalOpen(false)}
                quote={quoteData}
                customerId={tenant?.id}
                onSuccess={handleRefreshAll}
            />
        </div>
    );
};

const CustomizeTab = ({ tenant, onUpdate }) => {
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getInitialData = () => {
        const cd = tenant?.customerDetails || {};
        return {
            customerType: cd.customerType || 'company',
            companyName: cd.companyName || tenant?.name || '',
            companyTaxId: cd.companyTaxId || '',
            firstName: cd.firstName || (tenant?.adminUser?.name ? tenant.adminUser.name.split(' ')[0] : ''),
            lastName: cd.lastName || (tenant?.adminUser?.name ? tenant.adminUser.name.split(' ').slice(1).join(' ') : ''),
            adminEmail: cd.adminEmail || tenant?.adminUser?.email || '',
            adminPassword: '',
            creditLimit: cd.creditLimit !== undefined ? cd.creditLimit : (tenant?.wallet?.creditLimit || 0),
            phone: cd.phone || '',
            country: cd.country || 'USA',
            address: cd.address || '',
            city: cd.city || '',
            state: cd.state || '',
        };
    };

    const [formData, setFormData] = useState(getInitialData);

    useEffect(() => {
        setFormData(getInitialData());
    }, [tenant]);

    const handleCancel = () => {
        setFormData(getInitialData());
        setIsEditing(false);
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                customerType: formData.customerType,
                companyName: formData.customerType === 'company' ? (formData.companyName || tenant?.name) : undefined,
                companyTaxId: formData.customerType === 'company' ? formData.companyTaxId : undefined,
                firstName: formData.firstName,
                lastName: formData.lastName,
                adminEmail: formData.adminEmail,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                creditLimit: Number(formData.creditLimit) || 0
            };

            if (formData.adminPassword && formData.adminPassword.trim().length > 0) {
                payload.adminPassword = formData.adminPassword.trim();
            }

            await api.patch(`/tenants/${tenant.id}/details`, payload);
            if (addToast) {
                addToast('success', 'Tenant details updated successfully');
            }
            setIsEditing(false);
            setFormData(prev => ({ ...prev, adminPassword: '' }));
            if (onUpdate) {
                onUpdate();
            }
        } catch (err) {
            console.error('Failed to update tenant details:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update tenant details';
            if (addToast) addToast('error', msg);
            else alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const countryOptions = [
        { code: 'USA', label: 'United States (USA)' },
        { code: 'CAD', label: 'Canada (CAD)' },
        { code: 'IND', label: 'India (IND)' },
        { code: 'PAK', label: 'Pakistan (PAK)' },
        { code: 'PHI', label: 'Philippines (PHI)' },
        { code: 'BNG', label: 'Bangladesh (BNG)' },
        { code: 'OTHER', label: 'Other' },
    ];

    const getCountryLabel = (code) => {
        const found = countryOptions.find(c => c.code === code);
        return found ? found.label : code || 'N/A';
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header with Top Right Corner Edit / Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                            <Palette size={20} />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                            Tenant Details & Customization
                        </h3>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                        View and customize organization identity, administrator profile, and billing limits.
                    </p>
                </div>

                {/* Top Right Corner Edit / Save Buttons */}
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            <Edit3 size={15} /> Edit Details
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 1. Tenant Type & Company Info Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Tenant & Company Information
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Organization type, commercial name, and tax identification
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Tenant Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Tenant Type
                        </label>
                        {!isEditing ? (
                            <div className="mt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ring-1 ring-inset uppercase tracking-wider ${
                                    formData.customerType === 'company'
                                        ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                        : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                }`}>
                                    {formData.customerType === 'company' ? <Building2 size={13} /> : <User size={13} />}
                                    {formData.customerType === 'company' ? 'Company' : 'Individual'}
                                </span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => handleChange('customerType', 'company')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                                        formData.customerType === 'company'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('customerType', 'individual')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                                        formData.customerType === 'individual'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Individual
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Company Name */}
                    {formData.customerType === 'company' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                Company Name
                            </label>
                            {!isEditing ? (
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                    {formData.companyName || tenant?.name || 'N/A'}
                                </p>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    placeholder="e.g. Acme Corporation Inc"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            )}
                        </div>
                    )}

                    {/* Company Tax ID */}
                    {formData.customerType === 'company' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                Company Tax ID
                            </label>
                            {!isEditing ? (
                                <p className="text-sm font-mono font-medium text-gray-900 mt-1">
                                    {formData.companyTaxId || <span className="text-gray-400 font-sans italic">Not provided</span>}
                                </p>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.companyTaxId}
                                    onChange={(e) => handleChange('companyTaxId', e.target.value)}
                                    placeholder="e.g. TAX-998822"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Personal Details Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <User className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Personal Details
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Primary administrator identity, contact email, and credentials
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* First Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            First Name
                        </label>
                        {!isEditing ? (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                                {formData.firstName || 'N/A'}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                                placeholder="First Name"
                                className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                            />
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Last Name
                        </label>
                        {!isEditing ? (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                                {formData.lastName || 'N/A'}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleChange('lastName', e.target.value)}
                                placeholder="Last Name"
                                className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                            />
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Email
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Mail size={15} className="text-gray-400" />
                                {formData.adminEmail || 'N/A'}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                                    placeholder="admin@example.com"
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Password
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-mono text-gray-500">
                                <Lock size={15} className="text-gray-400" />
                                ••••••••••••
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.adminPassword}
                                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                                    placeholder="Leave blank to keep unchanged"
                                    className="block w-full pl-10 pr-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Billing & Limits Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Billing & Limits
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Credit limits, telephone contact, country, and registered address
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Credit Limit */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Credit Limit
                        </label>
                        {!isEditing ? (
                            <p className="text-lg font-mono font-extrabold text-gray-900 mt-1">
                                ${Number(formData.creditLimit || 0).toFixed(2)}
                            </p>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 font-bold sm:text-sm">
                                    $
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.creditLimit}
                                    onChange={(e) => handleChange('creditLimit', e.target.value)}
                                    placeholder="0.00"
                                    className="block w-full pl-8 rounded-xl border border-gray-200 py-2.5 text-sm font-mono font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Phone
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Phone size={15} className="text-gray-400" />
                                {formData.phone || <span className="text-gray-400 font-sans italic">Not provided</span>}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Phone size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="+1 234 567 890"
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Country
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Globe size={15} className="text-gray-400" />
                                {getCountryLabel(formData.country)}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Globe size={16} />
                                </div>
                                <select
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 pr-8 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                >
                                    {countryOptions.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Address
                        </label>
                        {!isEditing ? (
                            <div className="flex items-start gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                                <span>
                                    {[formData.address, formData.city, formData.state].filter(Boolean).join(', ') || <span className="text-gray-400 italic">Not provided</span>}
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Street Address (e.g. 123 Business Way, Suite 400)"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="City"
                                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                    />
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        placeholder="State / Province"
                                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantManager;
