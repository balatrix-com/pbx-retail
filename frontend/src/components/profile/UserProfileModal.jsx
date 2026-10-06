import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
    X,
    Building2,
    User,
    CreditCard,
    Phone,
    Globe,
    MapPin,
    Mail,
    Lock,
    Shield,
    Loader2,
    Eye,
    EyeOff,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import { formatCustomerId } from '../../utils/billing.utils';

const countryOptions = [
    { code: 'USA', label: 'United States (USA)' },
    { code: 'CAD', label: 'Canada (CAD)' },
    { code: 'IND', label: 'India (IND)' },
    { code: 'PAK', label: 'Pakistan (PAK)' },
    { code: 'PHI', label: 'Philippines (PHI)' },
    { code: 'BNG', label: 'Bangladesh (BNG)' },
    { code: 'OTHER', label: 'Other' },
];

const getCountryLabel = (code) => {
    const found = countryOptions.find(c => c.code === code);
    return found ? found.label : code || 'N/A';
};

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Tenant details for ADMIN role
    const [tenantDetails, setTenantDetails] = useState(null);
    const [fetchingTenant, setFetchingTenant] = useState(false);

    const userRole = (user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    const isSupport = userRole === 'SUPPORT';

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
            setError('');
            setSuccess('');
        }
    }, [user, isOpen]);

    // Fetch tenant profile details if user is an ADMIN
    useEffect(() => {
        if (isOpen && isAdmin) {
            const fetchTenantData = async () => {
                setFetchingTenant(true);
                try {
                    const res = await api.get('/tenants/profile/details');
                    setTenantDetails(res.data);
                } catch (err) {
                    console.error('Failed to fetch tenant profile details', err);
                    if (user?.tenantId) {
                        try {
                            const fallbackRes = await api.get(`/tenants/${user.tenantId}`);
                            setTenantDetails(fallbackRes.data);
                        } catch (fbErr) {
                            console.error('Fallback tenant fetch failed', fbErr);
                        }
                    }
                } finally {
                    setFetchingTenant(false);
                }
            };
            fetchTenantData();
        } else if (!isOpen) {
            setTenantDetails(null);
        }
    }, [isOpen, isAdmin, user?.tenantId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validation - change password is not applicable for SUPPORT role
        if (!isSupport && password) {
            if (password.length < 8) {
                setError('Password must be at least 8 characters');
                setLoading(false);
                return;
            }

            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
        }

        try {
            const updateData = { name };
            if (!isSupport && password) {
                updateData.password = password;
            }

            await authService.updateProfile(updateData);
            await refreshUser(); // Update context
            setSuccess('Profile updated successfully');

            // Clear sensitive fields
            setPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            console.error('Update profile failed', err);
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const customerDetails = tenantDetails?.customerDetails || {};
    const effectiveCustomerId = tenantDetails?.customerCode || user?.tenant?.customerCode || tenantDetails?.id || user?.tenantId;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="relative z-50"
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" aria-hidden="true" />

            {/* Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <Dialog.Panel
                    className={`w-full ${
                        isAdmin ? 'max-w-2xl' : 'max-w-md'
                    } rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden transition-all`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/75">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100/60 text-indigo-600">
                                {isAdmin ? <Building2 size={20} /> : <User size={20} />}
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-bold text-gray-900 tracking-tight">
                                    {isAdmin ? 'Admin & Tenant Profile' : 'User Profile'}
                                </Dialog.Title>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                            isAdmin
                                                ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20'
                                                : isSupport
                                                ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                                                : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                        }`}
                                    >
                                        <Shield size={10} className="mr-1" />
                                        {isAdmin ? 'Tenant Administrator' : isSupport ? 'Support Staff' : (user?.role || 'User')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-semibold">
                                {success}
                            </div>
                        )}

                        {/* ADMIN ROLE: SHOW COMPREHENSIVE TENANT DETAILS */}
                        {isAdmin && (
                            <>
                                {fetchingTenant ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                        <p className="text-xs font-medium text-gray-500">Loading tenant details...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. Tenant Type & Company Info Section */}
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                                                <Building2 className="h-4 w-4 text-indigo-600" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                    Tenant & Company Information
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Tenant Type */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Tenant Type
                                                    </label>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset uppercase tracking-wider ${
                                                        customerDetails.customerType === 'individual'
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                    }`}>
                                                        {customerDetails.customerType === 'individual' ? <User size={12} /> : <Building2 size={12} />}
                                                        {customerDetails.customerType === 'individual' ? 'Individual' : 'Company'}
                                                    </span>
                                                </div>

                                                {/* Customer ID / Code */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Customer ID
                                                    </label>
                                                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">
                                                        {effectiveCustomerId ? formatCustomerId(effectiveCustomerId) : 'N/A'}
                                                    </p>
                                                </div>

                                                {/* Company Name (if company) */}
                                                {customerDetails.customerType !== 'individual' && (
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                            Company Name
                                                        </label>
                                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                                            {customerDetails.companyName || tenantDetails?.name || user?.tenant?.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Company Tax ID (if company) */}
                                                {customerDetails.customerType !== 'individual' && (
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                            Company Tax ID
                                                        </label>
                                                        <p className="text-sm font-mono font-medium text-gray-900 mt-1">
                                                            {customerDetails.companyTaxId || <span className="text-gray-400 font-sans italic">Not provided</span>}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Personal & Account Details */}
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                                                <User className="h-4 w-4 text-indigo-600" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                    Personal & Administrator Profile
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* First Name */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        First Name
                                                    </label>
                                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                                        {customerDetails.firstName || (name ? name.split(' ')[0] : 'N/A')}
                                                    </p>
                                                </div>

                                                {/* Last Name */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Last Name
                                                    </label>
                                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                                        {customerDetails.lastName || (name ? name.split(' ').slice(1).join(' ') : 'N/A')}
                                                    </p>
                                                </div>

                                                {/* Email */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Email
                                                    </label>
                                                    <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                                        <Mail size={15} className="text-gray-400" />
                                                        {customerDetails.adminEmail || email}
                                                    </div>
                                                </div>

                                                {/* Display Name (Editable) */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Display Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Billing & Limits Section */}
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                                                <CreditCard className="h-4 w-4 text-indigo-600" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                                    Billing & Limits
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Credit Limit */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Credit Limit
                                                    </label>
                                                    <p className="text-base font-mono font-extrabold text-gray-900 mt-1">
                                                        ${Number(customerDetails.creditLimit !== undefined ? customerDetails.creditLimit : (tenantDetails?.wallet?.creditLimit || 0)).toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Wallet Balance */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Wallet Balance
                                                    </label>
                                                    <div className="flex items-center gap-1.5 mt-1 text-sm font-mono font-bold text-gray-900">
                                                        <Wallet size={15} className="text-gray-400" />
                                                        ${Number(tenantDetails?.wallet?.balance || 0).toFixed(2)} {tenantDetails?.wallet?.currency || 'USD'}
                                                    </div>
                                                </div>

                                                {/* Phone */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Phone
                                                    </label>
                                                    <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                                        <Phone size={15} className="text-gray-400" />
                                                        {customerDetails.phone || <span className="text-gray-400 font-sans italic">Not provided</span>}
                                                    </div>
                                                </div>

                                                {/* Country */}
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Country
                                                    </label>
                                                    <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                                        <Globe size={15} className="text-gray-400" />
                                                        {getCountryLabel(customerDetails.country)}
                                                    </div>
                                                </div>

                                                {/* Address */}
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                        Registered Address
                                                    </label>
                                                    <div className="flex items-start gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                                        <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                                                        <span>
                                                            {[customerDetails.address, customerDetails.city, customerDetails.state].filter(Boolean).join(', ') || <span className="text-gray-400 italic">Not provided</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* NON-ADMIN USERS (SUPPORT, SUPER_ADMIN, AGENT) BASIC INFO */}
                        {!isAdmin && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Email
                                    </label>
                                    <div className="relative rounded-xl shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                            <Mail size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={email}
                                            disabled
                                            className="block w-full pl-10 rounded-xl border border-gray-200 bg-gray-100 py-2.5 text-sm font-medium text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Name
                                    </label>
                                    <div className="relative rounded-xl shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Customer ID
                                    </label>
                                    <input
                                        type="text"
                                        value={user?.tenant?.customerCode ? formatCustomerId(user.tenant.customerCode) : 'N/A'}
                                        disabled
                                        className="block w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm font-mono font-medium text-gray-600 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        )}

                        {/* CHANGE PASSWORD SECTION: OMIT COMPLETELY FOR SUPPORT ROLE */}
                        {!isSupport && (
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                                    <Lock className="h-4 w-4 text-indigo-600" />
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Change Password
                                        </h4>
                                        <p className="text-[11px] font-medium text-gray-400">
                                            Leave fields blank if you do not wish to change your password
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative rounded-xl shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                                <Lock size={15} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Min 8 characters"
                                                className="block w-full pl-9 pr-9 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                            Confirm New Password
                                        </label>
                                        <div className="relative rounded-xl shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                                <Lock size={15} />
                                            </div>
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter password"
                                                className="block w-full pl-9 pr-9 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                            >
                                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default UserProfileModal;
