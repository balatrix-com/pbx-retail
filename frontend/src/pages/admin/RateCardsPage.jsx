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
    Globe,
    PhoneIncoming,
    PhoneOutgoing,
    Info,
    CheckCircle,
    AlertCircle,
    Loader2,
    Users
} from 'lucide-react';
import clsx from 'clsx';

const RateCardsPage = () => {
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('standard'); // 'standard' or 'recording'

    // Standard Rate Card States
    const [rateCards, setRateCards] = useState([]);
    const [mappings, setMappings] = useState([]);

    // Recording Rate Card States
    const [recRateCards, setRecRateCards] = useState([]);
    const [recMappings, setRecMappings] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [mappingSearchQuery, setMappingSearchQuery] = useState('');

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
            const [rcRes, mapRes, recRcRes, recMapRes] = await Promise.all([
                api.get('/admin/rate-cards'),
                api.get('/admin/rate-cards/mappings'),
                api.get('/admin/rec-rate-cards'),
                api.get('/admin/rec-rate-cards/mappings')
            ]);
            setRateCards(rcRes.data.data || []);
            setMappings(mapRes.data.data || []);
            setRecRateCards(recRcRes.data.data || []);
            setRecMappings(recMapRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRateCard = async (formData) => {
        try {
            setModalLoading(true);
            if (editingCard) {
                await api.put(`/admin/rate-cards/${editingCard.ratecard_id}`, formData);
            } else {
                await api.post('/admin/rate-cards', formData);
            }
            setShowModal(false);
            setEditingCard(null);
            fetchData();
        } catch (error) {
            console.error('Failed to save rate card:', error);
            alert('Error saving rate card: ' + (error.response?.data?.message || error.message));
        } finally {
            setModalLoading(false);
        }
    };

    const handleUpdateMapping = async (customerId, ratecardId) => {
        try {
            await api.post('/admin/rate-cards/mappings', {
                customer_id: customerId,
                ratecard_id: parseInt(ratecardId)
            });
            fetchData();
        } catch (error) {
            console.error('Failed to update mapping:', error);
            alert('Error updating mapping: ' + (error.response?.data?.message || error.message));
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
                rec_rc_id: parseInt(recRcId)
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

    // Filter calculations depending on activeTab
    const filteredRateCards = rateCards.filter(card =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.country?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredMappings = mappings.filter(m =>
        m.customer_id.toLowerCase().includes(mappingSearchQuery.toLowerCase()) ||
        m.customer_email.toLowerCase().includes(mappingSearchQuery.toLowerCase())
    );

    const filteredRecRateCards = recRateCards.filter(card =>
        ['7_days_standard', '15_days_standard', '30_days_standard'].includes(card.name.toLowerCase()) &&
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRecMappings = recMappings.filter(m =>
        String(m.customer_id).toLowerCase().includes(mappingSearchQuery.toLowerCase()) ||
        String(m.customer_email || '').toLowerCase().includes(mappingSearchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2 md:gap-3">
                        <CreditCard className="text-primary-600 h-6 w-6 md:h-8 md:w-8" />
                        {activeTab === 'standard' ? 'Rate Card Management' : 'Recording Rate Cards'}
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                        {activeTab === 'standard'
                            ? 'Configure call rates and assign them to customers'
                            : 'Configure recording storage and rates per minute, then assign to tenants'}
                    </p>
                </div>
                {activeTab === 'standard' && (
                    <button
                        onClick={() => {
                            setEditingCard(null);
                            setShowModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all w-full sm:w-auto"
                    >
                        <Plus size={20} />
                        Add New Rate Card
                    </button>
                )}
            </header>

            {/* Tabs Selector */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60">
                <button
                    onClick={() => {
                        setActiveTab('standard');
                        setSearchQuery('');
                        setMappingSearchQuery('');
                    }}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200",
                        activeTab === 'standard'
                            ? "bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10"
                            : "text-slate-500 hover:text-slate-900"
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
                        "px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200",
                        activeTab === 'recording'
                            ? "bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10"
                            : "text-slate-500 hover:text-slate-900"
                    )}
                >
                    Recording Rate Cards
                </button>
            </div>

            {activeTab === 'standard' ? (
                <>
                    {/* Standard Rate Cards Table */}
                    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Existing Rate Cards
                                <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{rateCards.length}</span>
                            </h2>
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search rate cards..."
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
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Name & Region</th>
                                        <th className="hidden xs:table-cell px-3 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Currency</th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100"><div className="flex items-center gap-2 justify-center"><PhoneIncoming size={12} className="text-blue-500" /> Inbound</div></th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100"><div className="flex items-center gap-2 justify-center"><PhoneOutgoing size={12} className="text-orange-500" /> Outbound</div></th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                                                    <p className="text-sm font-medium text-gray-500">Loading rate cards...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRateCards.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No rate cards found</td>
                                        </tr>
                                    ) : filteredRateCards.map(card => (
                                        <tr key={card.ratecard_id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 md:px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-sm">{card.name}</span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Globe size={10} /> {card.country || 'Global'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="hidden xs:table-cell px-3 py-4 text-center">
                                                <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 ring-1 ring-inset ring-gray-500/10 uppercase">
                                                    {card.currency}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs md:text-sm font-bold text-gray-900">${parseFloat(card.in_rate_per_min).toFixed(4)}<span className="text-[10px] text-gray-400">/min</span></span>
                                                    <div className="hidden md:flex gap-1">
                                                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-bold">In: {card.in_initial_increment_sec}s</span>
                                                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-bold">Inc: {card.in_increment_sec}s</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs md:text-sm font-bold text-gray-900">${parseFloat(card.ob_rate_per_min).toFixed(4)}<span className="text-[10px] text-gray-400">/min</span></span>
                                                    <div className="hidden lg:flex gap-1">
                                                        <span className="text-[10px] bg-orange-50 text-orange-700 px-1 py-0.5 rounded font-bold">In: {card.ob_initial_increment_sec}s</span>
                                                        <span className="text-[10px] bg-orange-50 text-orange-700 px-1 py-0.5 rounded font-bold">Inc: {card.ob_increment_sec}s</span>
                                                    </div>
                                                </div>
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

                    {/* Standard Customer Mapping */}
                    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="text-primary-600 h-6 w-6" />
                                Customer Mapping
                            </h2>
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search customers..."
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
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Customer</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Email Address</th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Rate Card</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500 font-medium">Loading mappings...</td>
                                        </tr>
                                    ) : filteredMappings.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500 font-medium">No customers found</td>
                                        </tr>
                                    ) : filteredMappings.map(mapping => (
                                        <tr key={mapping.customer_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 md:px-6 py-4 font-bold text-gray-900 text-sm truncate max-w-[100px] md:max-w-none">{mapping.customer_id}</td>
                                            <td className="hidden md:table-cell px-6 py-4 text-sm font-medium text-gray-600 truncate max-w-[200px]">{mapping.customer_email}</td>
                                            <td className="px-4 md:px-6 py-4">
                                                <select
                                                    className="w-full max-w-[150px] md:max-w-[200px] text-[10px] md:text-sm font-bold text-gray-700 rounded-xl border-gray-200 focus:ring-primary-500 focus:border-primary-500 bg-gray-50/50 py-1.5"
                                                    value={mapping.ratecard_id || ""}
                                                    onChange={(e) => handleUpdateMapping(mapping.customer_id, e.target.value)}
                                                >
                                                    <option value="" disabled>Select Rate Card</option>
                                                    {rateCards.map(rc => (
                                                        <option key={rc.ratecard_id} value={rc.ratecard_id}>{rc.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            ) : (
                <>
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
                                                ${parseFloat(card.rate_per_min).toFixed(4)}<span className="text-[10px] text-gray-400 font-normal">/min</span>
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
                </>
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

            {/* Recording Add/Edit Modal */}
            {showModal && activeTab === 'recording' && (
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
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-100 p-2.5 rounded-2xl">
                            <CreditCard className="text-primary-600 h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{card ? 'Edit' : 'New'} Rate Card</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Configuration Panel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Card Name</label>
                            <input
                                required
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Premium North America"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Currency</label>
                            <input
                                required
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                placeholder="USD"
                                maxLength={3}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Country/Region</label>
                            <input
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent py-3 px-4 font-bold text-gray-900"
                                value={formData.country}
                                onChange={e => setFormData({ ...formData, country: e.target.value })}
                                placeholder="e.g. USA, Canada"
                            />
                        </div>
                    </div>

                    {/* Rates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Inbound */}
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col gap-4">
                            <h4 className="font-black text-blue-700 flex items-center gap-2 uppercase tracking-widest text-sm">
                                <PhoneIncoming size={18} /> Inbound Configuration
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-blue-400 uppercase">Rate Per Minute</label>
                                    <input
                                        type="number" step="0.0001"
                                        className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-blue-200"
                                        value={formData.in_rate_per_min}
                                        onChange={e => setFormData({ ...formData, in_rate_per_min: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-blue-400 uppercase">Initial (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-blue-200"
                                            value={formData.in_initial_increment_sec}
                                            onChange={e => setFormData({ ...formData, in_initial_increment_sec: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-blue-400 uppercase">Increment (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-blue-200"
                                            value={formData.in_increment_sec}
                                            onChange={e => setFormData({ ...formData, in_increment_sec: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outbound */}
                        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex flex-col gap-4">
                            <h4 className="font-black text-orange-700 flex items-center gap-2 uppercase tracking-widest text-sm">
                                <PhoneOutgoing size={18} /> Outbound Configuration
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-orange-400 uppercase">Rate Per Minute</label>
                                    <input
                                        type="number" step="0.0001"
                                        className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-orange-200"
                                        value={formData.ob_rate_per_min}
                                        onChange={e => setFormData({ ...formData, ob_rate_per_min: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-orange-400 uppercase">Initial (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-orange-200"
                                            value={formData.ob_initial_increment_sec}
                                            onChange={e => setFormData({ ...formData, ob_initial_increment_sec: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-orange-400 uppercase">Increment (Sec)</label>
                                        <input
                                            type="number"
                                            className="w-full mt-1 border-0 bg-white rounded-xl py-2 px-3 font-bold text-gray-900 ring-1 ring-orange-200"
                                            value={formData.ob_increment_sec}
                                            onChange={e => setFormData({ ...formData, ob_increment_sec: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
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
        rate_per_min: card?.rate_per_min || 0,
        retention_period: card?.retention_period || 7,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: formData.id ? parseInt(formData.id) : undefined,
            rate_per_min: parseFloat(formData.rate_per_min),
            retention_period: parseInt(formData.retention_period)
        });
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
                                onChange={e => setFormData({ ...formData, retention_period: parseInt(e.target.value) })}
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
