import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Edit, Trash2, Clock, ShieldAlert, Sun, Moon, Calendar, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

const SchedulesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const schedulerLimit = user?.tenant?.tenantFeatures?.schedulerLimit ?? 10;
    const isLimitReached = schedules.length >= schedulerLimit;

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await api.get('/telecom/schedules');
            setSchedules(response.data);
        } catch (err) {
            setError('Failed to load schedules');
            console.error('Error fetching schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete schedule "${name}"?`)) return;

        try {
            await api.delete(`/telecom/schedules/${id}`);
            setSchedules(schedules.filter(s => s.id !== id));
        } catch (err) {
            setError('Failed to delete schedule');
            console.error('Error deleting schedule:', err);
        }
    };

    const formatTime = (time) => {
        if (!time) return '';
        // Convert 24h to 12h format
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHours = h % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    };

    const formatDays = (mask) => {
        if (!mask) return 'Mon - Fri'; // Default fallback
        // Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const active = [];
        for (let i = 0; i < 7; i++) {
            if ((mask & (1 << i)) !== 0) {
                active.push(days[i]);
            }
        }

        if (active.length === 5 && mask === 31) return 'Mon - Fri';
        if (active.length === 7) return 'Every Day';
        if (active.length === 0) return 'No Days';
        return active.join(', ');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <CalendarClock size={14} className="text-teal-200 animate-pulse" />
                            <span>Business Hours & Time Conditions</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Operational Schedules
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Time-based routing for business hours, holidays, after-hours, and weekend call flows.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchSchedules}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                        <button
                            disabled={isLimitReached}
                            onClick={() => !isLimitReached && navigate('/telecom/schedules/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Create Schedule</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Total Schedules"
                    value={schedules.length}
                    subtitle="Active rules"
                    icon={CalendarClock}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Always Open (24/7)"
                    value={schedules.filter(s => s.startTime === '00:00:00' && s.endTime === '23:59:59').length}
                    subtitle="Round-the-clock"
                    icon={Sun}
                    color="emerald"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Standard Shift"
                    value={schedules.filter(s => s.startTime !== '00:00:00' || s.endTime !== '23:59:59').length}
                    subtitle="Business hours"
                    icon={Clock}
                    color="teal"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Plan Limit"
                    value={schedulerLimit}
                    subtitle="Maximum allowed"
                    icon={ShieldAlert}
                    color="amber"
                    trend={isLimitReached ? "Cap reached" : "Available"}
                    trendUp={!isLimitReached}
                />
            </div>

            {isLimitReached && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300 font-medium shadow-xs flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {schedulerLimit} Operational Schedules. Please contact your super administrator to upgrade your plan.</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl flex justify-between items-center shadow-xs">
                    <span className="font-medium text-sm">{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                </div>
            )}

            {/* Unified search bar / list */}

            {schedules.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c0d12] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 shadow-xs">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <CalendarClock className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No schedules yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 mb-5 font-medium text-sm">Create your first operational schedule for time-based routing</p>
                    <button
                        disabled={isLimitReached}
                        onClick={() => !isLimitReached && navigate('/telecom/schedules/new')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Create Schedule
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {schedules.slice((page - 1) * limit, page * limit).map((schedule) => (
                            <div key={schedule.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-blue-500/30 transition-all flex flex-col justify-between group">
                                <div>
                                    <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <CalendarClock size={16} />
                                            </div>
                                            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[160px]">{schedule.name}</h3>
                                        </div>
                                        <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
                                            {schedule.timezone || 'UTC'}
                                        </span>
                                    </div>

                                    <div className="p-5 flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-blue-500" /> Business Hours
                                            </h4>
                                            <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
                                                <div className="font-bold text-blue-900 dark:text-blue-300 text-sm">{formatDays(schedule.daysMask)}</div>
                                                <div className="text-blue-700 dark:text-blue-400 text-xs font-semibold font-mono mt-0.5">
                                                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Routing Rules</h4>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center p-2 rounded-lg bg-green-50/70 dark:bg-green-950/20 border border-green-100 dark:border-green-800/30">
                                                    <span className="font-bold text-green-800 dark:text-green-300 flex items-center gap-1"><Sun size={13} /> Open Hours</span>
                                                    <span className="font-semibold text-green-700 dark:text-green-400 capitalize">{schedule.primaryRouteType.replace('_', ' ')}</span>
                                                </div>
                                                {schedule.afterHoursRouteType && (
                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Moon size={13} /> After Hours</span>
                                                        <span className="font-semibold text-gray-600 dark:text-gray-400 capitalize">{schedule.afterHoursRouteType.replace('_', ' ')}</span>
                                                    </div>
                                                )}
                                                {schedule.weekendRouteType && (
                                                    <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-50/70 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-800/30">
                                                        <span className="font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1"><Calendar size={13} /> Weekend</span>
                                                        <span className="font-semibold text-yellow-700 dark:text-yellow-400 capitalize">{schedule.weekendRouteType.replace('_', ' ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                    <button
                                        onClick={() => navigate(`/telecom/schedules/${schedule.id}/edit`)}
                                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        <Edit className="h-3.5 w-3.5 text-gray-500" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(schedule.id, schedule.name)}
                                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-[#0e0f17] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <Pagination
                            page={page}
                            limit={limit}
                            total={schedules.length}
                            onPageChange={setPage}
                            onLimitChange={(newLimit) => {
                                setLimit(newLimit);
                                setPage(1);
                            }}
                            itemName="schedules"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulesPage;
