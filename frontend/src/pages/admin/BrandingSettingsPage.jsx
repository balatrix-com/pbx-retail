import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import api from '../../services/api';
import { getMediaUrl } from '../../utils/media.utils';
import { 
    Mail, 
    Phone, 
    Save, 
    Info, 
    Layout, 
    Loader2, 
    Settings,
    HelpCircle,
    Upload,
    Globe,
    Server,
    ShieldCheck,
    CheckCircle2,
    Sparkles,
    Layers,
    Sliders
} from 'lucide-react';

const BrandingSettingsPage = () => {
    const { isSuperAdmin, refreshUser } = useAuth();
    const { refreshBranding } = useBranding();
    
    // Active configuration tab
    const [activeTab, setActiveTab] = useState('brand'); // 'brand' | 'colors' | 'smtp' | 'support'

    // States for current branding settings
    const [currentBranding, setCurrentBranding] = useState({
        name: '',
        domain: '',
        logoMain: '',
        logoSidebar: '',
        favicon: '',
        supportEmail: '',
        supportPhone: '',
        smtpHost: '',
        smtpPort: '',
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        smtpFromName: '',
        smtpFromEmail: '',
    });
    const [loadingCurrent, setLoadingCurrent] = useState(true);
    const [savingCurrent, setSavingCurrent] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Upload state tracking
    const [uploadingField, setUploadingField] = useState(null); // 'logoMain' | 'logoSidebar' | 'favicon'

    useEffect(() => {
        if (isSuperAdmin) {
            fetchCurrentBranding();
        }
    }, [isSuperAdmin]);

    const fetchCurrentBranding = async () => {
        try {
            setLoadingCurrent(true);
            const response = await api.get('/admin/branding/current');
            if (response.data) {
                setCurrentBranding({
                    name: response.data.name || '',
                    domain: response.data.domain || '',
                    logoMain: response.data.logoMain || '',
                    logoSidebar: response.data.logoSidebar || '',
                    favicon: response.data.favicon || '',
                    supportEmail: response.data.supportEmail || '',
                    supportPhone: response.data.supportPhone || '',
                    smtpHost: response.data.smtpHost || '',
                    smtpPort: response.data.smtpPort !== null ? String(response.data.smtpPort) : '',
                    smtpSecure: response.data.smtpSecure || false,
                    smtpUser: response.data.smtpUser || '',
                    smtpPass: response.data.smtpPass || '',
                    smtpFromName: response.data.smtpFromName || '',
                    smtpFromEmail: response.data.smtpFromEmail || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch global branding:', error);
        } finally {
            setLoadingCurrent(false);
        }
    };

    const handleFileUpload = async (e, fieldKey) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds the 5MB limit.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploadingField(fieldKey);
            const response = await api.post('/admin/branding/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.url) {
                setCurrentBranding(prev => ({
                    ...prev,
                    [fieldKey]: response.data.url
                }));
            }
        } catch (err) {
            console.error('File upload failed:', err);
            alert('File upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploadingField(null);
        }
    };

    const handleSaveCurrent = async (e) => {
        if (e) e.preventDefault();
        try {
            setSavingCurrent(true);
            setSaveSuccess(false);

            await api.put('/admin/branding/current', currentBranding);
            // Refresh branding context & user context to update logos & settings
            await Promise.all([
                refreshBranding(),
                refreshUser ? refreshUser() : Promise.resolve()
            ]);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (error) {
            console.error('Failed to save branding:', error);
            alert('Failed to save branding: ' + (error.response?.data?.message || error.message));
        } finally {
            setSavingCurrent(false);
        }
    };

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
    }

    const tabs = [
        { id: 'brand', label: 'Platform & Assets', icon: Layers, desc: 'Name, Domain, Logos' },
        { id: 'smtp', label: 'SMTP Mail Server', icon: Server, desc: 'Email delivery settings' },
        { id: 'support', label: 'Support & Helpdesk', icon: HelpCircle, desc: 'Contact details' },
    ];

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Top Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 sm:p-10 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 -mb-12 w-64 h-64 rounded-full bg-teal-300/10 blur-xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Sparkles size={14} className="text-teal-200" />
                            <span>System Settings & Configuration</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                            Platform Customization & Branding
                        </h1>
                        <p className="text-teal-100 text-sm sm:text-base font-medium leading-relaxed">
                            Configure unified visual identity, custom domain paths, and outbound SMTP transactional mail routing across the platform.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSaveCurrent}
                            disabled={savingCurrent || loadingCurrent}
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-teal-800 font-bold text-sm shadow-lg shadow-black/10 hover:bg-teal-50 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {savingCurrent ? (
                                <Loader2 size={18} className="animate-spin text-teal-700" />
                            ) : saveSuccess ? (
                                <CheckCircle2 size={18} className="text-emerald-600" />
                            ) : (
                                <Save size={18} className="text-teal-700" />
                            )}
                            <span>{savingCurrent ? 'Saving Changes...' : saveSuccess ? 'Saved Successfully!' : 'Save System Settings'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {loadingCurrent ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <Loader2 className="animate-spin text-teal-600 h-10 w-10" />
                    <span className="text-sm font-semibold text-slate-500">Loading platform settings...</span>
                </div>
            ) : (
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Form with Segmented Tabs */}
                    <div className="space-y-6">
                        {/* Segmented Navigation Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all relative ${
                                            isActive
                                                ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-teal-50/60 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={16} className={isActive ? 'text-white' : 'text-teal-600 dark:text-teal-400'} />
                                            <span className="text-xs font-bold leading-none">{tab.label}</span>
                                        </div>
                                        <span className={`text-[10px] hidden sm:block ${isActive ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {tab.desc}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Settings Form Container */}
                        <form onSubmit={handleSaveCurrent} className="space-y-6">
                            {/* TAB 1: Platform & Assets */}
                            {activeTab === 'brand' && (
                                <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-6 backdrop-blur-sm animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-teal-100 dark:border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 flex items-center justify-center text-teal-700 dark:text-teal-400">
                                                <Layers className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-800 dark:text-white">Platform Identity & Brand Assets</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Configure global platform title, custom hostname, and logo images</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/40 rounded-2xl text-teal-900 dark:text-teal-200 text-xs font-medium flex items-center gap-3">
                                        <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                        <span>These assets are displayed across the top navigation bar, browser tab title, login screens, and system emails.</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Platform Name */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sliders size={13} className="text-teal-600" />
                                                Platform Name
                                            </label>
                                            <input
                                                type="text"
                                                value={currentBranding.name}
                                                onChange={(e) => setCurrentBranding({...currentBranding, name: e.target.value})}
                                                placeholder="Balatrix Cloud PBX"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-4 py-2.5 transition-all"
                                                required
                                            />
                                        </div>

                                        {/* Platform Domain */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Globe size={13} className="text-teal-600" />
                                                Platform Domain
                                            </label>
                                            <input
                                                type="text"
                                                value={currentBranding.domain}
                                                onChange={(e) => setCurrentBranding({...currentBranding, domain: e.target.value})}
                                                placeholder="https://pbxwl.balatrix.com"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-4 py-2.5 transition-all"
                                                required
                                            />
                                        </div>

                                        {/* Favicon */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Browser Favicon</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={currentBranding.favicon}
                                                    onChange={(e) => setCurrentBranding({...currentBranding, favicon: e.target.value})}
                                                    placeholder="/svg logo/favicon.svg"
                                                    className="flex-1 rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2 transition-all"
                                                />
                                                <label className="relative flex items-center justify-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-200 shadow-sm hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                                                    {uploadingField === 'favicon' ? (
                                                        <Loader2 size={15} className="animate-spin text-teal-600" />
                                                    ) : (
                                                        <Upload size={15} className="text-teal-600" />
                                                    )}
                                                    <span>Upload</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.ico,.svg"
                                                        onChange={(e) => handleFileUpload(e, 'favicon')}
                                                        className="sr-only"
                                                        disabled={uploadingField !== null}
                                                    />
                                                </label>
                                            </div>
                                            {currentBranding.favicon && (
                                                <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-teal-50/60 dark:bg-slate-800/60 rounded-xl border border-teal-200/60 dark:border-white/10 w-fit">
                                                    <img
                                                        src={getMediaUrl(currentBranding.favicon)}
                                                        alt="Favicon preview"
                                                        className="w-4 h-4 object-contain"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">Active Favicon</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Main Logo */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Main Header Logo</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={currentBranding.logoMain}
                                                    onChange={(e) => setCurrentBranding({...currentBranding, logoMain: e.target.value})}
                                                    placeholder="/svg logo/logo-main.svg"
                                                    className="flex-1 rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2 transition-all"
                                                />
                                                <label className="relative flex items-center justify-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-200 shadow-sm hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                                                    {uploadingField === 'logoMain' ? (
                                                        <Loader2 size={15} className="animate-spin text-teal-600" />
                                                    ) : (
                                                        <Upload size={15} className="text-teal-600" />
                                                    )}
                                                    <span>Upload</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.svg"
                                                        onChange={(e) => handleFileUpload(e, 'logoMain')}
                                                        className="sr-only"
                                                        disabled={uploadingField !== null}
                                                    />
                                                </label>
                                            </div>
                                            {currentBranding.logoMain && (
                                                <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-teal-50/60 dark:bg-slate-800/60 rounded-xl border border-teal-200/60 dark:border-white/10 w-fit">
                                                    <img
                                                        src={getMediaUrl(currentBranding.logoMain)}
                                                        alt="Main Logo preview"
                                                        className="h-6 max-w-[120px] object-contain"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">Active Logo</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sidebar / Compact Logo */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Secondary / Sidebar Logo</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={currentBranding.logoSidebar}
                                                    onChange={(e) => setCurrentBranding({...currentBranding, logoSidebar: e.target.value})}
                                                    placeholder="/svg logo/logo-main.svg"
                                                    className="flex-1 rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2 transition-all"
                                                />
                                                <label className="relative flex items-center justify-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-teal-800 dark:text-teal-200 shadow-sm hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                                                    {uploadingField === 'logoSidebar' ? (
                                                        <Loader2 size={15} className="animate-spin text-teal-600" />
                                                    ) : (
                                                        <Upload size={15} className="text-teal-600" />
                                                    )}
                                                    <span>Upload</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.svg"
                                                        onChange={(e) => handleFileUpload(e, 'logoSidebar')}
                                                        className="sr-only"
                                                        disabled={uploadingField !== null}
                                                    />
                                                </label>
                                            </div>
                                            {currentBranding.logoSidebar && (
                                                <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-teal-50/60 dark:bg-slate-800/60 rounded-xl border border-teal-200/60 dark:border-white/10 w-fit">
                                                    <img
                                                        src={getMediaUrl(currentBranding.logoSidebar)}
                                                        alt="Sidebar Logo preview"
                                                        className="h-6 max-w-[120px] object-contain"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">Active Sidebar Logo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: SMTP Mail Server */}
                            {activeTab === 'smtp' && (
                                <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-6 backdrop-blur-sm animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-teal-100 dark:border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 flex items-center justify-center text-teal-700 dark:text-teal-400">
                                                <Server className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-800 dark:text-white">Outbound SMTP Mail Routing</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Send password resets, verification links, and alerts through your mail host</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/40 rounded-2xl text-teal-900 dark:text-teal-200 text-xs font-medium flex items-center gap-3">
                                        <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                        <span>If left unconfigured, the system safely falls back to default transactional infrastructure.</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* SMTP Host */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SMTP Host</label>
                                            <input
                                                type="text"
                                                value={currentBranding.smtpHost}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpHost: e.target.value})}
                                                placeholder="smtp.mailtrap.io"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* SMTP Port */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SMTP Port</label>
                                            <input
                                                type="text"
                                                value={currentBranding.smtpPort}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpPort: e.target.value})}
                                                placeholder="587 or 465"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* SMTP Username */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SMTP Username</label>
                                            <input
                                                type="text"
                                                value={currentBranding.smtpUser}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpUser: e.target.value})}
                                                placeholder="smtp-username"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* SMTP Password */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SMTP Password</label>
                                            <input
                                                type="password"
                                                value={currentBranding.smtpPass}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpPass: e.target.value})}
                                                placeholder="••••••••••••"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* Sender Display Name */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sender Display Name</label>
                                            <input
                                                type="text"
                                                value={currentBranding.smtpFromName}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpFromName: e.target.value})}
                                                placeholder="Balatrix Notifications"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* Sender Email Address */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sender Email Address</label>
                                            <input
                                                type="email"
                                                value={currentBranding.smtpFromEmail}
                                                onChange={(e) => setCurrentBranding({...currentBranding, smtpFromEmail: e.target.value})}
                                                placeholder="notifications@balatrix.com"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-3 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* SSL / TLS Toggle */}
                                        <div className="md:col-span-2 pt-2">
                                            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50/50 dark:bg-slate-800/50 border border-teal-200/70 dark:border-white/10 cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-800 transition-all">
                                                <input
                                                    type="checkbox"
                                                    id="smtpSecure"
                                                    checked={currentBranding.smtpSecure}
                                                    onChange={(e) => setCurrentBranding({...currentBranding, smtpSecure: e.target.checked})}
                                                    className="rounded-lg border-teal-300 text-teal-600 focus:ring-teal-500 h-5 w-5"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Use Secure Connection (SSL/TLS)</span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Required when connecting via port 465 or direct SSL sockets</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: Support & Helpdesk */}
                            {activeTab === 'support' && (
                                <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-6 backdrop-blur-sm animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-teal-100 dark:border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 flex items-center justify-center text-teal-700 dark:text-teal-400">
                                                <HelpCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-800 dark:text-white">Customer Support & Helpdesk</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Contact information visible in user help dialogs and support footers</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Support Email */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Mail size={14} className="text-teal-600" />
                                                Support Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={currentBranding.supportEmail}
                                                onChange={(e) => setCurrentBranding({...currentBranding, supportEmail: e.target.value})}
                                                placeholder="support@balatrix.com"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-4 py-2.5 transition-all"
                                            />
                                        </div>

                                        {/* Support Phone */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Phone size={14} className="text-teal-600" />
                                                Support Telephone Hotline
                                            </label>
                                            <input
                                                type="text"
                                                value={currentBranding.supportPhone}
                                                onChange={(e) => setCurrentBranding({...currentBranding, supportPhone: e.target.value})}
                                                placeholder="+1 (800) 555-0199"
                                                className="w-full rounded-xl border border-teal-200/80 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white px-4 py-2.5 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bottom Action Footer */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-teal-200/70 dark:border-white/10">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <CheckCircle2 size={16} className="text-teal-600" />
                                    <span>Changes apply instantaneously to all connected tenant portals upon saving.</span>
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingCurrent}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-teal-600/20 hover:from-teal-700 hover:to-teal-600 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {savingCurrent ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandingSettingsPage;
