import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, User, Phone, CreditCard, Activity, Eye, Server } from 'lucide-react';
import api from '../../services/api';
import './TenantDetailModal.css';

const TenantDetailModal = ({ tenantId, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [tenantId]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/tenants/${tenantId}`);
            setDetails(res.data);
        } catch (error) {
            console.error('Failed to fetch tenant details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!tenantId) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content tenant-detail-modal" onClick={e => e.stopPropagation()}>
                {loading ? (
                    <div className="loading-state">Loading details...</div>
                ) : details ? (
                    <>
                        {/* Header */}
                        <div className="modal-header">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {details.name}
                                    <span className={`status-badge ${details.serviceBlocked ? 'status-suspended' : 'status-active'}`}>
                                        {details.serviceBlocked ? 'Blocked' : 'Active'}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-500 font-mono">ID: {details.id}</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="modal-tabs flex bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60 gap-1 mb-4">
                            <TabButton id="overview" label="Overview" icon={Server} active={activeTab} onClick={setActiveTab} />
                            <TabButton id="users" label="Users" icon={User} active={activeTab} onClick={setActiveTab} />
                            <TabButton id="telecom" label="Telecom" icon={Phone} active={activeTab} onClick={setActiveTab} />
                            <TabButton id="billing" label="Billing" icon={CreditCard} active={activeTab} onClick={setActiveTab} />
                            <TabButton id="activity" label="Activity" icon={Activity} active={activeTab} onClick={setActiveTab} />
                        </div>

                        {/* Content */}
                        <div className="modal-body">
                            {activeTab === 'overview' && <OverviewTab details={details} />}
                            {activeTab === 'users' && <UsersTab details={details} />}
                            {activeTab === 'telecom' && <TelecomTab details={details} />}
                            {activeTab === 'billing' && <BillingTab details={details} />}
                            {activeTab === 'activity' && <ActivityTab details={details} />}
                        </div>
                    </>
                ) : (
                    <div className="error-state">Failed to load tenant details</div>
                )}
            </div>
        </div>
    );
};

const OverviewTab = ({ details }) => (
    <div className="tab-content overview-tab">
        <div className="stats-grid-mini">
            <StatBox label="Users" value={details.stats?.users} color="blue" />
            <StatBox label="Balance" value={`$${Number(details.wallet?.balance || 0).toFixed(2)}`} color={Number(details.wallet?.balance) < 0 ? 'red' : 'green'} />
            <StatBox label="Extensions" value={details.stats?.extensions} color="purple" />
            <StatBox label="DIDs" value={details.stats?.dids} color="orange" />
        </div>



        <div className="info-section">
            <h3 className="section-title">System Info</h3>
            <div className="info-grid">
                <InfoItem label="Created At" value={new Date(details.createdAt).toLocaleString()} />
                <InfoItem label="Updated At" value={new Date(details.updatedAt).toLocaleString()} />
                <InfoItem label="Timezone" value={details.timezone || 'UTC'} />
            </div>
        </div>
    </div>
);

const UsersTab = ({ details }) => {
    const { impersonateUser } = useAuth();
    const navigate = useNavigate();

    const handleImpersonate = async (userId, userName) => {
        if (!window.confirm(`Impersonate ${userName}?`)) return;
        try {
            await impersonateUser(userId);
            navigate('/dashboard');
            window.location.reload();
        } catch (error) {
            alert('Impersonation failed');
        }
    };

    return (
        <div className="tab-content">
            <div className="table-responsive">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-gray-500">
                            <th className="pb-2">Name</th>
                            <th className="pb-2">Email</th>
                            <th className="pb-2">Role</th>
                            <th className="pb-2 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.users && details.users.length > 0 ? (
                            details.users.map(u => (
                                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="py-2 font-medium">{u.name || '-'}</td>
                                    <td className="py-2 text-gray-600">{u.email}</td>
                                    <td className="py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold bg-gray-100`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right">
                                        {u.role !== 'SUPER_ADMIN' && (
                                            <button
                                                onClick={() => handleImpersonate(u.id, u.name || u.email)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 justify-end ml-auto"
                                            >
                                                <Eye size={14} /> Impersonate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="text-center py-4 text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-right">Total Users: {details.stats?.users || details.users?.length}</p>
        </div>
    );
};

const TelecomTab = ({ details }) => (
    <div className="tab-content">
        <div className="stats-grid-mini mb-6">
            <StatBox label="Extensions" value={details.stats?.extensions} color="purple" />
            <StatBox label="Ring Groups" value={details.stats?.ringGroups} color="blue" />
            <StatBox label="IVR Menus" value={details.stats?.ivrs} color="orange" />
            <StatBox label="Schedules" value={details.stats?.schedules} color="indigo" />
        </div>
        <div className="coming-soon">
            <p className="text-sm text-gray-500">Detailed telecom config view coming soon.</p>
        </div>
    </div>
);

const BillingTab = ({ details }) => (
    <div className="tab-content">
        <div className="wallet-card mb-6">
            <h3 className="text-lg font-bold mb-2">Wallet Balance</h3>
            <div className={`text-3xl font-bold ${Number(details.wallet?.balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Number(details.wallet?.balance || 0).toFixed(2)}
            </div>
        </div>
        <div className="coming-soon">
            <p>Transaction history coming soon.</p>
        </div>
    </div>
);

const ActivityTab = ({ details }) => (
    <div className="tab-content">
        <div className="coming-soon">
            <Activity size={48} className="text-gray-300 mb-2" />
            <p>Recent activity logs coming soon.</p>
        </div>
    </div>
);

const TabButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all duration-200 ${
            active === id
                ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10'
                : 'text-slate-500 hover:text-slate-900'
        }`}
    >
        {Icon && <Icon size={16} />}
        {label}
    </button>
);

const StatBox = ({ label, value, color }) => (
    <div className={`stat-box border-${color}-200 bg-${color}-50`}>
        <span className="text-sm text-gray-500">{label}</span>
        <span className={`text-xl font-bold text-${color}-700`}>{value}</span>
    </div>
);

const InfoItem = ({ label, value }) => (
    <div className="info-item">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
    </div>
);

export default TenantDetailModal;
