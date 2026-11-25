import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, FileJson, Clock, User, Target, Shield } from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    // Valid categories from backend
    const categories = [
        'CARRIER_GATEWAY',
        'RATE_CARD',
        'MANAGE_NUMBERS',
        'PLANS_ADDONS',
        'USER_MANAGEMENT',
        'SYSTEM_SETTINGS',
        'AUTH',
        'TENANT',
        'BILLING',
        'SYSTEM',
        'USER'
    ];

    useEffect(() => {
        fetchLogs();
    }, [page, limit, search, category]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
                ...(category && { category })
            });

            const res = await api.get(`/admin/audit-logs?${params}`);
            setLogs(res.data.data);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotal(res.data.pagination?.total || 0);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        alert('Export functionality coming soon!');
    };

    const [selectedLog, setSelectedLog] = useState(null);

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Shield size={14} className="text-teal-200" />
                            <span>Security Trails & Regulatory Compliance</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            System Audit Logs
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Track platform-wide administrative actions, security authorizations, provisioning mutations, and compliance event records.
                        </p>
                    </div>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                        onClick={handleExport}
                    >
                        <Download size={15} className="text-teal-700" />
                        <span>Export Audit CSV</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Audit Events"
                    value={loading ? '—' : (total || logs.length)}
                    subtitle={`Events on page ${page} of ${totalPages}`}
                    icon={Shield}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Filter Category"
                    value={category || 'All Categories'}
                    subtitle={`${categories.length} total monitored categories`}
                    icon={Target}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Auditing Integrity"
                    value="Immutable Store"
                    subtitle="Append-only security trail"
                    icon={Clock}
                    color="emerald"
                    trend="Secure"
                    trendUp={true}
                />
            </div>

            {/* Filter Search Toolbar */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <Search size={16} className="text-teal-600/70 dark:text-teal-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search action, email, or entity IDs..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="block w-full rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        className="block w-full sm:w-56 rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 py-2 px-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                        <thead className="bg-gray-50/75 dark:bg-[#12131a]">
                            <tr>
                                <th scope="col" className="px-4 md:px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                                <th scope="col" className="px-4 md:px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                <th scope="col" className="hidden sm:table-cell px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actor</th>
                                <th scope="col" className="hidden xl:table-cell px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                                <th scope="col" className="px-4 md:px-6 py-3.5 text-right text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        No audit records found matching your filter.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500 dark:text-gray-400">
                                            {new Date(log.createdAt).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px] md:max-w-none">
                                            {log.action}
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                                            <CategoryBadge category={log.category} />
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{log.actorEmail || 'System'}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{log.actorType}</span>
                                            </div>
                                        </td>
                                        <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{log.targetType || '-'}</span>
                                                <span className="text-[11px] text-gray-400 font-mono" title={log.targetId}>
                                                    {log.targetId ? log.targetId.substring(0, 8) + '...' : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors inline-block cursor-pointer"
                                                    onClick={() => setSelectedLog(log)}
                                                    title="View Metadata"
                                                >
                                                    <FileJson size={16} />
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600 pr-2">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="audit logs"
                />
            </div>

            {/* Metadata Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLog(null)}></div>
                    <div className="relative bg-white dark:bg-[#0c0d12] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-2xl overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-[#12131a] flex items-center gap-3">
                            <FileJson className="text-primary-600 dark:text-primary-400" size={22} />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Audit Event Metadata</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 overflow-auto max-h-[500px]">
                                <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                    {JSON.stringify(selectedLog, null, 2)}
                                </pre>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    className="rounded-xl bg-white dark:bg-[#12131a] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none transition-all active:scale-95 cursor-pointer"
                                    onClick={() => setSelectedLog(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const CategoryBadge = ({ category }) => {
    const colors = {
        CARRIER_GATEWAY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20',
        RATE_CARD: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 ring-1 ring-inset ring-teal-600/20',
        MANAGE_NUMBERS: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 ring-1 ring-inset ring-cyan-600/20',
        PLANS_ADDONS: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 ring-1 ring-inset ring-pink-600/20',
        USER_MANAGEMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20',
        SYSTEM_SETTINGS: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20',
        AUTH: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20',
        TENANT: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20',
        BILLING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20',
        SYSTEM: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-inset ring-gray-600/20',
        USER: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20'
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${colors[category] || 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'}`}>
            {category}
        </span>
    );
};


export default AuditLogsPage;
