import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, ArrowRight, CornerDownRight, Settings, PhoneForwarded, Loader2, Play, GitMerge, FileAudio, ArrowLeft, Eye, Edit3 } from 'lucide-react';
import api from '../../../services/api';
import VisualIVRFlow from '../../../components/telecom/VisualIVRFlow';
import InteractiveIVRBuilder from '../../../components/telecom/InteractiveIVRBuilder';

function IVRForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('interactive'); // 'builder' | 'visual' | 'interactive'
    const [interactiveMenuJSON, setInteractiveMenuJSON] = useState({});

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        greetingAudioPath: '',
        timeout: 5000,
        maxFailures: 3,
        menu: {},
    });

    // Local state for editing menu options as an array
    // Structure: [{ id, digit, type, target, children: [], props: {} }]
    const [menuOptions, setMenuOptions] = useState([]);

    // Available Resources for Dropdowns
    const [resources, setResources] = useState({
        extensions: [],
        ringGroups: [],
        ivrs: [],
        audioFiles: [],
        didForwards: []
    });

    // Upload state
    const [uploadName, setUploadName] = useState('');

    useEffect(() => {
        fetchResources();
        if (isEditMode) {
            fetchIVR();
        }
    }, [id]);

    const fetchResources = async () => {
        try {
            const [routingRes, audioRes] = await Promise.all([
                api.get('/telecom/routing-options'),
                api.get('/telecom/audio/list')
            ]);

            setResources({
                extensions: routingRes.data.extensions || [],
                ringGroups: routingRes.data.ringGroups || [],
                ivrs: routingRes.data.ivrs || [],
                audioFiles: audioRes.data.files || [],
                didForwards: routingRes.data.didForwards || []
            });
        } catch (e) {
            console.error('Failed to fetch resources:', e);
        }
    };


    const handleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds maximum limit of 10MB');
            e.target.value = '';
            return;
        }

        // Require name
        const name = uploadName || file.name.split('.')[0];

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', name);

            const res = await api.post('/telecom/audio/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update resources with new file and select it
            setResources(prev => ({
                ...prev,
                audioFiles: [res.data, ...prev.audioFiles]
            }));
            setFormData(prev => ({ ...prev, greetingAudioPath: res.data.storageUrl }));
            setUploadName(''); // Reset name
            alert('Audio uploaded and selected!');
        } catch (err) {
            console.error('Upload failed', err);
            alert('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };



    const fetchIVR = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/telecom/ivrs/${id}`);
            const data = response.data;
            setFormData({
                ...data,
                timeout: data.timeoutMs,
                maxFailures: data.maxAttempts
            });

            if (data.menu) {
                const options = Object.entries(data.menu).map(([digit, action]) => transformBackendToFrontend(digit, action));
                setMenuOptions(options);
            }
        } catch (err) {
            console.error('Failed to fetch IVR:', err);
            setError(err.response?.data?.message || 'Failed to load IVR');
        } finally {
            setLoading(false);
        }
    };

    // Helper: Backend JSON -> Frontend Array
    const transformBackendToFrontend = (digit, action) => {
        const item = {
            id: Math.random().toString(36).substr(2, 9),
            digit,
            type: action.type,
            target: action.target || '',
            props: action.props || {},
            children: []
        };

        if (action.type === 'submenu' && action.children) {
            item.children = Object.entries(action.children).map(([childDigit, childAction]) =>
                transformBackendToFrontend(childDigit, childAction)
            );
        }
        return item;
    };

    // Helper: Frontend Array -> Backend JSON
    const transformFrontendToBackend = (options) => {
        const menuObj = {};
        for (const opt of options) {
            if (!opt.digit) continue;

            const entry = {
                type: opt.type,
                target: opt.target
            };

            if (opt.type === 'submenu') {
                entry.props = opt.props || {};
                entry.children = transformFrontendToBackend(opt.children || []);
                delete entry.target; // Submenus don't have a direct target
            }

            menuObj[opt.digit] = entry;
        }
        return menuObj;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Menu Actions (Recursive) ---

    const updateOption = (options, idToUpdate, field, value) => {
        return options.map(opt => {
            if (opt.id === idToUpdate) {
                const updated = { ...opt, [field]: value };
                // Reset fields if type changes
                if (field === 'type') {
                    if (value === 'submenu') {
                        updated.target = '';
                        updated.children = [];
                        updated.props = {};
                    } else if (['hangup', 'repeat', 'back'].includes(value)) {
                        updated.target = '';
                    }
                }
                return updated;
            }
            if (opt.children && opt.children.length > 0) {
                return { ...opt, children: updateOption(opt.children, idToUpdate, field, value) };
            }
            return opt;
        });
    };

    const removeOption = (options, idToRemove) => {
        return options.filter(opt => opt.id !== idToRemove).map(opt => ({
            ...opt,
            children: opt.children ? removeOption(opt.children, idToRemove) : []
        }));
    };

    const addChildOption = (options, parentId) => {
        return options.map(opt => {
            if (opt.id === parentId) {
                return {
                    ...opt,
                    children: [...(opt.children || []), {
                        id: Math.random().toString(36).substr(2, 9),
                        digit: '',
                        type: 'extension',
                        target: ''
                    }]
                };
            }
            if (opt.children) {
                return { ...opt, children: addChildOption(opt.children, parentId) };
            }
            return opt;
        });
    };

    // --- Wrapper functions for state ---
    const handleAddRootOption = () => {
        setMenuOptions([...menuOptions, {
            id: Math.random().toString(36).substr(2, 9),
            digit: '',
            type: 'extension',
            target: ''
        }]);
    };

    const handleUpdate = (id, field, value) => {
        setMenuOptions(prev => updateOption(prev, id, field, value));
    };

    const handleRemove = (id) => {
        setMenuOptions(prev => removeOption(prev, id));
    };

    const handleAddChild = (parentId) => {
        setMenuOptions(prev => addChildOption(prev, parentId));
    };

    // --- Submit ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation could be added here to check for duplicate keys at same level
        const menuObject = viewMode === 'interactive' ? interactiveMenuJSON : transformFrontendToBackend(menuOptions);

        try {
            const payload = {
                ...formData,
                menu: menuObject,
                timeout: parseInt(formData.timeout, 10) || 5000,
                maxFailures: parseInt(formData.maxFailures, 10) || 3
            };

            if (isEditMode) {
                await api.put(`/telecom/ivrs/${id}`, payload);
            } else {
                await api.post('/telecom/ivrs', payload);
            }
            navigate('/telecom/ivrs');
        } catch (err) {
            console.error('Failed to save IVR:', err);
            const msg = err.response?.data?.message || 'Failed to save IVR';
            setError(Array.isArray(msg) ? msg.join(', ') : (typeof msg === 'object' ? JSON.stringify(msg) : msg));
            setLoading(false);
        }
    };

    // --- Recursive Render Function ---
    const renderMenuOptionRow = (option, depth = 0) => {
        const isSubmenu = option.type === 'submenu';
        
        // Depth-based styles
        const bgColors = [
            'bg-white',
            'bg-gray-50/50',
            'bg-primary-50/20',
            'bg-primary-50/40'
        ];
        const bgColor = bgColors[Math.min(depth, bgColors.length - 1)];
        
        const borderColors = [
            'border-gray-200',
            'border-gray-200',
            'border-primary-100',
            'border-primary-200'
        ];
        const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

        return (
            <div key={option.id} className={`mt-4 ${depth > 0 ? 'ml-6 md:ml-10' : ''} relative`}>
                {/* Visual Connector Line for children */}
                {depth > 0 && (
                    <div className="absolute -left-6 md:-left-8 top-0 bottom-0 w-px bg-gray-400">
                        <div className="absolute top-8 left-0 w-4 md:w-6 h-px bg-gray-400"></div>
                    </div>
                )}

                <div className={`flex flex-col md:flex-row gap-4 items-start md:items-center py-4 ${bgColor} border ${borderColor} rounded-2xl px-5 shadow-sm hover:shadow-md transition-all relative`}>
                    {/* Level Badge */}
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {depth === 0 ? 'Root' : `Level ${depth + 1}`}
                    </div>

                    {/* Digit */}
                    <div className="flex-shrink-0 w-24">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Key</label>
                        <select
                            className="w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-white text-primary-700"
                            value={option.digit}
                            onChange={(e) => handleUpdate(option.id, 'digit', e.target.value)}
                            required
                        >
                            <option value="">-</option>
                            {[...Array(10).keys()].map(d => <option key={d} value={d}>{d}</option>)}
                            <option value="*">*</option>
                            <option value="#">#</option>
                        </select>
                    </div>

                    {/* Action */}
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Action</label>
                        <select
                            className="w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white"
                            value={option.type}
                            onChange={(e) => handleUpdate(option.id, 'type', e.target.value)}
                        >
                            <option value="extension">Connect to Extension</option>
                            <option value="ring_group">Connect to Ring Group</option>
                            {depth === 0 && <option value="submenu">Submenu (Level 2)</option>}
                            <option value="ivr">Go to another IVR</option>
                            <option value="did_forward">Connect to DID Forward</option>
                            <option value="external">Dial External Number</option>
                            <option value="back">Back to Previous Menu</option>
                            <option value="repeat">Repeat Greeting</option>
                            <option value="hangup">Hangup</option>
                        </select>
                    </div>

                    {/* Destination / Submenu Props */}
                    {isSubmenu ? (
                        <div className="flex-[2] w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Submenu Greeting</label>
                            <select
                                className="w-full rounded-xl border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                value={option.props?.greeting || ''}
                                onChange={(e) => {
                                    const newProps = { ...option.props, greeting: e.target.value };
                                    handleUpdate(option.id, 'props', newProps);
                                }}
                            >
                                <option value="">-- Select Audio File --</option>
                                {resources.audioFiles && resources.audioFiles.map(file => (
                                    <option key={file.id} value={file.storageUrl}>
                                        {file.name} ({file.filename})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : !['hangup', 'repeat', 'back'].includes(option.type) && (
                        <div className="flex-[2] w-full md:w-auto">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                Destination <ArrowRight className="w-3.5 h-3.5" />
                            </label>
                            {renderDestinationInput(option)}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="mt-4 md:mt-0 flex items-center gap-2 md:self-end md:mb-1 border-l border-gray-100 pl-4 ml-2">
                        {isSubmenu && (
                            <button
                                type="button"
                                onClick={() => handleAddChild(option.id)}
                                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 ring-1 ring-inset ring-primary-100/50 hover:bg-primary-100 transition-colors focus:outline-none"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleRemove(option.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                            title="Remove Option"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Render Children */}
                {isSubmenu && (
                    <div className="space-y-1">
                        {option.children && option.children.map(child => (
                            renderMenuOptionRow(child, depth + 1)
                        ))}
                        {(!option.children || option.children.length === 0) && (
                            <div className="ml-6 md:ml-10 mt-3 mb-4 flex items-center text-xs font-medium text-gray-400 italic bg-gray-50/50 py-3 px-4 rounded-xl w-fit ring-1 ring-inset ring-gray-100">
                                <CornerDownRight className="w-4 h-4 mr-2" />
                                No options in this submenu. Add one above.
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderDestinationInput = (opt) => {
        const selectClass = "w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer";
        const inputClass = selectClass;

        if (opt.type === 'extension') {
            return (
                <select
                    className={selectClass}
                    value={opt.target}
                    onChange={(e) => handleUpdate(opt.id, 'target', e.target.value)}
                    required
                >
                    <option value="">Select Extension...</option>
                    {resources.extensions.map(ext => (
                        <option key={ext.id} value={ext.extensionNumber}>
                            {ext.extensionNumber} - {ext.name}
                        </option>
                    ))}
                </select>
            );
        } else if (opt.type === 'ring_group') {
            return (
                <select
                    className={selectClass}
                    value={opt.target}
                    onChange={(e) => handleUpdate(opt.id, 'target', e.target.value)}
                    required
                >
                    <option value="">Select Ring Group...</option>
                    {resources.ringGroups.map(rg => (
                        <option key={rg.id} value={rg.id}>
                            {rg.name} (Ext: {rg.extensionNumber})
                        </option>
                    ))}
                </select>
            );
        } else if (opt.type === 'ivr') {
            return (
                <select
                    className={selectClass}
                    value={opt.target}
                    onChange={(e) => handleUpdate(opt.id, 'target', e.target.value)}
                    required
                >
                    <option value="">Select IVR Menu...</option>
                    {resources.ivrs
                        .filter(i => i.id !== id)
                        .map(ivr => (
                            <option key={ivr.id} value={ivr.id}>
                                {ivr.name}
                            </option>
                        ))
                    }
                </select>
            );
        } else if (opt.type === 'did_forward' || opt.type === 'forward') {
            return (
                <select
                    className={selectClass}
                    value={opt.target}
                    onChange={(e) => handleUpdate(opt.id, 'target', e.target.value)}
                    required
                >
                    <option value="">Select DID Forward...</option>
                    {resources.didForwards.map(df => (
                        <option key={df.id} value={df.id}>
                            {df.name} ({df.destinationNumber})
                        </option>
                    ))}
                </select>
            );
        } else {
            return (
                <input
                    type="text"
                    className={inputClass}
                    placeholder={opt.type === 'external' ? '+1234567890' : 'Target'}
                    value={opt.target}
                    onChange={(e) => handleUpdate(opt.id, 'target', e.target.value)}
                    required
                />
            );
        }
    };

    if (loading && isEditMode && !formData.name) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <div className="flex items-center space-x-4 mb-2">
                <button
                    onClick={() => navigate('/telecom/ivrs')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                    aria-label="Back to IVRs"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        {isEditMode ? 'Edit IVR Menu' : 'Create IVR Menu'}
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Design call routing flow and prompts.</p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium shadow-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info Panel */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Configuration</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6">
                            <div className="md:col-span-2">
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
                                    placeholder="e.g. Main Sales Menu"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Timeout (ms)</label>
                                <input
                                    type="number"
                                    name="timeout"
                                    value={formData.timeout}
                                    onChange={handleInputChange}
                                    min="1000"
                                    max="10000"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-mono bg-gray-50/50 hover:bg-white transition-colors"
                                />
                                <p className="mt-2 text-xs text-gray-500 font-medium">Time to wait for caller input (1000-10000ms).</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Max Failures (Retries)</label>
                                <input
                                    type="number"
                                    name="maxFailures"
                                    value={formData.maxFailures}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="5"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-mono bg-gray-50/50 hover:bg-white transition-colors"
                                />
                                <p className="mt-2 text-xs text-gray-500 font-medium">Number of times to replay audio if no valid entry.</p>
                            </div>
                        </div>

                        {/* Audio Section */}
                        <div className="pt-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FileAudio className="w-4 h-4 text-gray-400" />
                                Greeting Audio
                            </label>

                            <select
                                name="greetingAudioPath"
                                value={formData.greetingAudioPath}
                                onChange={handleInputChange}
                                className="block w-full max-w-xl rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                            >
                                <option value="">-- Select from Audio Library --</option>
                                {resources.audioFiles && resources.audioFiles.map(file => (
                                    <option key={file.id} value={file.storageUrl}>
                                        {file.name} ({file.filename})
                                    </option>
                                ))}
                            </select>

                            <div className="mt-4 p-5 bg-gray-50/50 rounded-xl border border-gray-200 ring-1 ring-inset ring-gray-100 max-w-xl">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 block">Quick Upload</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">File Friendly Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. English Welcome Mon-Fri"
                                            className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white"
                                            value={uploadName}
                                            onChange={(e) => setUploadName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Audio File</label>
                                        <input
                                            type="file"
                                            accept=".wav,.mp3"
                                            onChange={handleAudioUpload}
                                            className="block w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer file:transition-colors focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Builder Panel */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <GitMerge className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Routing Schema</h3>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="flex bg-gray-200/50 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('interactive')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'interactive' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Interactive Builder
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('builder')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'builder' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                    Classic Form
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('visual')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    Read-Only Flow
                                </button>
                            </div>

                            {viewMode === 'builder' && (
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-gray-800 transition-colors focus:outline-none"
                                    onClick={handleAddRootOption}
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Root Option
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={`p-6 bg-gray-50/30 ${['visual', 'interactive'].includes(viewMode) ? 'h-[750px] p-2' : ''}`}>
                        {viewMode === 'interactive' ? (
                            <InteractiveIVRBuilder
                                ivrName={formData.name}
                                resources={resources}
                                initialMenu={formData.menu}
                                onChange={setInteractiveMenuJSON}
                            />
                        ) : viewMode === 'visual' ? (
                            <VisualIVRFlow 
                                ivrName={formData.name} 
                                menu={transformFrontendToBackend(menuOptions)} 
                            />
                        ) : (
                            <>
                                {menuOptions.length === 0 ? (
                                    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200">
                                        <GitMerge className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">No Menu Options</h3>
                                        <p className="text-sm text-gray-500 font-medium">Click "Add Root Option" above to start building your IVR tree.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {menuOptions.map((opt) => (
                                            renderMenuOptionRow(opt, 0)
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/telecom/ivrs')}
                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {loading ? 'Saving...' : (isEditMode ? 'Update IVR' : 'Create IVR')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default IVRForm;
