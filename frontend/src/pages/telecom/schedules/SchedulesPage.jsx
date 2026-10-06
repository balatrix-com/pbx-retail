import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Edit, Trash2, Clock, ShieldAlert } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const SchedulesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Operational Schedules</h1>
                    <p className="text-gray-500 mt-1 font-medium">Time-based routing for business hours, after-hours, and weekends</p>
                </div>
                <button
                    disabled={isLimitReached}
                    onClick={() => !isLimitReached && navigate('/telecom/schedules/new')}
                    className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all focus:outline-none ${
                        isLimitReached
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                    }`}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schedule
                </button>
            </div>

            {isLimitReached && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium shadow-sm flex items-center gap-2">
                    <ShieldAlert className="h-5.5 w-5.5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {schedulerLimit} Operational Schedules. Please contact your super administrator to upgrade your plan.</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center">
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                </div>
            )}

            {schedules.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                    <CalendarClock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No schedules yet</h3>
                    <p className="text-gray-500 mt-1 mb-6 font-medium">Create your first operational schedule for time-based routing</p>
                    <button
                        disabled={isLimitReached}
                        onClick={() => !isLimitReached && navigate('/telecom/schedules/new')}
                        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all focus:outline-none ${
                            isLimitReached
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                        }`}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Schedule
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold tracking-tight text-gray-900">{schedule.name}</h3>
                                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                    {schedule.timezone || 'UTC'}
                                </span>
                            </div>

                            <div className="px-6 py-5 flex-1 space-y-6">
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Business Hours
                                    </h4>
                                    <div className="bg-blue-50/50 rounded-lg p-3 ring-1 ring-inset ring-blue-100">
                                        <div className="font-bold text-blue-900 text-sm">{formatDays(schedule.daysMask)}</div>
                                        <div className="text-blue-700 text-sm font-medium mt-0.5">
                                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">Routing Rules</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center p-2 rounded bg-green-50 ring-1 ring-inset ring-green-100">
                                            <span className="font-bold text-green-800">Primary</span>
                                            <span className="font-medium text-green-700 capitalize">{schedule.primaryRouteType.replace('_', ' ')}</span>
                                        </div>
                                        {schedule.afterHoursRouteType && (
                                            <div className="flex justify-between items-center p-2 rounded bg-gray-50 ring-1 ring-inset ring-gray-200">
                                                <span className="font-bold text-gray-700">After Hours</span>
                                                <span className="font-medium text-gray-600 capitalize">{schedule.afterHoursRouteType.replace('_', ' ')}</span>
                                            </div>
                                        )}
                                        {schedule.weekendRouteType && (
                                            <div className="flex justify-between items-center p-2 rounded bg-yellow-50 ring-1 ring-inset ring-yellow-100">
                                                <span className="font-bold text-yellow-800">Weekend</span>
                                                <span className="font-medium text-yellow-700 capitalize">{schedule.weekendRouteType.replace('_', ' ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 mt-auto">
                                <button
                                    onClick={() => navigate(`/telecom/schedules/${schedule.id}/edit`)}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none"
                                >
                                    <Edit className="h-4 w-4 text-gray-500" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(schedule.id, schedule.name)}
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

export default SchedulesPage;
