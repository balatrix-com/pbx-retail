import React, { useState } from 'react';
import { Hash, Lock } from 'lucide-react';
import api from '../../services/api';

const MonitoringExtensionModal = ({
    onClose,
    onSubmit,
    loading,
    isEditing = false,
    initialExtension = '',
    initialSecret = '',
    initialName = '',
    initialUserId = '',
    users = [],
    tenantId
}) => {
    const [extension, setExtension] = useState(initialExtension);
    const [secret, setSecret] = useState(initialSecret);
    const [name, setName] = useState(initialName);
    const [selectedUserId, setSelectedUserId] = useState(initialUserId);
    const [userList, setUserList] = useState(users);
    const [error, setError] = useState('');
    const [fetching, setFetching] = useState(true);

    // Fetch users if not passed via props (runs once on mount or when tenantId changes)
    React.useEffect(() => {
        if (users && users.length > 0) {
            setUserList(users);
            if (!selectedUserId && users[0]) {
                setSelectedUserId(users[0].id);
                if (!name) setName(users[0].name || users[0].email);
            }
            return;
        }

        let isMounted = true;
        const fetchUsers = async () => {
            try {
                const params = tenantId ? { tenantId, limit: 100 } : { limit: 100 };
                const res = await api.get('/users', { params });
                if (!isMounted) return;
                const fetched = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                setUserList(fetched);
                if (!selectedUserId && fetched.length > 0) {
                    const first = fetched.find(u => u.id === initialUserId) || fetched[0];
                    setSelectedUserId(first.id);
                    if (!name) setName(first.name || first.email);
                }
            } catch (err) {
                console.error('Failed to fetch users in MonitoringExtensionModal:', err);
            }
        };

        fetchUsers();
        return () => { isMounted = false; };
    }, [tenantId]);

    // Fetch next available extension
    React.useEffect(() => {
        if (isEditing || initialExtension) return;

        const fetchNextExtension = async () => {
            try {
                setFetching(true);
                const params = tenantId ? { tenantId } : {};
                const res = await api.get('/telecom/extensions/next-number', { params });
                if (res.data.nextExtensionNumber) {
                    setExtension(res.data.nextExtensionNumber.toString());
                }
            } catch (err) {
                console.error("Failed to fetch next extension number", err);
            } finally {
                setFetching(false);
            }
        };

        fetchNextExtension();
    }, [isEditing, initialExtension, tenantId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedUserId && !isEditing) {
            setError('Please select a user');
            return;
        }

        if (!extension || !secret) {
            setError('Extension and Secret are required');
            return;
        }

        onSubmit({
            monitoringExtension: extension,
            monitoringSecret: secret,
            name,
            userId: selectedUserId
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Monitoring Settings' : 'Enable Monitoring'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Assign a SIP extension and password for checking calls. The user will use these credentials in their softphone.
                </p>

                {error && (
                    <div className="mb-4 bg-red-50 text-red-600 p-2 rounded text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Selection Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                        <select
                            className={`w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary-500 outline-none ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                            value={selectedUserId}
                            onChange={e => {
                                const uid = e.target.value;
                                setSelectedUserId(uid);
                                const selected = userList.find(u => u.id === uid);
                                if (selected && !name) {
                                    setName(selected.name || selected.email);
                                }
                            }}
                            disabled={isEditing}
                            required
                        >
                            <option value="" disabled>Select a user...</option>
                            {userList.map(user => {
                                const tenantName = user.tenant?.name ? ` [${user.tenant.name}]` : '';
                                const role = user.role ? ` (${user.role})` : '';
                                return (
                                    <option key={user.id} value={user.id}>
                                        {user.name || user.email}{role}{tenantName}
                                    </option>
                                );
                            })}
                        </select>
                        {isEditing && <p className="text-xs text-gray-500 mt-1">User cannot be changed once assigned.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Extension</label>
                        <div className="relative">
                            <input
                                type="text"
                                className={`w-full border rounded p-2 pl-9 focus:ring-2 focus:ring-primary-500 outline-none ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                                value={extension}
                                onChange={e => !isEditing && setExtension(e.target.value)}
                                placeholder="e.g. 5001"
                                disabled={isEditing || fetching}
                                required
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <Hash size={16} />
                            </div>
                            {isEditing && (
                                <div className="absolute right-3 top-2.5 text-gray-400" title="Extension number cannot be changed">
                                    <Lock size={16} />
                                </div>
                            )}
                        </div>
                        {isEditing && <p className="text-xs text-gray-500 mt-1">Extension number cannot be changed once assigned.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Name (Caller ID Name)</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SIP Password</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                            value={secret}
                            onChange={e => setSecret(e.target.value)}
                            placeholder="Strong password"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 flex items-center"
                            disabled={loading}
                        >
                            {loading ? (isEditing ? 'Updating...' : 'Enabling...') : (isEditing ? 'Update Settings' : 'Enable Monitoring')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MonitoringExtensionModal;