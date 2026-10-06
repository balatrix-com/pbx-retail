import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import api from '../../services/api';
import { getMediaUrl } from '../../utils/media.utils';
import { 
    Palette, 
    Mail, 
    Phone, 
    Save, 
    Info, 
    Layout, 
    Loader2, 
    Settings,
    HelpCircle,
    Upload
} from 'lucide-react';

const BrandingSettingsPage = () => {
    const { isSuperAdmin, refreshUser } = useAuth();
    const { refreshBranding } = useBranding();
    
    // States for current branding settings
    const [currentBranding, setCurrentBranding] = useState({
        name: '',
        domain: '',
        primaryColor: '#3d52a0',
        accentColor: '#ed8f55',
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
    
    // Upload state tracking
    const [uploadingField, setUploadingField] = useState(null); // 'logoMain' | 'logoSidebar' | 'favicon'
    const [previewLogoError, setPreviewLogoError] = useState(false);

    useEffect(() => {
        setPreviewLogoError(false);
    }, [currentBranding.logoSidebar, currentBranding.logoMain]);

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
                    primaryColor: response.data.primaryColor || '#3d52a0',
                    accentColor: response.data.accentColor || '#ed8f55',
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
        e.preventDefault();
        try {
            setSavingCurrent(true);
            await api.put('/admin/branding/current', currentBranding);
            // Refresh branding context & user context instantly to update UI colors & logos dynamically
            await Promise.all([
                refreshBranding(),
                refreshUser ? refreshUser() : Promise.resolve()
            ]);
            alert('Global platform branding updated successfully!');
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

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="px-4 sm:px-0">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                    <Palette className="text-primary-600 h-6 w-6 md:h-8 md:w-8" />
                    Global Platform Branding
                </h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                    Customize the global PBX platform theme colors, name, logos, and support details.
                </p>
            </header>

            {loadingCurrent ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-primary-600 h-8 w-8" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Form */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                            <Settings className="text-slate-400 h-5 w-5" />
                            <h2 className="text-lg font-bold text-gray-900">Customization Fields</h2>
                        </div>

                        <form onSubmit={handleSaveCurrent} className="space-y-6">
                            <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-xl text-primary-800 text-xs font-semibold flex items-center gap-2.5">
                                <Info className="h-4 w-4 text-primary-600 flex-shrink-0" />
                                <span>Configure global platform name, colors, logos, and support information. These settings apply system-wide.</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* App Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Platform Name</label>
                                    <input
                                        type="text"
                                        value={currentBranding.name}
                                        onChange={(e) => setCurrentBranding({...currentBranding, name: e.target.value})}
                                        placeholder="Cloud PBX"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                        required
                                    />
                                </div>

                                {/* Platform Domain */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Platform Domain</label>
                                    <input
                                        type="text"
                                        value={currentBranding.domain}
                                        onChange={(e) => setCurrentBranding({...currentBranding, domain: e.target.value})}
                                        placeholder="https://pbxwl.balatrix.com"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                        required
                                    />
                                </div>

                                {/* Favicon */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Favicon</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentBranding.favicon}
                                            onChange={(e) => setCurrentBranding({...currentBranding, favicon: e.target.value})}
                                            placeholder="/svg logo/favicon.svg"
                                            className="flex-1 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                        />
                                        <label className="relative flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer transition-all">
                                            {uploadingField === 'favicon' ? (
                                                <Loader2 size={16} className="animate-spin text-gray-500" />
                                            ) : (
                                                <Upload size={16} className="text-gray-500" />
                                            )}
                                            <span>Upload</span>
                                            <input
                                                type="file"
                                                accept="image/*,.ico"
                                                onChange={(e) => handleFileUpload(e, 'favicon')}
                                                className="sr-only"
                                                disabled={uploadingField !== null}
                                            />
                                        </label>
                                    </div>
                                    {currentBranding.favicon && (
                                        <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 w-fit">
                                            <img
                                                src={getMediaUrl(currentBranding.favicon)}
                                                alt="Favicon preview"
                                                className="w-4 h-4 object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span className="text-[11px] font-medium text-gray-500">Current Favicon</span>
                                        </div>
                                    )}
                                </div>

                                {/* Logo Main */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Main Logo</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentBranding.logoMain}
                                            onChange={(e) => setCurrentBranding({...currentBranding, logoMain: e.target.value})}
                                            placeholder="/svg logo/logo-main.svg"
                                            className="flex-1 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                        />
                                        <label className="relative flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer transition-all">
                                            {uploadingField === 'logoMain' ? (
                                                <Loader2 size={16} className="animate-spin text-gray-500" />
                                            ) : (
                                                <Upload size={16} className="text-gray-500" />
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
                                        <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 w-fit">
                                            <img
                                                src={getMediaUrl(currentBranding.logoMain)}
                                                alt="Main Logo preview"
                                                className="h-6 max-w-[120px] object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span className="text-[11px] font-medium text-gray-500">Current Main Logo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Logo Sidebar */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sidebar Logo</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentBranding.logoSidebar}
                                            onChange={(e) => setCurrentBranding({...currentBranding, logoSidebar: e.target.value})}
                                            placeholder="/svg logo/logo-main.svg"
                                            className="flex-1 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                        />
                                        <label className="relative flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer transition-all">
                                            {uploadingField === 'logoSidebar' ? (
                                                <Loader2 size={16} className="animate-spin text-gray-500" />
                                            ) : (
                                                <Upload size={16} className="text-gray-500" />
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
                                        <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 w-fit">
                                            <img
                                                src={getMediaUrl(currentBranding.logoSidebar)}
                                                alt="Sidebar Logo preview"
                                                className="h-6 max-w-[120px] object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span className="text-[11px] font-medium text-gray-500">Current Sidebar Logo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Primary Color */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Primary Brand Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={currentBranding.primaryColor}
                                            onChange={(e) => setCurrentBranding({...currentBranding, primaryColor: e.target.value})}
                                            className="h-10 w-10 border border-gray-200 rounded-xl cursor-pointer p-0.5"
                                        />
                                        <input
                                            type="text"
                                            value={currentBranding.primaryColor}
                                            onChange={(e) => setCurrentBranding({...currentBranding, primaryColor: e.target.value})}
                                            className="flex-1 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50 uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>

                                {/* Accent Color */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Accent Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={currentBranding.accentColor}
                                            onChange={(e) => setCurrentBranding({...currentBranding, accentColor: e.target.value})}
                                            className="h-10 w-10 border border-gray-200 rounded-xl cursor-pointer p-0.5"
                                        />
                                        <input
                                            type="text"
                                            value={currentBranding.accentColor}
                                            onChange={(e) => setCurrentBranding({...currentBranding, accentColor: e.target.value})}
                                            className="flex-1 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50 uppercase"
                                            maxLength={7}
                                        />
                                    </div>
                                </div>

                                {/* Support Email */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Mail size={14} className="text-gray-400" />
                                        Support Email
                                    </label>
                                    <input
                                        type="email"
                                        value={currentBranding.supportEmail}
                                        onChange={(e) => setCurrentBranding({...currentBranding, supportEmail: e.target.value})}
                                        placeholder="support@domain.com"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* Support Phone */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Phone size={14} className="text-gray-400" />
                                        Support Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={currentBranding.supportPhone}
                                        onChange={(e) => setCurrentBranding({...currentBranding, supportPhone: e.target.value})}
                                        placeholder="+1-800-555-0199"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>
                            </div>

                            {/* SMTP Mail Configuration Section */}
                            <div className="flex items-center gap-2 border-t border-b border-gray-100 pt-6 pb-4 mt-8">
                                <Mail className="text-slate-400 h-5 w-5" />
                                <h2 className="text-lg font-bold text-gray-900">SMTP Mail Server Settings</h2>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-2.5">
                                <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                <span>Configuring SMTP settings allows the platform to send custom email notifications (such as welcome, forgot password, and invitations) using your own mail server. If left blank, the system falls back to default ZeptoMail credentials.</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SMTP Host */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">SMTP Host</label>
                                    <input
                                        type="text"
                                        value={currentBranding.smtpHost}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpHost: e.target.value})}
                                        placeholder="smtp.mailtrap.io"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* SMTP Port */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">SMTP Port</label>
                                    <input
                                        type="text"
                                        value={currentBranding.smtpPort}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpPort: e.target.value})}
                                        placeholder="587"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* SMTP Username */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">SMTP Username</label>
                                    <input
                                        type="text"
                                        value={currentBranding.smtpUser}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpUser: e.target.value})}
                                        placeholder="smtp-username"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* SMTP Password */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">SMTP Password</label>
                                    <input
                                        type="password"
                                        value={currentBranding.smtpPass}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpPass: e.target.value})}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* Sender Display Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sender Display Name</label>
                                    <input
                                        type="text"
                                        value={currentBranding.smtpFromName}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpFromName: e.target.value})}
                                        placeholder="Cloud PBX Portal"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* Sender Email Address */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sender Email Address</label>
                                    <input
                                        type="email"
                                        value={currentBranding.smtpFromEmail}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpFromEmail: e.target.value})}
                                        placeholder="no-reply@telecom-platform.com"
                                        className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-medium bg-gray-50/50"
                                    />
                                </div>

                                {/* SMTP Secure Connection SSL/TLS */}
                                <div className="space-y-2 md:col-span-2 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="smtpSecure"
                                        checked={currentBranding.smtpSecure}
                                        onChange={(e) => setCurrentBranding({...currentBranding, smtpSecure: e.target.checked})}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                    />
                                    <label htmlFor="smtpSecure" className="text-sm font-bold text-gray-700 cursor-pointer">Use Secure Connection (SSL/TLS - Check this for Port 465)</label>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={savingCurrent}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50"
                                >
                                    {savingCurrent ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Branding
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Brand Preview Box */}
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                            <Layout className="text-slate-400 h-5 w-5" />
                            <h2 className="text-lg font-bold text-gray-900">Live Preview</h2>
                        </div>

                        <p className="text-xs font-medium text-gray-400">
                            See how your customization fields look rendered in the sidebar layout:
                        </p>

                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-slate-100 p-4">
                            {/* Simulated Sidebar Sidebar Header */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <div className="h-8 w-28 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 rounded overflow-hidden p-1 border">
                                        {(currentBranding.logoSidebar || currentBranding.logoMain) && !previewLogoError ? (
                                            <img 
                                                src={getMediaUrl(currentBranding.logoSidebar || currentBranding.logoMain)} 
                                                alt="Brand Logo" 
                                                className="h-full w-full object-contain"
                                                onError={() => setPreviewLogoError(true)}
                                            />
                                        ) : (
                                            <span className="truncate px-1">{currentBranding.name || 'Cloud PBX'}</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-extrabold">PREVIEW</span>
                                </div>

                                {/* Simulated Navigation Links */}
                                <div className="space-y-2">
                                    <div 
                                        className="rounded-lg p-2 flex items-center text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: currentBranding.primaryColor }}
                                    >
                                        <div className="h-4 w-4 rounded-md bg-white/20 mr-2" />
                                        Active Page
                                    </div>
                                    <div className="rounded-lg p-2 flex items-center text-xs font-bold text-gray-400 hover:bg-gray-50">
                                        <div className="h-4 w-4 rounded-md bg-gray-200 mr-2" style={{ backgroundColor: currentBranding.accentColor + '33' }} />
                                        Dashboard
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Help Desk info */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 space-y-2">
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <HelpCircle size={15} className="text-slate-400" />
                                Support Settings Preview
                            </div>
                            <p>Email: <span className="font-bold text-slate-700">{currentBranding.supportEmail || 'support@telecom-platform.com'}</span></p>
                            <p>Phone: <span className="font-bold text-slate-700">{currentBranding.supportPhone || '+1-800-555-0199'}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandingSettingsPage;
