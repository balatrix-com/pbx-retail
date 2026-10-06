import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Users, Settings as SettingsIcon, PhoneForwarded, Plus, GripVertical } from 'lucide-react';
import api from '../../../services/api';

// DnD Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableMemberRow({ member, index, strategy, onRemove, onPriorityChange, onPriorityBlur }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: member.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50/80 transition-colors group ${isDragging ? 'shadow-lg bg-white ring-1 ring-primary-100' : ''}`}>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="mr-3 p-1 text-gray-400 hover:text-primary-600 cursor-grab active:cursor-grabbing rounded hover:bg-gray-100 transition-colors"
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-3">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold text-primary-700 bg-primary-50 ring-1 ring-inset ring-primary-100/50 shadow-sm font-mono">
                        {member.extension.extensionNumber}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{member.extension.name}</span>
                </div>
            </td>
            {strategy === 'cascade' && (
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={member.priority ?? ''}
                        onChange={(e) => onPriorityChange(member.id, e.target.value)}
                        onBlur={(e) => onPriorityBlur(member.id, e.target.value)}
                        placeholder="1"
                        className="block w-20 rounded-lg border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 text-center font-bold"
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    type="button"
                    className="text-gray-400 hover:text-red-600 transition-colors p-1.5 opacity-0 group-hover:opacity-100 rounded-md hover:bg-red-50 focus:outline-none"
                    onClick={(e) => { e.preventDefault(); onRemove(member.id); }}
                    title="Remove Member"
                >
                    Remove
                </button>
            </td>
        </tr>
    );
}

function RingGroupForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [extensions, setExtensions] = useState([]);
    const [members, setMembers] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        strategy: 'simultaneous',
        ringTimeout: 3,
        noAnswerAction: '',
        noAnswerDestination: '',
    });

    // Sensors for DnD
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchExtensions();
        if (isEditMode) {
            fetchRingGroup();
        }
    }, [id]);

    const fetchExtensions = async () => {
        try {
            const response = await api.get('/telecom/extensions');
            setExtensions(response.data);
        } catch (err) {
            console.error('Failed to fetch extensions:', err);
        }
    };

    const fetchRingGroup = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/telecom/ring-groups/${id}`);
            setFormData({
                name: response.data.name,
                strategy: response.data.strategy,
                ringTimeout: response.data.ringTimeout,
                noAnswerAction: response.data.noAnswerAction || '',
                noAnswerDestination: response.data.noAnswerDestination || '',
            });
            setMembers(response.data.members || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch ring group:', err);
            setError(err.response?.data?.message || 'Failed to load ring group');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Prepare data payload - ensure numbers are numbers
        const payload = {
            ...formData,
            ringTimeout: parseInt(formData.ringTimeout, 10) || 3
        };

        try {
            if (isEditMode) {
                await api.put(`/telecom/ring-groups/${id}`, payload);
                navigate('/telecom/ring-groups');
            } else {
                // Include members in creation payload
                const createPayload = {
                    ...payload,
                    members: members.map((m, index) => ({
                        extensionId: m.extensionId,
                        priority: m.priority || 1,
                        position: index + 1
                    }))
                };
                await api.post('/telecom/ring-groups', createPayload);
                navigate('/telecom/ring-groups');
            }
        } catch (err) {
            console.error('Failed to save ring group:', err);
            const msg = err.response?.data?.message || 'Failed to save ring group';
            // Handle array of errors (from class-validator) or object error
            setError(Array.isArray(msg) ? msg.join(', ') : (typeof msg === 'object' ? JSON.stringify(msg) : msg));
            setLoading(false);
        }
    };

    const handleAddMember = async (extensionId) => {
        const extension = extensions.find(ext => ext.id === extensionId);
        if (!extension) return;

        if (!isEditMode) {
            // Local state management for new ring group
            const newMember = {
                id: `temp-${Date.now()}`,
                extensionId,
                extension: {
                    id: extensionId,
                    extensionNumber: extension.extensionNumber,
                    name: extension.name
                },
                priority: 1,
                position: members.length + 1
            };
            setMembers([...members, newMember]);
            return;
        }

        try {
            const response = await api.post(`/telecom/ring-groups/${id}/members`, {
                extensionId,
                priority: 1,
                position: members.length + 1,
            });
            setMembers([...members, response.data]);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!isEditMode) {
            setMembers(members.filter(m => m.id !== memberId));
            return;
        }

        try {
            await api.delete(`/telecom/ring-groups/${id}/members/${memberId}`);
            setMembers(members.filter(m => m.id !== memberId));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleLocalPriorityChange = (memberId, value) => {
        setMembers(prevMembers => prevMembers.map(m =>
            m.id === memberId ? { ...m, priority: value } : m
        ));
    };

    const handleSavePriority = async (memberId, value) => {
        let finalPriority = parseInt(value, 10);

        // Handle empty or invalid input by defaulting to 1
        if (isNaN(finalPriority) || finalPriority < 1) finalPriority = 1;
        if (finalPriority > 10) finalPriority = 10;

        if (!isEditMode) {
            setMembers(prevMembers => prevMembers.map(m =>
                m.id === memberId ? { ...m, priority: finalPriority } : m
            ));
            return;
        }

        try {
            await api.put(`/telecom/ring-groups/${id}/members/${memberId}`, {
                priority: finalPriority
            });
            // Update local state to matched sanitized value using functional update
            setMembers(prevMembers => prevMembers.map(m =>
                m.id === memberId ? { ...m, priority: finalPriority } : m
            ));
        } catch (err) {
            console.error('Failed to update member priority:', err);
            alert(err.response?.data?.message || 'Failed to update priority');
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = members.findIndex(m => m.id === active.id);
            const newIndex = members.findIndex(m => m.id === over.id);

            const newMembersOrder = arrayMove(members, oldIndex, newIndex);
            
            // Set local state immediately for smooth UX
            setMembers(newMembersOrder);

            if (isEditMode) {
                try {
                    // Send bulk reorder request to server
                    const orders = newMembersOrder.map((m, index) => ({
                        id: m.id,
                        position: index + 1
                    }));
                    await api.put(`/telecom/ring-groups/${id}/reorder`, { orders });
                } catch (err) {
                    console.error('Failed to save members order:', err);
                    alert('Failed to save members order');
                    // Revert to old state if failed? 
                    // For now, simple fetch or just hope for the best.
                    fetchRingGroup();
                }
            }
        }
    };

    const availableExtensions = extensions.filter(
        ext => !members.some(m => m.extensionId === ext.id)
    );

    if (loading && isEditMode && members.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center space-x-4 mb-2">
                <button
                    onClick={() => navigate('/telecom/ring-groups')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                    aria-label="Back to Ring Groups"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        {isEditMode ? 'Edit Ring Group' : 'Create Ring Group'}
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Configure routing behavior and assignments.</p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <SettingsIcon className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Basic Information</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g. Sales Team"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label htmlFor="ringTimeout" className="block text-sm font-bold text-gray-700 mb-2">
                                    Ring Timeout (seconds)
                                </label>
                                <input
                                    type="number"
                                    id="ringTimeout"
                                    name="ringTimeout"
                                    value={formData.ringTimeout}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="120"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                />
                                <p className="mt-2 text-xs text-gray-500 font-medium">How long to ring before moving to next action.</p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="strategy" className="block text-sm font-bold text-gray-700 mb-2">
                                Ring Strategy <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="strategy"
                                name="strategy"
                                value={formData.strategy}
                                onChange={handleInputChange}
                                required
                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                            >
                                <option value="simultaneous">Simultaneous (Parallel) - Ring all at once</option>
                                <option value="sequential">Sequential (Hunt) - Ring in order</option>
                                <option value="cascade">Cascade (Tiered) - Ring by priority</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500 font-medium">
                                {formData.strategy === 'simultaneous' && 'All extensions ring at the same time (Parallel).'}
                                {formData.strategy === 'sequential' && 'Extensions ring one after another (Hunt Group).'}
                                {formData.strategy === 'cascade' && 'Ring priority 1 first, then priority 2 (Tiered).'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Member Management */}
                {(isEditMode || !loading) && (
                    <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                    Assigned Members
                                </h3>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-200/50 text-gray-700 shadow-sm">
                                {members.length} Total
                            </span>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            {members.length > 0 && (
                                <div className="overflow-x-auto">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50/30">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 w-24">#</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50">Extension</th>
                                                    {formData.strategy === 'cascade' && (
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 w-40">
                                                            Tier / Priority
                                                        </th>
                                                    )}
                                                    <th scope="col" className="relative px-6 py-3 bg-gray-50 w-24">
                                                        <span className="sr-only">Actions</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                <SortableContext
                                                    items={members.map(m => m.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {members.map((member, index) => (
                                                        <SortableMemberRow
                                                            key={member.id}
                                                            member={member}
                                                            index={index}
                                                            strategy={formData.strategy}
                                                            onRemove={handleRemoveMember}
                                                            onPriorityChange={handleLocalPriorityChange}
                                                            onPriorityBlur={handleSavePriority}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </tbody>
                                        </table>
                                    </DndContext>
                                </div>
                            )}

                            {availableExtensions.length > 0 && (
                                <div className="p-6 border-t border-gray-100 bg-gray-50/30">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Add Members</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {availableExtensions.map((ext) => (
                                            <div key={ext.id} className="bg-white p-3 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-primary-300 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer" onClick={(e) => { e.preventDefault(); handleAddMember(ext.id); }}>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 font-mono">{ext.extensionNumber}</div>
                                                    <div className="text-xs font-medium text-gray-500 truncate max-w-[120px]">{ext.name}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="h-8 w-8 rounded-lg bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200 group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600 flex items-center justify-center transition-colors focus:outline-none"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {availableExtensions.length === 0 && members.length > 0 && (
                                <div className="p-6 text-center text-sm font-medium text-gray-500 italic bg-gray-50/30 border-t border-gray-100">
                                    All available extensions have been added.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* No Answer Handling */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <PhoneForwarded className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">No Answer Handling</h3>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">After Timeout</label>
                                <div className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-200 sm:text-sm sm:leading-6 font-medium bg-gray-50/30">
                                    Hangup Call (Final Action)
                                </div>
                            </div>
                            <p className="mt-6 text-xs text-gray-400 font-medium italic">Calls that are not answered within the timeout period will be disconnected.</p>
                        </div>
                        <input type="hidden" name="noAnswerAction" value="" />
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => navigate('/telecom/ring-groups')}
                        className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-8 py-3 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 min-w-[180px]"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {loading ? 'Saving...' : (isEditMode ? 'Update Ring Group' : 'Create Ring Group')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RingGroupForm;
