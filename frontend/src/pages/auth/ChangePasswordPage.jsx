import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import { Loader2, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const ChangePasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordChanged, setPasswordChanged] = useState(false);
    
    const { refreshUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            await authService.updateProfile({ password });
            setPasswordChanged(true);
            
            // Wait a bit then refresh user and check for onboarding needs
            setTimeout(async () => {
                const userData = await refreshUser();
                
                // If Admin, check if TFN selection is needed
                if (userData?.role === 'ADMIN') {
                    try {
                        const statusRes = await api.get('/onboarding/auth/status');
                        if (statusRes.data.needsTfn) {
                            navigate('/onboarding/select-tfn', { replace: true });
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to check onboarding status', e);
                    }
                }
                
                navigate('/dashboard', { replace: true });
            }, 2000);
            
        } catch (err) {
            let errorMsg = 'Failed to update password';
            if (err.response?.data?.message) {
                errorMsg = Array.isArray(err.response.data.message) 
                    ? err.response.data.message[0] 
                    : err.response.data.message;
            }
            setError(errorMsg);
            setIsSubmitting(false);
        }
    };

    if (passwordChanged) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
                    <p className="text-slate-600 mb-8">Your security is our priority. You are being redirected to your dashboard...</p>
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50/50 font-sans">
            {/* Left Panel - Security Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 overflow-hidden isolate justify-center items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-800 to-indigo-900 opacity-90 mix-blend-multiply" />
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500 blur-3xl opacity-30 animate-pulse" />
                
                <div className="relative z-10 p-12 max-w-lg text-white text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl mb-8 ring-1 ring-white/20">
                        <ShieldCheck className="w-10 h-10 text-primary-300" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-6">Security First.</h1>
                    <p className="text-lg text-primary-100 font-medium mb-8 leading-relaxed">
                        To protect your account and infrastructure, we require a password update upon first login.
                    </p>
                    <div className="space-y-4 text-left max-w-xs mx-auto">
                        <div className="flex items-center space-x-3 text-primary-200">
                            <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center ring-1 ring-primary-400">
                                <div className="w-2 h-2 rounded-full bg-primary-400" />
                            </div>
                            <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center space-x-3 text-primary-200">
                            <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center ring-1 ring-primary-400">
                                <div className="w-2 h-2 rounded-full bg-primary-400" />
                            </div>
                            <span>Strong & unique</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white lg:bg-transparent">
                <div className="max-w-md w-full space-y-8 bg-white p-8 lg:p-12 lg:shadow-2xl lg:rounded-3xl border border-gray-100">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Update Password</h2>
                        <p className="mt-2 text-slate-500 font-medium">Please choose a new secure password for your account.</p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium animate-in slide-in-from-top-2 duration-200">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-600 text-slate-400">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-600 text-slate-400">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="block w-full pl-11 pr-3.5 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                                        placeholder="Repeat your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            ) : (
                                <>
                                    Secure My Account
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={logout}
                                className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
