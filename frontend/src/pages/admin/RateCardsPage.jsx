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
    Users
} from 'lucide-react';

const RateCardsPage = () => {
    const { isSuperAdmin } = useAuth();

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

    return (
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
