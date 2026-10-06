import React, { useEffect, useState } from 'react';
import { telecomService } from '../../services/telecom.service';
import { useAuth } from '../../context/AuthContext';
import { Users, Phone, Eye, EyeOff, Edit2, Check, AlertTriangle, Lock } from 'lucide-react';

const ExtensionsPage = () => {
    const { user } = useAuth();
    const [extensions, setExtensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const [activeTab, setActiveTab] = useState('settings'); // settings | status
    const [statusData, setStatusData] = useState({ online_count: 0, extensions: [] });
    const [loadingStatus, setLoadingStatus] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [extsData] = await Promise.all([
                    telecomService.listExtensions(user.tenantId)
                ]);
                setExtensions(extsData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const fetchStatus = async () => {
        setLoadingStatus(true);
        try {
            const data = await telecomService.getExtensionStatus(user.tenantId);
            setStatusData(data || { online_count: 0, extensions: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'status') {
            fetchStatus();
        }
    }, [activeTab]);

    const handleEdit = (ext) => {
        setEditingId(ext.id);
        setEditName(ext.name);
    };

    const handleSave = async (extId) => {
        setExtensions(extensions.map(e => e.id === extId ? { ...e, name: editName } : e));
        setEditingId(null);
    };

    const togglePassword = (extId) => {
        setExtensions(extensions.map(e => {
            if (e.id === extId) {
                return { ...e, showPass: !e.showPass };
            }
            return e;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Extensions</h1>
                    <p className="text-gray-500 mt-1.5 font-medium">Manage user extensions and device configurations.</p>
                </div>
                {activeTab === 'settings' && (
                    <button className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500">
                        Add Extension
                    </button>
                )}
                {activeTab === 'status' && (
                    <button onClick={fetchStatus} className="inline-flex justify-center items-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm">
                        Refresh Status
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60 gap-1">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-2.5 px-5 rounded-xl font-extrabold text-sm transition-all duration-200 ${
                        activeTab === 'settings'
                            ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    Extension Settings
                </button>
                <button
                    onClick={() => setActiveTab('status')}
                    className={`py-2.5 px-5 rounded-xl font-extrabold text-sm transition-all duration-200 ${
                        activeTab === 'status'
                            ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    Extension Status
                </button>
            </div>

            {activeTab === 'settings' ? (
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                            Extensions
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/50 shadow-sm">
                            {extensions.length} Configured
                        </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {extensions.map((ext) => (
                            <li key={ext.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-gray-50/80 transition-colors">
                                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                    <div className="h-12 w-12 bg-primary-50 text-primary-700 ring-1 ring-primary-100 rounded-full flex items-center justify-center font-extrabold text-lg shadow-sm">
                                        {ext.extensionNumber}
                                    </div>
                                    <div className="min-w-0">
                                        {editingId === ext.id ? (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSave(ext.id)} className="text-green-600 hover:text-green-700 bg-white hover:bg-green-50 p-1.5 rounded-md ring-1 ring-gray-200 transition-all shadow-sm">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2 group/edit cursor-pointer" onClick={() => handleEdit(ext)}>
                                                <p className="text-sm font-bold text-gray-900 truncate">{ext.name}</p>
                                                <button className="text-gray-400 hover:text-primary-600 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center mt-1.5">
                                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">SIP: {ext.sipUsername}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end sm:space-x-6 sm:pl-4">
                                    <div className="flex flex-col items-start sm:items-end">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</span>
                                        <div className="flex items-center space-x-2">
                                            <code className="text-xs bg-gray-50 ring-1 ring-gray-200/60 rounded px-2 py-1 font-mono font-bold tracking-widest text-gray-700 shadow-sm w-24 text-center">
                                                {ext.showPass ? 'Secr3t!' : '•••••••'}
                                            </code>
                                            <button onClick={() => togglePassword(ext.id)} className="text-gray-400 hover:text-primary-600 transition-colors p-1.5 hover:bg-primary-50 rounded-md">
                                                {ext.showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                            Live Registrations
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/50 shadow-sm">
                            {statusData.online_count} Active
                        </span>
                    </div>
                    {loadingStatus ? (
                        <div className="p-8 text-center text-gray-500 text-sm font-medium">Loading status...</div>
                    ) : statusData.extensions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm font-medium">No active extensions found.</div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {statusData.extensions.map((ext, idx) => (
                                <li key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-gray-50/80 transition-colors">
                                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                        <div className="h-12 w-12 bg-green-50 text-green-700 ring-1 ring-green-100 rounded-full flex items-center justify-center font-extrabold text-lg shadow-sm">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">Ext: {ext.extension}</p>
                                            {ext.devices.map((device, i) => (
                                                <div key={i} className="flex flex-col mt-1">
                                                    <span className="text-xs text-gray-500 font-mono truncate max-w-sm">IP: {device.received_from || device.address}</span>
                                                    <span className="text-xs text-gray-500 truncate max-w-sm">Agent: {device.user_agent}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end sm:space-x-6 sm:pl-4">
                                        <div className="flex flex-col items-start sm:items-end">
                                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">ONLINE</span>
                                            {ext.devices.map((device, i) => (
                                                <span key={i} className="text-xs text-gray-500">Expires in: {device.expires_in}s</span>
                                            ))}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExtensionsPage;
