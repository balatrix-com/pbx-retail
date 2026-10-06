import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Phone, Search, RefreshCw } from 'lucide-react';

const ExtensionStatus = () => {
    const [statusData, setStatusData] = useState({ online_count: 0, extensions: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/extensions/status');
            setStatusData(response.data || { online_count: 0, extensions: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const filteredExtensions = statusData.extensions.filter(ext => 
        ext.extension.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ext.customerCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Global Extension Status</h1>
                    <p className="text-gray-500 mt-1.5 font-medium">Real-time view of all active extensions across all tenants.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-64 rounded-xl border-0 py-2.5 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                            placeholder="Search by Ext or Customer..."
                        />
                    </div>
                    <button 
                        onClick={fetchStatus} 
                        className="inline-flex justify-center items-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm"
                        title="Refresh Status"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary-500' : 'text-gray-500'}`} />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                        Live Registrations
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/50 shadow-sm">
                        {statusData.online_count} Active Overall
                    </span>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm font-medium">Loading global status...</div>
                ) : filteredExtensions.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm font-medium">No active extensions found matching your search.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant / Customer</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Extension</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Device / IP</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredExtensions.map((ext, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50">
                                                {ext.customerCode}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-8 bg-green-50 text-green-700 ring-1 ring-green-100 rounded-full flex items-center justify-center shadow-sm">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div className="font-bold text-gray-900 text-sm">
                                                    {ext.extension}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ext.devices.map((device, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{device.user_agent || 'Unknown Device'}</span>
                                                    <span className="text-xs text-gray-500 font-mono mt-0.5">{device.received_from || device.address}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col items-start">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold leading-4 tracking-wide bg-green-50 text-green-700 ring-1 ring-green-200/50">
                                                    <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    ONLINE
                                                </span>
                                                {ext.devices.map((device, i) => (
                                                    <span key={i} className="text-[10px] text-gray-400 mt-1 font-medium tracking-wide">
                                                        Expires: {device.expires_in}s
                                                    </span>
                                                ))}
                                            </div>
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

export default ExtensionStatus;
