import React, { useState, useEffect } from 'react';
import { Search, RotateCw, DollarSign, CreditCard, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const RevenuePage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <BarChart3 size={14} className="text-teal-200" />
                            <span>Financial Ledger & Revenue Stream</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Revenue & Billing Analytics
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Monitor customer checkout transactions, settlement receipts, and real-time wallet replenishments via Stripe.
                        </p>
                    </div>
                    <button
                        onClick={fetchPayments}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-5 py-3 text-xs font-bold text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                    >
                        <RotateCw size={15} className={`text-teal-200 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Payments</span>
                    </button>
                </div>
            </div>

            {/* KPIs Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Total Sales Volume"
                    value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subtitle="Gross processed checkout value"
                    icon={DollarSign}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Total Transactions"
                    value={totalPaymentsCount}
                    subtitle="Completed client payments"
                    icon={CreditCard}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Average Ticket Size"
                    value={`$${averagePayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subtitle="Mean value per transaction"
                    icon={TrendingUp}
                    color="emerald"
                    trend="+10%"
                    trendUp={true}
                />
            </div>

            {/* Filter Search Input */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                <div className="relative w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Search size={16} className="text-teal-600/70 dark:text-teal-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Payment ID, Customer ID, amount, description..."
                        value={search}
                        onChange={handleSearchChange}
                        className="block w-full rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>

            {/* Payments History Table */}
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                        <thead className="bg-gray-50/75 dark:bg-[#12131a]">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment ID</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer ID</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RotateCw size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                                            Retrieving system payment data...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        No billing records match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map((payment) => (
                                    <tr key={payment.payment_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono">
                                            {payment.payment_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 font-mono">
                                            {payment.customer_id}
                                        </td>
                                        <td className="px-6 py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px] md:max-w-none">
                                            {payment.description || 'Wallet Top-up'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            ${Number(payment.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <Pagination
                    page={page}
                    limit={itemsPerPage}
                    total={filteredPayments.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                    onLimitChange={(l) => { setItemsPerPage(l); setPage(1); }}
                    itemName="payments"
                />
            </div>
        </div>
    );
};

export default RevenuePage;
