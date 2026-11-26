import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Search, Plus, Edit, Trash2, LayoutGrid, List, CheckCircle2, Radio, GitFork, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { clsx } from 'clsx';

const DIDsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dids, setDids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [routeFilter, setRouteFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    useEffect(() => {
        fetchDIDs();
    }, []);

    const fetchDIDs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/telecom/dids');
            setDids(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError('Failed to load phone numbers');
            console.error('Error fetching DIDs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, number) => {
        if (!window.confirm(`Delete phone number ${number}?`)) return;

        try {
            await api.delete(`/telecom/dids/${id}`);
            setDids(dids.filter(did => did.id !== id));
        } catch (err) {
            setError('Failed to delete phone number');
            console.error('Error deleting DID:', err);
        }
    };

    const filteredDIDs = (dids || []).filter(did => {
        const matchesSearch = did.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (did.provider && did.provider.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRoute = !routeFilter || did.routeType === routeFilter;
        return matchesSearch && matchesRoute;
    });

    const getRouteTypeBadge = (routeType) => {
        const badges = {
            extension: { label: 'Extension', className: 'bg-green-50 text-green-700 ring-green-600/20' },
            ring_group: { label: 'Ring Group', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
            ivr: { label: 'IVR', className: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
            did_forward: { label: 'Internal Forward', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
            forward: { label: 'External Forward', className: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
        };
        const badge = badges[routeType] || { label: routeType, className: 'bg-gray-50 text-gray-700 ring-gray-600/20' };
        return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${badge.className}`}>{badge.label}</span>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 shadow-xs">
                        <Phone className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Phone Numbers (DIDs)
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Manage incoming phone numbers and call routing destinations.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchDIDs}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-[#12131a] border border-gray-200/80 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                    >
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                        Refresh
                    </button>
                    {user?.role === 'SUPER_ADMIN' && (
                        <button
                            onClick={() => navigate('/telecom/dids/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" />
                            Add Phone Number
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl flex justify-between items-center shadow-xs">
                    <span className="font-medium text-sm">{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                </div>
            )}

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Numbers', value: dids.length, icon: Phone, sub: 'Assigned DIDs' },
                    { label: 'Active Lines', value: dids.filter(d => d.isActive).length, icon: CheckCircle2, sub: 'In service' },
                    { label: 'Extension Routed', value: dids.filter(d => d.routeType === 'extension').length, icon: Radio, sub: 'Direct to agent' },
                    { label: 'IVR & Groups', value: dids.filter(d => d.routeType === 'ivr' || d.routeType === 'ring_group').length, icon: GitFork, sub: 'Queued / Automated' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="platform-panel-dark rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 shadow-xs relative overflow-hidden transition-all hover:border-primary-500/30 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</span>
                                <div className="h-8 w-8 rounded-xl bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400">
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stat.value}
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{stat.sub}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Unified Filter / Search Bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search phone number or provider..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2.5">
                    <select
                        value={routeFilter}
                        onChange={(e) => setRouteFilter(e.target.value)}
                        className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 transition-all font-medium"
                    >
                        <option value="">All Route Types</option>
                        <option value="extension">Extension</option>
                        <option value="ring_group">Ring Group</option>
                        <option value="ivr">IVR Menu</option>
                        <option value="did_forward">Internal Forward</option>
                        <option value="forward">External Forward</option>
                    </select>

                    <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200/80 dark:border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'grid' ? "bg-white dark:bg-[#181924] text-primary-600 dark:text-primary-400 shadow-xs" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'table' ? "bg-white dark:bg-[#181924] text-primary-600 dark:text-primary-400 shadow-xs" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                            title="Table View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {filteredDIDs.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c0d12] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 shadow-xs">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <Phone className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No phone numbers found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 mb-5 font-medium text-sm">Add your first DID or modify search filters</p>
                    {user?.role === 'SUPER_ADMIN' && (
                        <button
                            onClick={() => navigate('/telecom/dids/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" />
                            Add Phone Number
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredDIDs.map((did) => (
                        <div key={did.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-primary-500/30 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                                            <Phone size={16} />
                                        </div>
                                        <h3 className="text-base font-black font-mono tracking-tight text-gray-900 dark:text-white">{did.number}</h3>
                                    </div>
                                    {getRouteTypeBadge(did.routeType)}
                                </div>

                                <div className="space-y-3 px-5 py-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Route Destination:</span>
                                        <span className={`font-bold ${did.routeType === 'forward' ? 'font-mono text-gray-900 dark:text-white' : 'text-primary-600 dark:text-primary-400'}`}>
                                            {did.routeType === 'forward'
                                                ? did.forwardNumber || 'Not configured'
                                                : did.routeTargetId || 'Not configured'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Carrier / Provider:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{did.provider || 'Default'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Monthly Cost:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">${parseFloat(did.monthlyFee || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Status:</span>
                                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${did.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
                                            {did.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                <button
                                    onClick={() => navigate(`/telecom/dids/${did.id}/edit`)}
                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <Edit className="h-3.5 w-3.5 text-gray-500" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(did.id, did.number)}
                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                            <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone Number</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Routing</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                                {filteredDIDs.map((did) => (
                                    <tr key={did.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-sm text-gray-900 dark:text-white">
                                            {did.number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getRouteTypeBadge(did.routeType)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {did.routeType === 'forward' ? did.forwardNumber : did.routeTargetId || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                            {did.provider || 'Default'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${did.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
                                                {did.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => navigate(`/telecom/dids/${did.id}/edit`)}
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(did.id, did.number)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-all"
                                                    title="Delete"
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
                </div>
            )}
        </div>
    );
};

export default DIDsPage;
