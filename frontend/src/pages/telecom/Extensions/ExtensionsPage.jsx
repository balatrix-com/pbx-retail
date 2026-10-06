import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Key, Users } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import MonitoringExtensionModal from '../../../components/admin/MonitoringExtensionModal';

function ExtensionsPage() {
    const navigate = useNavigate();
    const [extensions, setExtensions] = useState([]);
    const [monitoringUsers, setMonitoringUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Monitoring Edit State
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);
    const [selectedMonitoringUser, setSelectedMonitoringUser] = useState(null);

    const { role, user: currentUser } = useAuth(); // Assuming currentUser has tenantId
    const canManageExtensions = role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const extRes = await api.get('/telecom/extensions');
            setExtensions(extRes.data);

            if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
                try {
                    const usersRes = await api.get('/users?limit=100');
                    const users = usersRes.data.data || [];
                    const monitoring = users.filter(u => u.monitoringEnabled && u.monitoringExtension);
                    setMonitoringUsers(monitoring);
                } catch (userErr) {
                    console.error('Failed to fetch users for monitoring', userErr);
                    setMonitoringUsers([]);
                }
            } else {
                setMonitoringUsers([]);
            }

            setError(null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleEditMonitoring = (user) => {
        setSelectedMonitoringUser(user);
        setShowMonitoringModal(true);
    };

    const handleUpdateMonitoring = async ({ monitoringExtension, monitoringSecret, name }) => {
        if (!selectedMonitoringUser) return;
        try {
            await api.patch(`/users/${selectedMonitoringUser.id}/permissions`, {
                monitoringEnabled: true,
                monitoringExtension,
                monitoringSecret,
                name
            });
            setShowMonitoringModal(false);
            setSelectedMonitoringUser(null);
            fetchData(); // Refresh
        } catch (err) {
            console.error("Failed to update monitoring user", err);
            alert("Failed to update: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDisableMonitoring = async (user) => {
        if (!window.confirm(`Are you sure you want to disable monitoring for ${user.name || user.email}?`)) {
            return;
        }

        try {
            await api.patch(`/users/${user.id}/permissions`, {
                monitoringEnabled: false,
                monitoringExtension: null,
                monitoringSecret: null
            });
            fetchData();
        } catch (err) {
            console.error('Failed to disable monitoring:', err);
            alert(err.response?.data?.message || 'Failed to disable monitoring');
        }
    };

    const handleDelete = async (id, extensionNumber) => {
        if (!window.confirm(`Are you sure you want to delete extension ${extensionNumber}?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/extensions/${id}`);
            setExtensions(extensions.filter(ext => ext.id !== id));
        } catch (err) {
            console.error('Failed to delete extension:', err);
            alert(err.response?.data?.message || 'Failed to delete extension');
        }
    };

    const filteredExtensions = extensions.filter(ext =>
        ext.extensionNumber.includes(searchTerm) ||
        ext.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Extensions</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Manage phone system extensions and routing.</p>
                </div>
                {canManageExtensions && (
                    <button
                        onClick={() => navigate('/telecom/extensions/new')}
                        className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Extension
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium shadow-sm mx-4 sm:mx-0">
                    {error}
                </div>
            )}

            <div className="relative mx-4 sm:mx-0">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search extensions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full sm:max-w-md rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white transition-all"
                />
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Extension #</th>
                                <th className="px-4 md:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Name</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">SIP Username</th>
                                <th className="hidden md:table-cell px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Forwarding</th>
                                <th className="hidden sm:table-cell px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Groups</th>
                                <th className="px-4 md:px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredExtensions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-sm font-medium text-gray-500 italic bg-gray-50/30">
                                        {searchTerm ? 'No matching extensions found' : 'No extensions yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredExtensions.map((ext) => (
                                    <tr key={ext.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs md:text-sm font-bold text-primary-700 bg-primary-50 ring-1 ring-inset ring-primary-100/50 shadow-sm font-mono">
                                                {ext.extensionNumber}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 truncate max-w-[100px] md:max-w-none">{ext.name}</td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 font-medium select-all">
                                            {ext.sipUsername}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex flex-col gap-1 items-start">
                                                {ext.forwardAllEnabled ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/50">All</span>
                                                ) : ext.forwardNoAnswerEnabled ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/50">No Answer</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Off</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm">
                                            {ext.ringGroupMembers && ext.ringGroupMembers.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/50">
                                                    {ext.ringGroupMembers.length}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors focus:outline-none"
                                                    onClick={() => navigate(`/telecom/extensions/${ext.id}/edit`)}
                                                    title="Edit Extension"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {canManageExtensions && (
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none"
                                                        onClick={() => handleDelete(ext.id, ext.extensionNumber)}
                                                        title="Delete Extension"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Monitoring Extensions Section */}
            {monitoringUsers.length > 0 && (
                <>
                    <div className="mt-12 mb-4 flex items-center space-x-2">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Monitoring Extensions</h2>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Extensions assigned to users for real-time call monitoring.</p>
                        </div>
                    </div>

                    <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Extension #</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">User Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">User Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">SIP Password</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {monitoringUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold text-indigo-700 bg-indigo-50 ring-1 ring-inset ring-indigo-100/50 shadow-sm font-mono">
                                                    {user.monitoringExtension}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.name || 'Unnamed'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="inline-flex items-center text-xs font-mono font-medium text-gray-500 bg-gray-50/50 px-2 py-1 rounded border border-gray-100">
                                                    <Key className="h-3 w-3 mr-1 text-gray-400" />
                                                    {user.monitoringSecret ? '••••••' : 'Not Set'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors focus:outline-none"
                                                        onClick={() => handleEditMonitoring(user)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {canManageExtensions && (
                                                        <button
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none"
                                                            onClick={() => handleDisableMonitoring(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {showMonitoringModal && selectedMonitoringUser && (
                <MonitoringExtensionModal
                    onClose={() => {
                        setShowMonitoringModal(false);
                        setSelectedMonitoringUser(null);
                    }}
                    onSubmit={handleUpdateMonitoring}
                    initialExtension={selectedMonitoringUser.monitoringExtension}
                    initialSecret={selectedMonitoringUser.monitoringSecret}
                    initialName={selectedMonitoringUser.name}
                    isEditing={true}
                />
            )}
        </div>
    );
}

export default ExtensionsPage;
