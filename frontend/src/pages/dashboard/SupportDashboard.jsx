import React, { useState, useEffect } from 'react';
import { LifeBuoy, Users, Server, AlertCircle, Clock, CheckCircle2, Phone, Search, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SupportDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await api.get('/admin/support/stats');
                
                // Map the backend stats to include icons and colors for the UI
                const iconMap = {
                    'Active Tenants': { icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-600/20' },
                    'Total Phone Numbers': { icon: Phone, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-600/20' },
                    'System Status': { icon: Server, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-600/20' },
                    'Platform Role': { icon: LifeBuoy, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-600/20' }
                };

                const mappedStats = response.data.stats.map(s => ({
                    ...s,
                    ...(iconMap[s.label] || iconMap['Platform Role'])
                }));

                setStats(mappedStats);
                setRecentActivity(response.data.recentActivity);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch support stats:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'critical':
            case 'warning': return <AlertCircle className="text-red-500" size={16} />;
            case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
            default: return <Clock className="text-blue-500" size={16} />;
        }
    };

    const quickActions = [
        { name: 'Find Tenant', icon: Search, desc: 'Search by name or ID' },
        { name: 'View Active Calls', icon: Phone, desc: 'Monitor live system traffic' },
        { name: 'System Logs', icon: AlertCircle, desc: 'Check recent error logs' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Synchronizing platform data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8">
            {/* Header section with gradient and branding */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 p-8 shadow-lg ring-1 ring-black/5">
                <div className="absolute -right-32 -top-32 opacity-10">
                    <LifeBuoy size={400} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                                Support Operations
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                            Hi, {user?.name || 'Support Agent'}
                        </h1>
                        <p className="max-w-xl text-primary-100 text-lg">
                            Monitor system health, assist tenants, and resolve technical issues.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-50 p-4 border border-red-200 flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300 group">
                            <dt className="truncate text-sm font-bold uppercase tracking-widest text-gray-500">
                                {stat.label}
                            </dt>
                            <dd className={`mt-2 text-3xl font-extrabold tracking-tight text-gray-900 font-mono ${stat.label === 'System Status' && stat.value === 'Healthy' ? 'text-green-600' : ''}`}>
                                {stat.value}
                            </dd>
                            <div className="absolute right-4 bottom-4 transform transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ${stat.ring} ring-1 ring-inset`}>
                                    <Icon className={stat.color} size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Recent Activity List (Takes up 2/3 of grid) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Recent Platform Activity</h2>
                        <button className="text-sm font-bold text-primary-600 hover:text-primary-700">View all</button>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                        <ul className="divide-y divide-gray-100">
                            {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                <li key={activity.id} className="p-4 hover:bg-gray-50/50 transition-colors sm:p-6 group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 group-hover:ring-gray-300`}>
                                            {getStatusIcon(activity.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {activity.subject}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-gray-700">{activity.tenant}</span>
                                                <span>&bull;</span>
                                                <span>{activity.time}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <ArrowRight size={18} className="text-gray-300 group-hover:text-primary-600 transition-colors" />
                                        </div>
                                    </div>
                                </li>
                            )) : (
                                <li className="p-12 text-center text-gray-500 font-medium">
                                    No recent activity recorded on the platform.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Quick Actions Panel (Takes up 1/3 of grid) */}
                <div className="space-y-4">
                    <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Quick Actions</h2>
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-2">
                        <div className="grid grid-cols-1 gap-2">
                            {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.name}
                                        className="flex items-center gap-4 rounded-xl p-4 text-left hover:bg-gray-50/80 transition-all group focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-inset"
                                    >
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                                {action.name}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {action.desc}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Support Notice */}
                    <div className="rounded-2xl bg-blue-50 p-6 border border-blue-100 shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3 flex-1 md:flex md:justify-between">
                                <p className="text-sm text-blue-700 font-medium leading-relaxed">
                                    You are currently operating in <strong>Platform Support</strong> mode. You have cross-tenant visibility but restricted write access to financial records.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportDashboard;
