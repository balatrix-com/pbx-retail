import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Phone, RefreshCw } from 'lucide-react';

const ExtensionsStatusPage = () => {
    const [statusData, setStatusData] = useState({ online_count: 0, extensions: [] });
    const [loadingStatus, setLoadingStatus] = useState(true);

    const fetchStatus = async () => {
        setLoadingStatus(true);
        try {
            const response = await api.get('/telecom/extensions/status');
            setStatusData(response.data || { online_count: 0, extensions: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Extension Status</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Real-time view of currently registered active extensions.</p>
                </div>
                <button
                    onClick={fetchStatus}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] w-full sm:w-auto shadow-sm"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingStatus ? 'animate-spin text-primary-500' : 'text-gray-500'}`} />
                    Refresh Status
                </button>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden mt-6">
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
                                                <span className="text-xs text-gray-500 font-mono truncate max-w-sm font-semibold">IP: {device.received_from || device.address}</span>
                                                <span className="text-xs text-gray-500 truncate max-w-sm">Agent: {device.user_agent}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end sm:space-x-6 sm:pl-4">
                                    <div className="flex flex-col items-start sm:items-end">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold leading-4 tracking-wide bg-green-50 text-green-700 ring-1 ring-green-200/50">
                                            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                            ONLINE
                                        </span>
                                        {ext.devices.map((device, i) => (
                                            <span key={i} className="text-xs text-gray-500 mt-1 font-medium">Expires: {device.expires_in}s</span>
                                        ))}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ExtensionsStatusPage;
