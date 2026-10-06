import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Search, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const DIDsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dids, setDids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredDIDs = (dids || []).filter(did =>
        did.number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRouteTypeBadge = (routeType) => {
        const badges = {
            extension: { label: 'Extension', className: 'bg-green-50 text-green-700 ring-green-600/20' },
            ring_group: { label: 'Ring Group', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
            ivr: { label: 'IVR', className: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
            did_forward: { label: 'Internal Forward', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
            forward: { label: 'External Forward', className: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
        };
        const badge = badges[routeType] || { label: routeType, className: 'bg-gray-50 text-gray-700 ring-gray-600/20' };
        return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${badge.className}`}>{badge.label}</span>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Phone Numbers (DIDs)</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Manage incoming phone numbers and routing</p>
                </div>
                {user?.role === 'SUPER_ADMIN' && (
                    <button
                        onClick={() => navigate('/telecom/dids/new')}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Phone Number
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center">
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                </div>
            )}

            <div className="relative w-full max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search phone numbers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                />
            </div>

            {filteredDIDs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                    <Phone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No phone numbers yet</h3>
                    <p className="text-gray-500 mt-1 mb-6 font-medium">Add your first DID to start routing calls</p>
                    {user?.role === 'SUPER_ADMIN' && (
                        <button
                            onClick={() => navigate('/telecom/dids/new')}
                            className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Phone Number
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDIDs.map((did) => (
                        <div key={did.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">

                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold font-mono tracking-tight text-gray-900">{did.number}</h3>
                                </div>
                                {getRouteTypeBadge(did.routeType)}
                            </div>

                            <div className="space-y-4 px-6 py-5 flex-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Route To:</span>
                                    <span className={`font-bold ${did.routeType === 'forward' ? 'font-mono text-gray-900' : 'text-primary-700'}`}>
                                        {did.routeType === 'forward'
                                            ? did.forwardNumber || 'Not configured'
                                            : did.routeTargetId || 'Not configured'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Provider:</span>
                                    <span className="font-bold text-gray-900">{did.provider || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Monthly Fee:</span>
                                    <span className="font-bold text-gray-900">${parseFloat(did.monthlyFee || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Status:</span>
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${did.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
                                        {did.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => navigate(`/telecom/dids/${did.id}/edit`)}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none"
                                >
                                    <Edit className="h-4 w-4 text-gray-500" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(did.id, did.number)}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 hover:ring-red-200 hover:text-red-700 transition-all focus:outline-none"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DIDsPage;
