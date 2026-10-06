import React, { useState } from 'react';
import { X, Building2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api';

const TenantForm = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.adminPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const { confirmPassword, ...data } = formData;
            const res = await api.post('/tenants', data);
            onSuccess(res.data.tenant || res.data);
        } catch (err) {
            console.error('Failed to create tenant', err);
            setError(err.response?.data?.message || 'Failed to create tenant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Create New Tenant</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 animate-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                placeholder="Acme Corp"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Admin User Details</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        required
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                        placeholder="John Doe"
                                        value={formData.adminName}
                                        onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        required
                                        type="email"
                                        name="tenant_form_admin_email"
                                        autoComplete="off"
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                        placeholder="admin@company.com"
                                        value={formData.adminEmail}
                                        onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            name="tenant_form_admin_password"
                                            autoComplete="new-password"
                                            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                            placeholder="••••••••"
                                            value={formData.adminPassword}
                                            onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            required
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="tenant_form_confirm_password"
                                            autoComplete="new-password"
                                            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {loading ? 'Creating...' : 'Create Tenant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TenantForm;
