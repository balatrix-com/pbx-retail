import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    CreditCard,
    Plus,
    Search,
    Edit2,
    Save,
    X,
    Loader2,
    Users,
    Sparkles,
    ShieldCheck,
    Layers,
    ArrowUpRight,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const RateCardsPage = () => {
    const { isSuperAdmin } = useAuth();

    // Recording Rate Card States
    const [recRateCards, setRecRateCards] = useState([]);
    const [recMappings, setRecMappings] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [mappingSearchQuery, setMappingSearchQuery] = useState('');

    // Pagination states
    const [rcPage, setRcPage] = useState(1);
    const [rcLimit, setRcLimit] = useState(10);
    const [mapPage, setMapPage] = useState(1);
    const [mapLimit, setMapLimit] = useState(10);
    const [recRcPage, setRecRcPage] = useState(1);
    const [recRcLimit, setRecRcLimit] = useState(10);
    const [recMapPage, setRecMapPage] = useState(1);
    const [recMapLimit, setRecMapLimit] = useState(10);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        }
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [recRcRes, recMapRes] = await Promise.all([
                api.get('/admin/rec-rate-cards'),
                api.get('/admin/rec-rate-cards/mappings')
            ]);
            setRecRateCards(recRcRes.data?.data || (Array.isArray(recRcRes.data) ? recRcRes.data : []));
            setRecMappings(recMapRes.data?.data || (Array.isArray(recMapRes.data) ? recMapRes.data : []));
        } catch (error) {
            console.error('Failed to fetch recording rate cards data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Recording Rate Card Actions
    const handleSaveRecRateCard = async (formData) => {
        try {
            setModalLoading(true);
            if (editingCard) {
                await api.put(`/admin/rec-rate-cards/${editingCard.id}`, formData);
            } else {
                await api.post('/admin/rec-rate-cards', formData);
            }
            setShowModal(false);
            setEditingCard(null);
            fetchData();
        } catch (error) {
            console.error('Failed to save recording rate card:', error);
            alert('Error saving recording rate card: ' + (error.response?.data?.message || error.message));
        } finally {
            setModalLoading(false);
        }
    };

    const handleUpdateRecMapping = async (customerId, recRcId) => {
        try {
            await api.put(`/admin/rec-rate-cards/customer/${customerId}`, {
                rec_rc_id: parseInt(recRcId, 10)
            });
            fetchData();
        } catch (error) {
            console.error('Failed to update recording mapping:', error);
            alert('Error updating recording mapping: ' + (error.response?.data?.message || error.message));
        }
    };

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
    }

    const filteredRecRateCards = recRateCards.filter(card =>
        card.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRecMappings = recMappings.filter(m =>
        String(m.customer_id || '').toLowerCase().includes(mappingSearchQuery.toLowerCase()) ||
        String(m.customer_email || '').toLowerCase().includes(mappingSearchQuery.toLowerCase())
    );

    const paginatedRateCards = filteredRateCards.slice((rcPage - 1) * rcLimit, rcPage * rcLimit);
    const paginatedMappings = filteredMappings.slice((mapPage - 1) * mapLimit, mapPage * mapLimit);
    const paginatedRecRateCards = filteredRecRateCards.slice((recRcPage - 1) * recRcLimit, recRcPage * recRcLimit);
    const paginatedRecMappings = filteredRecMappings.slice((recMapPage - 1) * recMapLimit, recMapPage * recMapLimit);

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Sparkles size={14} className="text-teal-200" />
                            <span>Tariffs & Billing Matrices</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {activeTab === 'standard' ? 'Rate Card Management' : 'Recording Rate Cards'}
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            {activeTab === 'standard'
                                ? 'Configure inbound and outbound call tariffs, international matrices, and tenant billing bindings.'
                                : 'Configure recording storage fees, duration retention, and per-minute audio tariff profiles.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={`text-teal-200 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                        {activeTab === 'standard' && (
                            <button
                                onClick={() => {
                                    setEditingCard(null);
                                    setShowModal(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus size={16} className="text-teal-700" />
                                <span>Add New Rate Card</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Standard Tariffs"
                    value={loading ? '—' : rateCards.length}
                    subtitle="Active telecom billing profiles"
                    icon={CreditCard}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Mapped Accounts"
                    value={loading ? '—' : mappings.length}
                    subtitle="Tenants bound to standard tariffs"
                    icon={Users}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Storage Profiles"
                    value={loading ? '—' : recRateCards.length}
                    subtitle="Retention & per-min recording tiers"
                    icon={PhoneIncoming}
                    color="teal"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Storage Tenants"
                    value={loading ? '—' : recMappings.length}
                    subtitle="Subscribed retention mappings"
                    icon={Globe}
                    color="emerald"
                    trend="+10%"
                    trendUp={true}
                />
            </div>

            {/* Tabs Selector */}
            <div className="flex bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-2xl w-fit border border-teal-200/70 dark:border-white/10 shadow-sm">
                <button
                    onClick={() => {
                        setActiveTab('standard');
                        setSearchQuery('');
                        setMappingSearchQuery('');
                    }}
                    className={clsx(
                        "px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer",
                        activeTab === 'standard'
                            ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-600/20"
                            : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    Standard Rate Cards
                </button>
                <button
                    onClick={() => {
                        setActiveTab('recording');
                        setSearchQuery('');
                        setMappingSearchQuery('');
                    }}
                    className={clsx(
                        "px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer",
                        activeTab === 'recording'
                            ? "bg-white dark:bg-[#0c0d12] text-indigo-900 dark:text-indigo-300 shadow-xs border border-indigo-200/80 dark:border-white/10 ring-1 ring-indigo-500/10"
                            : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    Recording Rate Cards
                </button>
            </div>

            {/* Rate Card Content */}
            {activeTab === 'standard' ? (
                <div className="space-y-6">
                    {/* Standard Rate Cards Table Card */}
                    <section className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center shrink-0">
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                        Tariff Catalog
                                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                                            {filteredRateCards.length}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Defined per-minute wholesale rates and billing increments</p>
                                </div>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by tariff name or country..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tariff Profile</th>
                                        <th className="hidden xs:table-cell px-4 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Currency</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Inbound Rate</th>
                                        <th className="hidden sm:table-cell px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Outbound Rate</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading rate cards...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRateCards.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-14 text-center">
                                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-12 h-12 mx-auto mb-3 flex items-center justify-center text-gray-400">
                                                    <CreditCard size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">No rate cards found</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search criteria or add a new rate card.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedRateCards.map(card => (
                                        <tr key={card.ratecard_id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                                                        <Globe size={15} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-white text-sm">{card.name}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                            {card.country || 'Global Territory'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden xs:table-cell px-4 py-4 text-center">
                                                <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-white/5 px-2.5 py-1 text-xs font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-white/10 uppercase">
                                                    {card.currency}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                                                        ${parseFloat(card.in_rate_per_min).toFixed(4)}
                                                        <span className="text-[10px] text-gray-400 font-normal">/min</span>
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                        {card.in_initial_increment_sec}s init / {card.in_increment_sec}s inc
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-5 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">
                                                        ${parseFloat(card.ob_rate_per_min).toFixed(4)}
                                                        <span className="text-[10px] text-gray-400 font-normal">/min</span>
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                        {card.ob_initial_increment_sec}s init / {card.ob_increment_sec}s inc
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingCard(card);
                                                        setShowModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shadow-2xs"
                                                >
                                                    <Edit2 size={13} />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={rcPage}
                            limit={rcLimit}
                            total={filteredRateCards.length}
                            onPageChange={setRcPage}
                            onLimitChange={(l) => { setRcLimit(l); setRcPage(1); }}
                            itemName="rate cards"
                        />
                    </section>

                    {/* Standard Customer Mapping Card */}
                    <section className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center shrink-0">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                        Tenant Tariff Bindings
                                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200/50 dark:border-blue-800/40">
                                            {filteredMappings.length}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Link customer accounts to their active standard call tariffs</p>
                                </div>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by customer ID or email..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                                    value={mappingSearchQuery}
                                    onChange={(e) => setMappingSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                                        <th className="hidden md:table-cell px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email Address</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Tariff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading mappings...</td>
                                        </tr>
                                    ) : filteredMappings.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-14 text-center">
                                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-12 h-12 mx-auto mb-3 flex items-center justify-center text-gray-400">
                                                    <Users size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">No customer mappings found</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create customers first to assign rate card tariffs.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedMappings.map(mapping => (
                                        <tr key={mapping.customer_id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                                                        {mapping.customer_id.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm font-mono">{mapping.customer_id}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-[220px]">
                                                {mapping.customer_email}
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    className="w-full max-w-[220px] text-xs font-bold text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200/80 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#12131a] py-2 px-3 shadow-2xs outline-none cursor-pointer"
                                                    value={mapping.ratecard_id || ""}
                                                    onChange={(e) => handleUpdateMapping(mapping.customer_id, e.target.value)}
                                                >
                                                    <option value="" disabled>Select Rate Card</option>
                                                    {rateCards.map(rc => (
                                                        <option key={rc.ratecard_id} value={rc.ratecard_id}>{rc.name} ({rc.currency})</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={mapPage}
                            limit={mapLimit}
                            total={filteredMappings.length}
                            onPageChange={setMapPage}
                            onLimitChange={(l) => { setMapLimit(l); setMapPage(1); }}
                            itemName="customer mappings"
                        />
                    </section>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Recording Rate Cards Table Card */}
                    <section className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center shrink-0">
                                    <PhoneIncoming size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                        Call Recording Tariffs
                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
                                            {filteredRecRateCards.length}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recording storage retention profiles and per-minute transcription costs</p>
                                </div>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search recording tariffs..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">ID</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profile Name</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Currency</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Recording Rate</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Retention Period</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading recording rate cards...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRecRateCards.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-14 text-center">
                                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-12 h-12 mx-auto mb-3 flex items-center justify-center text-gray-400">
                                                    <PhoneIncoming size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">No recording rate cards found</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create a recording rate card to configure retention policies.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedRecRateCards.map(card => (
                                        <tr key={card.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-5 py-4 text-center font-mono font-bold text-gray-400 text-xs">#{card.id}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{card.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-white/5 px-2.5 py-1 text-xs font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-white/10 uppercase">
                                                    {card.currency}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                ${parseFloat(card.rate_per_min).toFixed(4)}
                                                <span className="text-[10px] text-gray-400 font-normal">/min</span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                                    {card.retention_period} Days
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingCard(card);
                                                        setShowModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer shadow-2xs"
                                                >
                                                    <Edit2 size={13} />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={recRcPage}
                            limit={recRcLimit}
                            total={filteredRecRateCards.length}
                            onPageChange={setRecRcPage}
                            onLimitChange={(l) => { setRecRcLimit(l); setRecRcPage(1); }}
                            itemName="recording cards"
                        />
                    </section>

                    {/* Recording Customer Mapping Card */}
                    <section className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 flex items-center justify-center shrink-0">
                                    <Globe size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                        Tenant Recording Subscriptions
                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                                            {filteredRecMappings.length}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Assign tenants to recording retention plans and per-minute storage billing</p>
                                </div>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by customer ID or email..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-2xs"
                                    value={mappingSearchQuery}
                                    onChange={(e) => setMappingSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                                        <th className="hidden md:table-cell px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email Address</th>
                                        <th className="px-5 py-3.5 text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Recording Plan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading assignments...</td>
                                        </tr>
                                    ) : filteredRecMappings.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-14 text-center">
                                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-12 h-12 mx-auto mb-3 flex items-center justify-center text-gray-400">
                                                    <Globe size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">No tenant assignments found</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create tenants to link recording storage retention plans.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedRecMappings.map(mapping => (
                                        <tr key={mapping.customer_id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                                                        {mapping.customer_id.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm font-mono">{mapping.customer_id}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-5 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-[220px]">
                                                {mapping.customer_email}
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    className="w-full max-w-[220px] text-xs font-bold text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200/80 dark:border-white/10 focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#12131a] py-2 px-3 shadow-2xs outline-none cursor-pointer"
                                                    value={mapping.rec_rc_id || ""}
                                                    onChange={(e) => handleUpdateRecMapping(mapping.customer_id, e.target.value)}
                                                >
                                                    <option value="" disabled>Select Recording Plan</option>
                                                    {recRateCards.map(rc => (
                                                        <option key={rc.id} value={rc.id}>{rc.name} ({rc.currency})</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={recMapPage}
                            limit={recMapLimit}
                            total={filteredRecMappings.length}
                            onPageChange={setRecMapPage}
                            onLimitChange={(l) => { setRecMapLimit(l); setRecMapPage(1); }}
                            itemName="tenant assignments"
                        />
                    </section>
                </div>
            )}

            {/* Standard Add/Edit Modal */}
            {showModal && activeTab === 'standard' && (
                <AddEditRateCardModal
                    card={editingCard}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveRateCard}
                    loading={modalLoading}
                />
            )}
        <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2 md:gap-3">
                        <CreditCard className="text-primary-600 h-6 w-6 md:h-8 md:w-8" />
                        Recording Rate Cards
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                        Configure recording storage and rates per minute, then assign to tenants
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingCard(null);
                        setShowModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all w-full sm:w-auto"
                >
                    <Plus size={20} />
                    Add Recording Rate Card
                </button>
            </header>

            {/* Recording Rate Cards Table */}
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Existing Recording Rate Cards
                        <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{recRateCards.length}</span>
                    </h2>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search recording cards..."
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
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">ID</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Name</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Currency</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Rate Per Min</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Retention Period (Days)</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                            <p className="text-sm font-medium text-gray-500">Loading recording rate cards...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecRateCards.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">No recording rate cards found</td>
                                </tr>
                            ) : filteredRecRateCards.map(card => (
                                <tr key={card.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-4 md:px-6 py-4 text-center font-semibold text-gray-500 text-xs">{card.id}</td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className="font-bold text-gray-900 text-sm">{card.name}</span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 ring-1 ring-inset ring-gray-500/10 uppercase">
                                            {card.currency}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-center font-bold text-gray-900">
                                        ${parseFloat(card.rate_per_min || 0).toFixed(4)}<span className="text-[10px] text-gray-400 font-normal">/min</span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-center font-bold text-gray-700">
                                        {card.retention_period} Days
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setEditingCard(card);
                                                setShowModal(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Recording Customer Mapping */}
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-primary-600 h-6 w-6" />
                        Tenant Recording Rate Card Assignments
                    </h2>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                            value={mappingSearchQuery}
                            onChange={(e) => setMappingSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="bg-gray-50/50">
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Customer ID</th>
                                <th className="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Email Address</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Recording Rate Card</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500 font-medium">Loading assignments...</td>
                                </tr>
                            ) : filteredRecMappings.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500 font-medium">No tenants found</td>
                                </tr>
                            ) : filteredRecMappings.map(mapping => (
                                <tr key={mapping.customer_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 md:px-6 py-4 font-bold text-gray-900 text-sm">{mapping.customer_id}</td>
                                    <td className="hidden md:table-cell px-6 py-4 text-sm font-medium text-gray-600 truncate max-w-[200px]">{mapping.customer_email}</td>
                                    <td className="px-4 md:px-6 py-4">
                                        <select
                                            className="w-full max-w-[150px] md:max-w-[200px] text-[10px] md:text-sm font-bold text-gray-700 rounded-xl border-gray-200 focus:ring-primary-500 focus:border-primary-500 bg-gray-50/50 py-1.5"
                                            value={mapping.rec_rc_id || ""}
                                            onChange={(e) => handleUpdateRecMapping(mapping.customer_id, e.target.value)}
                                        >
                                            <option value="" disabled>Select Recording Rate Card</option>
                                            {recRateCards.map(rc => (
                                                <option key={rc.id} value={rc.id}>{rc.name} ({rc.currency})</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Recording Add/Edit Modal */}
            {showModal && (
                <AddEditRecRateCardModal
                    card={editingCard}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveRecRateCard}
                    loading={modalLoading}
                />
            )}
        </div>
    );
};

const AddEditRateCardModal = ({ card, onClose, onSave, loading }) => {
    const [formData, setFormData] = useState({
        name: card?.name || '',
        currency: card?.currency || 'USD',
        country: card?.country || '',
        in_rate_per_min: card?.in_rate_per_min || 0,
        in_initial_increment_sec: card?.in_initial_increment_sec || 60,
        in_increment_sec: card?.in_increment_sec || 60,
        ob_rate_per_min: card?.ob_rate_per_min || 0,
        ob_initial_increment_sec: card?.ob_initial_increment_sec || 60,
        ob_increment_sec: card?.ob_increment_sec || 60,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="px-7 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-teal-500/15 border border-teal-500/20 p-2.5 rounded-2xl text-teal-600 dark:text-teal-400">
                            <CreditCard className="h-6 w-6 stroke-[2.2]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{card ? 'Edit' : 'New'} Rate Card</h3>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Configuration Panel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-7 space-y-6 overflow-y-auto max-h-[75vh]">
                    {/* Basic Info Container */}
                    <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                            <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
                                General Details
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Card Name *</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] focus:ring-2 focus:ring-teal-500 focus:outline-none py-2.5 px-4 font-semibold text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-2xs"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Premium North America"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Currency *</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] focus:ring-2 focus:ring-teal-500 focus:outline-none py-2.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-2xs"
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                    placeholder="USD"
                                    maxLength={3}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Country/Region</label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] focus:ring-2 focus:ring-teal-500 focus:outline-none py-2.5 px-4 font-semibold text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-2xs"
                                    value={formData.country}
                                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                                    placeholder="e.g. USA, Canada"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Inbound */}
                        <div className="bg-sky-50/70 dark:bg-sky-950/20 p-5 rounded-2xl border border-sky-200/60 dark:border-sky-800/30 flex flex-col gap-3.5 shadow-2xs">
                            <h4 className="font-extrabold text-sky-700 dark:text-sky-300 flex items-center gap-2 uppercase tracking-wider text-xs font-mono">
                                <PhoneIncoming size={16} /> Inbound Configuration
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Rate Per Minute ($)</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 font-bold text-xs">$</span>
                                        <input
                                            type="number" step="0.0001"
                                            className="w-full pl-7 pr-3 border border-sky-200 dark:border-sky-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            value={formData.in_rate_per_min}
                                            onChange={e => setFormData({ ...formData, in_rate_per_min: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Initial (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border border-sky-200 dark:border-sky-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 px-3 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            value={formData.in_initial_increment_sec}
                                            onChange={e => setFormData({ ...formData, in_initial_increment_sec: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Increment (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border border-sky-200 dark:border-sky-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 px-3 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            value={formData.in_increment_sec}
                                            onChange={e => setFormData({ ...formData, in_increment_sec: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outbound */}
                        <div className="bg-amber-50/70 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 flex flex-col gap-3.5 shadow-2xs">
                            <h4 className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-2 uppercase tracking-wider text-xs font-mono">
                                <PhoneOutgoing size={16} /> Outbound Configuration
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Rate Per Minute ($)</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-xs">$</span>
                                        <input
                                            type="number" step="0.0001"
                                            className="w-full pl-7 pr-3 border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            value={formData.ob_rate_per_min}
                                            onChange={e => setFormData({ ...formData, ob_rate_per_min: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Initial (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 px-3 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            value={formData.ob_initial_increment_sec}
                                            onChange={e => setFormData({ ...formData, ob_initial_increment_sec: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Increment (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-[#121520] rounded-xl py-2 px-3 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            value={formData.ob_increment_sec}
                                            onChange={e => setFormData({ ...formData, ob_increment_sec: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-xs font-bold text-white shadow-lg shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
                            {card ? 'Update' : 'Create'} Rate Card
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditRecRateCardModal = ({ card, onClose, onSave, loading }) => {
    const [formData, setFormData] = useState({
        id: card?.id || '',
        name: card?.name || '',
        currency: card?.currency || 'USD',
        rate_per_min: card?.rate_per_min || 0.001,
        retention_period: card?.retention_period || 7
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
                            <CreditCard className="text-primary-600 h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{card ? 'Edit' : 'New'} Recording Rate Card</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Configuration Panel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {!card && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Card ID (Optional)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900"
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    placeholder="Auto-generated if blank"
                                />
                            </div>
                        )}
                        <div className={card ? "col-span-1 md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Card Name</label>
                            <input
                                required
                                disabled={!!card}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900 disabled:opacity-60 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. 7_days_0.001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Currency</label>
                            <input
                                required
                                disabled={!!card}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900 disabled:opacity-60 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                placeholder="USD"
                                maxLength={3}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Rate Per Minute ($)</label>
                            <input
                                type="number"
                                step="0.000001"
                                required
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900"
                                value={formData.rate_per_min}
                                onChange={e => setFormData({ ...formData, rate_per_min: e.target.value })}
                                placeholder="0.001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Retention Period (Days)</label>
                            <select
                                required
                                disabled={!!card}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900 disabled:opacity-60 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={formData.retention_period}
                                onChange={e => setFormData({ ...formData, retention_period: parseInt(e.target.value, 10) })}
                            >
                                <option value={7}>7 Days</option>
                                <option value={15}>15 Days</option>
                                <option value={30}>30 Days</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl bg-white text-sm font-black text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-2xl bg-primary-600 text-sm font-black text-white shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save size={18} />}
                            {card ? 'Update' : 'Create'} Recording Rate Card
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RateCardsPage;
