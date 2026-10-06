import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { Loader2, Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { getMediaUrl } from '../../utils/media.utils';

const LoginPage = () => {
    const { branding } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            let errorMsg = 'Failed to login';
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data.message === 'string') errorMsg = data.message;
                else if (Array.isArray(data.message)) errorMsg = data.message.join(', ');
                else if (typeof data === 'string') errorMsg = data;
                else if (typeof data.error === 'string') errorMsg = data.error;
                else errorMsg = JSON.stringify(data);
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsForgotSubmitting(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const { data } = await axios.post(`${apiUrl}/auth/forgot-password`, { email: forgotEmail });
            setSuccessMsg(data.message || 'Password reset link sent to your email.');
            setTimeout(() => {
                setShowForgotPassword(false);
                setSuccessMsg('');
            }, 5000);
        } catch (err) {
            let errorMsg = 'Failed to request password reset';
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data.message === 'string') errorMsg = data.message;
                else if (Array.isArray(data.message)) errorMsg = data.message.join(', ');
                else if (typeof data === 'string') errorMsg = data;
                else if (typeof data.error === 'string') errorMsg = data.error;
                else errorMsg = JSON.stringify(data);
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50 font-sans">
            {/* Left Panel - Splash Art */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 overflow-hidden isolate justify-center items-center">
                {/* Decorative background gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-800 to-indigo-900 opacity-90 mix-blend-multiply" />
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500 blur-3xl opacity-30 animate-pulse"
                    style={{ animationDuration: '4s' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500 blur-3xl opacity-30 animate-pulse"
                    style={{ animationDuration: '6s' }}
                />

                <div className="relative z-10 p-12 max-w-lg text-white">
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight mt-10">
                        Command your infrastructure with precision.
                    </h1>
                    <p className="text-lg text-primary-100 font-medium mb-12 leading-relaxed">
                        Welcome to the next generation of telecom management. Seamless, secure, and infinitely scalable.
                    </p>

                    <div className="flex items-center space-x-4 bg-black/20 backdrop-blur-lg rounded-2xl p-4 border border-white/10 shadow-lg">
                        <div className="flex -space-x-3">
                            <img className="w-10 h-10 rounded-full border-2 border-primary-800 shadow-md" src="https://i.pravatar.cc/100?img=60" alt="User 1" />
                            <img className="w-10 h-10 rounded-full border-2 border-primary-800 shadow-md" src="https://i.pravatar.cc/100?img=33" alt="User 2" />
                            <img className="w-10 h-10 rounded-full border-2 border-primary-800 shadow-md" src="https://i.pravatar.cc/100?img=12" alt="User 3" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Trusted by operators</p>
                            <p className="text-xs text-primary-200 mt-0.5">Over 10,000+ active sessions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white lg:bg-transparent shadow-2xl lg:shadow-none z-10">
                <div className="mx-auto w-full max-w-sm lg:max-w-md">
                    <div className="mb-10 text-center lg:text-left flex flex-col items-center lg:items-start">
                        <img
                            src={getMediaUrl(branding.logoMain)}
                            alt={`${branding.name} Command Center`}
                            className="h-32 md:h-40 w-auto mb-8 lg:mb-10 object-contain bg-transparent"
                        />
                        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                            {showForgotPassword ? 'Reset password' : 'Welcome back'}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">
                            {showForgotPassword
                                ? 'Enter your email to receive a password reset link.'
                                : `Sign in to your ${branding.name} account to continue.`}
                        </p>
                    </div>

                    {showForgotPassword ? (
                        <form className="space-y-6" onSubmit={handleForgotSubmit}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 flex items-start border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="block font-medium">{error}</span>
                                </div>
                            )}
                            {successMsg && (
                                <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 flex items-start border border-green-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="block font-medium">{successMsg}</span>
                                </div>
                            )}

                            <div className="space-y-1 group">
                                <label htmlFor="forgotEmail" className="block text-sm font-semibold text-gray-700 transition-colors group-focus-within:text-primary-600">
                                    Email Address
                                </label>
                                <div className="relative mt-2 rounded-xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="forgotEmail"
                                        name="forgotEmail"
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white hover:bg-gray-50/50 focus:bg-white"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col space-y-3">
                                <button
                                    type="submit"
                                    disabled={isForgotSubmitting}
                                    className="group relative flex w-full justify-center items-center rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isForgotSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setError('');
                                        setSuccessMsg('');
                                    }}
                                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 flex items-start border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="block font-medium">{error}</span>
                                </div>
                            )}

                            <div className="space-y-1 group">
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 transition-colors group-focus-within:text-primary-600">
                                    Email Address
                                </label>
                                <div className="relative mt-2 rounded-xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white hover:bg-gray-50/50 focus:bg-white"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 group">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 transition-colors group-focus-within:text-primary-600">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(true)}
                                        className="text-sm font-semibold text-primary-600 hover:text-primary-500 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative mt-2 rounded-xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white hover:bg-gray-50/50 focus:bg-white"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group relative flex w-full justify-center items-center rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Sign in securely
                                            <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
