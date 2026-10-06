import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { telecomService } from '../../services/telecom.service';
import { X, Save, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const RoutingModal = ({ isOpen, onClose, phoneNumber, tfn, onSave }) => {
    const currentNumber = phoneNumber || tfn;
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [options, setOptions] = useState({ extensions: [], ringGroups: [], ivrs: [], schedules: [], didForwards: [] });

    const [routeType, setRouteType] = useState(currentNumber?.routeType || 'extension');
    const [targetId, setTargetId] = useState(currentNumber?.routeTargetId || '');

    useEffect(() => {
        if (isOpen) {
            loadOptions();
            if (currentNumber) {
                setRouteType(currentNumber.routeType === 'forward' ? 'extension' : (currentNumber.routeType || 'extension'));
                setTargetId(currentNumber.routeTargetId || '');
            }
        }
    }, [isOpen, currentNumber]);

    const loadOptions = async () => {
        setLoading(true);
        try {
            const data = await telecomService.getRoutingOptions();
            setOptions(data);
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to load routing options');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentNumber) return;
        setSaving(true);
        try {
            const payload = {
                type: currentNumber.type || 'DID',
                routeType,
                routeDestinationId: targetId,
                forwardEnabled: routeType === 'did_forward',
            };

            await telecomService.updatePhoneNumber(currentNumber.id, payload);
            addToast('success', 'Routing updated');
            onSave({ ...currentNumber, routeType, routeTargetId: targetId });
            onClose();
        } catch (e) {
            console.error(e);
            addToast('error', e.response?.data?.message || 'Failed to update routing');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-900/5">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <Dialog.Title className="text-xl font-extrabold text-gray-900 tracking-tight">
                                Configure Routing: <span className="text-primary-600 font-mono">{currentNumber?.number}</span>
                            </Dialog.Title>
                            {currentNumber?.type && (
                                <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                    currentNumber.type === 'DID'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                    {currentNumber.type === 'DID' ? 'Local Number (DID)' : 'Toll-Free Number (TFN)'}
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg transition-colors focus:outline-none">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Route Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Route Calls To</label>
                                <select
                                    value={routeType}
                                    onChange={(e) => {
                                        setRouteType(e.target.value);
                                        setTargetId('');
                                    }}
                                    className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                                >
                                    <option value="extension">Extension</option>
                                    <option value="ring_group">Ring Group</option>
                                    <option value="ivr">IVR Menu</option>
                                    {currentNumber?.type !== 'DID' && <option value="schedule">Schedule</option>}
                                    {currentNumber?.type !== 'TFN' && <option value="did_forward">External Number (Forward)</option>}
                                </select>
                            </div>

                            {routeType === 'did_forward' ? (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">External Number (Forward)</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                                    >
                                        <option value="">Select external forward...</option>
                                        {options.didForwards && options.didForwards.length > 0 ? (
                                            options.didForwards.map(fwd => (
                                                <option key={fwd.id} value={fwd.id}>
                                                    {fwd.name} ({fwd.destinationNumber})
                                                </option>
                                            ))
                                        ) : (
                                            <option disabled value="">No external forwards configured</option>
                                        )}
                                    </select>
                                    {options.didForwards && options.didForwards.length === 0 && (
                                        <p className="mt-1.5 text-xs font-medium text-amber-600">
                                            No external forwards found. Add one under Telecom → DID Forwards.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Target</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                                    >
                                        <option value="">Select Target...</option>

                                        {routeType === 'extension' && options.extensions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.extensionNumber} - {opt.name}</option>
                                        ))}

                                        {routeType === 'ring_group' && options.ringGroups.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}

                                        {routeType === 'ivr' && options.ivrs.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}

                                        {routeType === 'schedule' && options.schedules.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={onClose}
                                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !targetId}
                                    className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </div>
                    )}
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default RoutingModal;
