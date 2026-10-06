import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Users, Clock, ArrowRight } from 'lucide-react';

const SuperAdminDashboard = () => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBalances = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const response = await fetch('/api/wallet/all-balances', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setBalances(data);
        } catch (error) {
            console.error('Failed to fetch balances:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Platform Overview</h1>
                    <p className="text-gray-500 mt-1 font-medium">Global wallet balances across all tenants</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchBalances(true)}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        Refresh All
                    </button>
                    <div className="bg-primary-600 px-4 py-2.5 rounded-xl text-white shadow-sm flex items-center gap-3">
                        <Wallet size={20} />
                        <span className="font-mono font-bold text-lg">${totalBalance.toFixed(2)}</span>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-gray-400" size={20} /> Tenant Wallets
                    </h3>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{balances.length} Total Tenants</span>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading platform data...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Billing ID</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Free Mins</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {balances.map((b) => (
                                    <tr key={b.tenantId} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{b.tenantName}</div>
                                            <div className="text-xs text-gray-400 font-mono truncate max-w-[150px]">{b.tenantId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {b.subBillingCustomerId || 'UNLINKED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-bold">
                                            <span className={b.balance < 10 ? 'text-red-600' : 'text-gray-900'}>
                                                ${b.balance.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-bold text-gray-500">
                                            {b.freeMins}m
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-primary-600 hover:text-primary-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1 justify-end ml-auto">
                                                Adjust <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
