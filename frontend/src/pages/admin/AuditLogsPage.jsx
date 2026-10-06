import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, FileJson, Clock, User, Target, Shield } from 'lucide-react';
import api from '../../services/api';

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
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
    }, [page, search, category]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(search && { search }),
                ...(category && { category })
            });

            const res = await api.get(`/admin/audit-logs?${params}`);
            setLogs(res.data.data);
            setTotalPages(res.data.pagination.totalPages);
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
        <div className="max-w-7xl mx-auto pb-12 space-y-8 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                        <Shield className="text-primary-600 h-8 w-8 md:h-10 md:w-10" />
                        System Audit Logs
                    </h1>
                    <p className="mt-1 text-sm md:text-base text-gray-500 font-medium">Track all critical system actions and security events</p>
                </div>
                <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none w-full sm:w-auto active:scale-[0.98]"
                    onClick={handleExport}
                >
                    <Download size={20} />
                    Export CSV
                </button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search action, email, or IDs..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium"
                        />
                    </div>

                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        className="block w-full sm:w-48 rounded-xl border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-4 md:px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th scope="col" className="px-4 md:px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                <th scope="col" className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actor</th>
                                <th scope="col" className="hidden xl:table-cell px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target</th>
                                <th scope="col" className="px-4 md:px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-sm font-medium text-gray-500">Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-sm font-medium text-gray-500">No audit logs found</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-[10px] md:text-sm font-mono text-gray-500">
                                            {new Date(log.createdAt).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 truncate max-w-[100px] md:max-w-none">
                                            {log.action}
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                                            <CategoryBadge category={log.category} />
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{log.actorEmail || 'System'}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">{log.actorType}</span>
                                            </div>
                                        </td>
                                        <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-700">{log.targetType || '-'}</span>
                                                <span className="text-xs text-gray-400 font-mono" title={log.targetId}>
                                                    {log.targetId ? log.targetId.substring(0, 8) + '...' : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                                                    onClick={() => setSelectedLog(log)}
                                                    title="View Metadata"
                                                >
                                                    <FileJson size={16} />
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 pr-2">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                    <p className="text-sm font-medium text-gray-500">
                        Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Metadata Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLog(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-gray-200 w-full max-w-2xl overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                            <FileJson className="text-primary-600" size={24} />
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Log Details</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-900 p-4 rounded-xl shadow-inner overflow-auto max-h-[500px]">
                                <pre className="text-xs font-mono text-green-400 leading-relaxed">
                                    {JSON.stringify(selectedLog, null, 2)}
                                </pre>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none transition-all"
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
        CARRIER_GATEWAY: 'bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
        RATE_CARD: 'bg-teal-100 text-teal-700 ring-1 ring-inset ring-teal-600/20',
        MANAGE_NUMBERS: 'bg-cyan-100 text-cyan-700 ring-1 ring-inset ring-cyan-600/20',
        PLANS_ADDONS: 'bg-pink-100 text-pink-700 ring-1 ring-inset ring-pink-600/20',
        USER_MANAGEMENT: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20',
        SYSTEM_SETTINGS: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20',
        AUTH: 'bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-600/20',
        TENANT: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-600/20',
        BILLING: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
        SYSTEM: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20',
        USER: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${colors[category] || 'bg-gray-100 text-gray-700'}`}>
            {category}
        </span>
    );
};


export default AuditLogsPage;
