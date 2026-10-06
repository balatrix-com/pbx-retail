import React, { useState, useEffect } from 'react';
import { Search, RotateCw, DollarSign, CreditCard, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import api from '../../services/api';

const RevenuePage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallet/payment-details');
            setPayments(res.data || []);
        } catch (error) {
            console.error('Failed to fetch payment details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter payments based on search query
    const filteredPayments = payments.filter((payment) => {
        const query = search.toLowerCase();
        return (
            payment.payment_id?.toLowerCase().includes(query) ||
            payment.customer_id?.toLowerCase().includes(query) ||
            payment.description?.toLowerCase().includes(query) ||
            payment.amount?.toString().includes(query)
        );
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
    const paginatedPayments = filteredPayments.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    // KPI stats calculations
    const totalRevenue = payments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const totalPaymentsCount = payments.length;
    const averagePayment = totalPaymentsCount > 0 ? (totalRevenue / totalPaymentsCount) : 0;

    // Reset pagination to page 1 on search change
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 px-4 sm:px-0">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                        <BarChart3 className="text-primary-600 h-8 w-8 md:h-10 md:w-10" />
                        Revenue & Billing Analytics
                    </h1>
                    <p className="mt-1 text-sm md:text-base text-gray-500 font-medium">Monitor all customer checkout payments generated via Stripe</p>
                </div>
                <button
                    onClick={fetchPayments}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none w-full sm:w-auto active:scale-[0.98] disabled:opacity-50"
                >
                    <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh Payments
                </button>
            </div>

            {/* KPIs Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Total Volume */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <DollarSign className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Volume</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Total Checkout Payments Count */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <CreditCard className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <CreditCard className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Transactions</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                            {totalPaymentsCount}
                        </div>
                    </div>
                </div>

                {/* Average Ticket Value */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <TrendingUp className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Ticket Size</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                            ${averagePayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Search Input */}
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-200">
                <div className="relative w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Payment ID, Customer ID, amount, description..."
                        value={search}
                        onChange={handleSearchChange}
                        className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium"
                    />
                </div>
            </div>

            {/* Payments History Table */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment ID</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer ID</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <RotateCw size={16} className="animate-spin text-primary-600" />
                                            Retrieving system payment data...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                                        No billing records match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map((payment) => (
                                    <tr key={payment.payment_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono">
                                            {payment.payment_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 font-mono">
                                            {payment.customer_id}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-none">
                                            {payment.description || 'Wallet Top-up'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-bold text-emerald-600">
                                            ${Number(payment.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                    <p className="text-sm font-medium text-gray-500">
                        Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenuePage;
