import React, { useState, useEffect } from 'react';
import { Phone, Plus, Search, Trash2, Link as LinkIcon, Unlink, Globe, Hash, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import telecomService from '../../services/telecom.service';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCustomerId } from '../../utils/billing.utils';

const NumbersManagement = () => {
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('tfn');
    const [numbers, setNumbers] = useState({ tfns: [], dids: [] });
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(null); // { type, id }
    const [newNumber, setNewNumber] = useState({ number: '', price: '2.00', provider: 'telnyx', isDemo: false });
    const [selectedTenant, setSelectedTenant] = useState('');
    const [demoFilter, setDemoFilter] = useState('all'); // all, standard, demo

    useEffect(() => {
        fetchData();
        fetchTenants();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await telecomService.adminGetAllNumbers();
            setNumbers(data);
        } catch (error) {
            console.error('Failed to fetch numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await api.get('/tenants');
            setTenants(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    };

    const handleAddNumber = async (e) => {
        e.preventDefault();
        try {
            const numberList = newNumber.number.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            if (numberList.length === 0) return;

            if (activeTab === 'tfn') {
                await telecomService.adminAddTFNBulk({
                    numbers: numberList,
                    price: parseFloat(newNumber.price),
                    isDemo: newNumber.isDemo
                });
            } else {
                await telecomService.adminAddDIDBulk({
                    numbers: numberList,
                    monthlyFee: parseFloat(newNumber.price),
                    provider: newNumber.provider
                });
            }
            setShowAddModal(false);
            setNewNumber({ number: '', price: '2.00', provider: 'telnyx', isDemo: false });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add number');
        }
    };

    const handleAssign = async () => {
        if (!selectedTenant) return;
        try {
            await telecomService.adminAssignNumber({
                type: showAssignModal.type.toUpperCase(),
                id: showAssignModal.id,
                tenantId: selectedTenant
            });
            setShowAssignModal(null);
            setSelectedTenant('');
            fetchData();
        } catch (error) {
            alert('Failed to assign number');
        }
    };

    const handleUnassign = async (type, id) => {
        if (!window.confirm('Are you sure you want to unassign this number? The tenant will lose access immediately.')) return;
        try {
            await telecomService.adminUnassignNumber({ type: type.toUpperCase(), id });
            fetchData();
        } catch (error) {
            alert('Failed to unassign number');
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm('Are you sure you want to delete this number from the database?')) return;
        try {
            await telecomService.adminDeleteNumber({ type: type.toUpperCase(), id });
            fetchData();
        } catch (error) {
            alert('Failed to delete number');
        }
    };

    const currentNumbers = activeTab === 'tfn' ? numbers.tfns : numbers.dids;
    const filteredNumbers = currentNumbers.filter(n => {
        const matchesSearch = n.number.includes(search) || n.tenant?.name?.toLowerCase().includes(search.toLowerCase());
        if (activeTab === 'did') return matchesSearch;

        const matchesDemoFilter = demoFilter === 'all' ||
            (demoFilter === 'demo' && n.isDemo) ||
            (demoFilter === 'standard' && !n.isDemo);
        return matchesSearch && matchesDemoFilter;
    });

    if (!isSuperAdmin) return <div className="p-8">Access Denied</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 md:gap-3">
                        <Globe className="text-primary-600 h-6 w-6 md:h-8 md:w-8" />
                        Number Inventory
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Manage TFN and DID pool for all tenants.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    Add {activeTab.toUpperCase()}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60">
                <button
                    onClick={() => setActiveTab('tfn')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 ${activeTab === 'tfn' ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Toll-Free (TFN)
                </button>
                <button
                    onClick={() => setActiveTab('did')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 ${activeTab === 'did' ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Direct Dial (DID)
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by number or tenant name..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Sub-Filters for TFN */}
            {activeTab === 'tfn' && (
                <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-fit border border-gray-100">
                    <button
                        onClick={() => setDemoFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${demoFilter === 'all' ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        All TFNs
                    </button>
                    <button
                        onClick={() => setDemoFilter('standard')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${demoFilter === 'standard' ? 'bg-white text-primary-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Standard
                    </button>
                    <button
                        onClick={() => setDemoFilter('demo')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${demoFilter === 'demo' ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Demo Pool
                    </button>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Number</th>
                                <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Assignment</th>
                                <th className="hidden md:table-cell px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Cost/Month</th>
                                <th className="px-4 md:px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold">Loading inventory...</td></tr>
                            ) : filteredNumbers.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold">No numbers found matching your criteria.</td></tr>
                            ) : (
                                filteredNumbers.map(n => (
                                    <tr key={n.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-4 md:px-6 py-5">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="hidden xs:flex p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                                    <Hash size={16} />
                                                </div>
                                                <span className="font-extrabold text-gray-900 text-base md:text-lg">{n.number}</span>
                                                {n.isDemo && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-tighter">
                                                        DEMO
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-gray-100 text-gray-700 uppercase tracking-tight">
                                                {activeTab.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-5">
                                            {n.tenant ? (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="text-primary-500 hidden xs:block" size={14} />
                                                    <div className="truncate max-w-[100px] md:max-w-none">
                                                        <div className="font-bold text-gray-900 text-sm">{n.tenant.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">{formatCustomerId(n.tenant.customerCode)}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <CheckCircle2 size={10} />
                                                    AVAILABLE
                                                </span>
                                            )}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-5 font-extrabold text-gray-900 text-sm">
                                            ${activeTab === 'tfn' ? n.price : n.monthlyFee}
                                        </td>
                                        <td className="px-4 md:px-6 py-5">
                                            <div className="flex items-center justify-end gap-1 md:gap-3">
                                                {n.tenant ? (
                                                    <button
                                                        onClick={() => handleUnassign(activeTab, n.id)}
                                                        className="text-orange-600 hover:text-orange-700 p-2 hover:bg-orange-50 rounded-xl transition-all"
                                                        title="Unassign Number"
                                                    >
                                                        <Unlink size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowAssignModal({ type: activeTab, id: n.id })}
                                                        className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-xl transition-all"
                                                        title="Assign to Tenant"
                                                    >
                                                        <LinkIcon size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(activeTab, n.id)}
                                                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete from System"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Add New {activeTab.toUpperCase()}</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleAddNumber} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest ml-1">Phone Numbers (One per line)</label>
                                <textarea
                                    placeholder="+18001234567&#10;+18007654321"
                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-lg h-32 resize-none"
                                    value={newNumber.number}
                                    onChange={e => setNewNumber({ ...newNumber, number: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-extrabold text-lg shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                            >
                                Add to Inventory
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                <LinkIcon className="text-primary-600" />
                                Assign Number
                            </h2>
                            <button onClick={() => setShowAssignModal(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="bg-primary-50 p-4 rounded-2xl mb-6">
                            <div className="text-xs font-extrabold text-primary-600 uppercase tracking-widest mb-1">Assigning Number</div>
                            <div className="text-xl font-black text-primary-900">
                                {currentNumbers.find(n => n.id === showAssignModal.id)?.number}
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest ml-1">Select Tenant</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                    value={selectedTenant}
                                    onChange={e => setSelectedTenant(e.target.value)}
                                >
                                    <option value="">Select a company...</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({formatCustomerId(t.customerCode)})</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedTenant}
                                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-extrabold text-lg shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Assign Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NumbersManagement;
