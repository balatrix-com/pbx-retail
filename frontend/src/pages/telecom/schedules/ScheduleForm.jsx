import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Clock, CalendarDays, Route } from 'lucide-react';
import api from '../../../services/api';

const ScheduleForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        timezone: 'America/New_York',
        businessDaysStart: 1, // Monday
        businessDaysEnd: 5,   // Friday
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        primaryRouteType: 'extension',
        primaryRouteTargetId: '',
        afterHoursRouteType: 'ivr',
        afterHoursRouteTargetId: '',
        weekendRouteType: 'ivr',
        weekendRouteTargetId: '',
    });

    const [extensions, setExtensions] = useState([]);
    const [ringGroups, setRingGroups] = useState([]);
    const [ivrs, setIVRs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const timezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
        'Pacific/Honolulu',
        'America/Anchorage',
    ];

    const dayOptions = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' },
    ];

    useEffect(() => {
        loadDropdownData();
        if (isEditMode) {
            loadSchedule();
        }
    }, [id]);

    const loadDropdownData = async () => {
        try {
            const [extRes, rgRes, ivrRes] = await Promise.all([
                api.get('/telecom/extensions').catch(err => {
                    console.error('Failed to load extensions:', err);
                    return { data: [] };
                }),
                api.get('/telecom/ring-groups').catch(err => {
                    console.error('Failed to load ring groups:', err);
                    return { data: [] };
                }),
                api.get('/telecom/ivrs').catch(err => {
                    console.error('Failed to load ivrs:', err);
                    return { data: [] };
                }),
            ]);
            setExtensions(extRes.data || []);
            setRingGroups(rgRes.data || []);
            setIVRs(ivrRes.data || []);
        } catch (err) {
            console.error('Error loading dropdown data:', err);
        }
    };

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/telecom/schedules/${id}`);
            const data = response.data;

            // Map backend fields to form state
            // Parse daysMask (default 31 = Mon-Fri = 1-5)
            let startDay = 1;
            let endDay = 5;

            if (data.daysMask) {
                // Simple heuristic for continuous ranges
                // Bit 0=Mon(1), 1=Tue(2), ... 5=Sat(6), 6=Sun(0)
                const days = [1, 2, 3, 4, 5, 6, 0]; // Visual order for bits 0..6
                let firstBit = -1;
                let lastBit = -1;

                for (let i = 0; i < 7; i++) {
                    if ((data.daysMask & (1 << i)) !== 0) {
                        if (firstBit === -1) firstBit = i;
                        lastBit = i;
                    }
                }

                if (firstBit !== -1) startDay = days[firstBit];
                if (lastBit !== -1) endDay = days[lastBit];
            }

            setFormData({
                ...data,
                businessHoursStart: data.startTime,
                businessHoursEnd: data.endTime,
                businessDaysStart: startDay,
                businessDaysEnd: endDay,
                // Ensure route targets are strings
                primaryRouteTargetId: data.primaryRouteTarget || '',
                afterHoursRouteTargetId: data.afterHoursRouteTarget || '',
                weekendRouteTargetId: data.weekendRouteTarget || '',
            });
        } catch (err) {
            setError('Failed to load schedule');
            console.error('Error loading schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Schedule name is required');
            return;
        }

        if (!formData.primaryRouteTargetId) {
            setError('Primary route destination is required');
            return;
        }

        try {
            setLoading(true);
            if (isEditMode) {
                await api.put(`/telecom/schedules/${id}`, formData);
            } else {
                await api.post('/telecom/schedules', formData);
            }
            navigate('/telecom/schedules');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save schedule');
            console.error('Error saving schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset target ID when route type changes
            ...(name.includes('RouteType') && { [name.replace('Type', 'TargetId')]: '' })
        }));
    };

    const renderDestinationDropdown = (routeType, targetIdField) => {
        let options = [];
        let placeholder = 'Select destination';

        if (routeType === 'extension') {
            options = extensions;
            placeholder = 'Select an extension';
        } else if (routeType === 'ring_group') {
            options = ringGroups;
            placeholder = 'Select a ring group';
        } else if (routeType === 'ivr') {
            options = ivrs;
            placeholder = 'Select an IVR';
        }

        return (
            <select
                name={targetIdField}
                value={formData[targetIdField]}
                onChange={handleInputChange}
                required={targetIdField === 'primaryRouteTargetId'}
                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name || option.extensionNumber || option.id}
                    </option>
                ))}
            </select>
        );
    };

    if (loading && isEditMode) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12 p-6">
            <button
                onClick={() => navigate('/telecom/schedules')}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors focus:outline-none"
            >
                <ArrowLeft size={20} />
                Back to Schedules
            </button>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Schedule' : 'Create Schedule'}</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">Configure time-based routing for different times of day</p>
                </div>

                {error && (
                    <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center text-sm font-medium">
                        {error}
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Basic Info */}
                    <div className="border-b border-gray-100 pb-8 mb-8 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Basic Information
                        </h3>

                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">Schedule Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., Business Hours Schedule"
                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="timezone" className="block text-sm font-bold text-gray-700 mb-2">Timezone <span className="text-red-500">*</span></label>
                            <select
                                id="timezone"
                                name="timezone"
                                value={formData.timezone}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                required
                            >
                                {timezones.map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Business Hours */}
                    <div className="border-b border-gray-100 pb-8 mb-8 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-blue-600" /> Business Hours
                        </h3>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="businessDaysStart" className="block text-sm font-bold text-gray-700 mb-2">Business Days Start <span className="text-red-500">*</span></label>
                                <select
                                    id="businessDaysStart"
                                    name="businessDaysStart"
                                    value={formData.businessDaysStart}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                    required
                                >
                                    {dayOptions.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="businessDaysEnd" className="block text-sm font-bold text-gray-700 mb-2">Business Days End <span className="text-red-500">*</span></label>
                                <select
                                    id="businessDaysEnd"
                                    name="businessDaysEnd"
                                    value={formData.businessDaysEnd}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                    required
                                >
                                    {dayOptions.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="businessHoursStart" className="block text-sm font-bold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                                <input
                                    type="time"
                                    id="businessHoursStart"
                                    name="businessHoursStart"
                                    value={formData.businessHoursStart}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="businessHoursEnd" className="block text-sm font-bold text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                                <input
                                    type="time"
                                    id="businessHoursEnd"
                                    name="businessHoursEnd"
                                    value={formData.businessHoursEnd}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Routing Rules Header */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <Route className="h-5 w-5 text-primary-600" /> Routing Rules
                        </h3>

                        {/* Primary Route */}
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">🌞 Primary Route (Business Hours)</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Active during business days and hours configured above</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="primaryRouteType" className="block text-xs font-bold text-gray-700 mb-1.5">Route Type <span className="text-red-500">*</span></label>
                                    <select
                                        id="primaryRouteType"
                                        name="primaryRouteType"
                                        value={formData.primaryRouteType}
                                        onChange={handleInputChange}
                                        className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-colors"
                                        required
                                    >
                                        <option value="extension">Extension</option>
                                        <option value="ring_group">Ring Group</option>
                                        <option value="ivr">IVR Menu</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="primaryRouteTargetId" className="block text-xs font-bold text-gray-700 mb-1.5">Destination <span className="text-red-500">*</span></label>
                                    {renderDestinationDropdown(formData.primaryRouteType, 'primaryRouteTargetId')}
                                </div>
                            </div>
                        </div>

                        {/* After Hours Route */}
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">🌙 After Hours Route</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Active on business days outside of business hours</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="afterHoursRouteType" className="block text-xs font-bold text-gray-700 mb-1.5">Route Type</label>
                                    <select
                                        id="afterHoursRouteType"
                                        name="afterHoursRouteType"
                                        value={formData.afterHoursRouteType}
                                        onChange={handleInputChange}
                                        className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-colors"
                                    >
                                        <option value="">Use primary route</option>
                                        <option value="extension">Extension</option>
                                        <option value="ring_group">Ring Group</option>
                                        <option value="ivr">IVR Menu</option>
                                    </select>
                                </div>
                                {formData.afterHoursRouteType && (
                                    <div>
                                        <label htmlFor="afterHoursRouteTargetId" className="block text-xs font-bold text-gray-700 mb-1.5">Destination</label>
                                        {renderDestinationDropdown(formData.afterHoursRouteType, 'afterHoursRouteTargetId')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Weekend Route */}
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">📅 Weekend Route</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Active on weekends and non-business days</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="weekendRouteType" className="block text-xs font-bold text-gray-700 mb-1.5">Route Type</label>
                                    <select
                                        id="weekendRouteType"
                                        name="weekendRouteType"
                                        value={formData.weekendRouteType}
                                        onChange={handleInputChange}
                                        className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-colors"
                                    >
                                        <option value="">Use primary route</option>
                                        <option value="extension">Extension</option>
                                        <option value="ring_group">Ring Group</option>
                                        <option value="ivr">IVR Menu</option>
                                    </select>
                                </div>
                                {formData.weekendRouteType && (
                                    <div>
                                        <label htmlFor="weekendRouteTargetId" className="block text-xs font-bold text-gray-700 mb-1.5">Destination</label>
                                        {renderDestinationDropdown(formData.weekendRouteType, 'weekendRouteTargetId')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/telecom/schedules')}
                            disabled={loading}
                            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2" />}
                            {!loading && <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditMode ? 'Update Schedule' : 'Create Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleForm;
