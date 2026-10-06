import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import axios from 'axios';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError('Invalid or missing password reset token.');
                setIsValidating(false);
                return;
            }

            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                await axios.get(`${apiUrl}/auth/verify-reset-token?token=${token}`);
                setIsValid(true);
            } catch (err) {
                // We deliberately do not call setError here so we don't show a raw json bubble.
                // The `!isValid` state natively controls the view.
                setIsValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('Invalid or missing password reset token.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            await axios.post(`${apiUrl}/auth/reset-password`, {
                token,
                newPassword: password,
            });
            setSuccess('Password has been reset successfully. You can now log in.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            let errorMsg = 'Failed to reset password';
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

    return (
        <div className="flex min-h-screen bg-gray-50/50 font-sans">
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 items-center z-10 w-full">
                <div className="w-full max-w-sm lg:max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 flex items-start border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <span className="block font-medium">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 flex items-start border border-green-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <span className="block font-medium">{success}</span>
                            </div>
                        )}

                        {isValidating ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="mb-6 text-center flex flex-col items-center">
                                    <Loader2 className="h-12 w-12 text-primary-600 mb-4 animate-spin" />
                                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                                        Verifying Link
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium max-w-xs text-center">
                                        Please wait while we check your secure reset link.
                                    </p>
                                </div>
                            </div>
                        ) : !isValid ? (
                            <div className="flex flex-col items-center">
                                <div className="mb-6 text-center flex flex-col items-center">
                                    <XCircle className="h-12 w-12 text-red-500 mb-4" />
                                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                                        Link Expired
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium max-w-xs text-center mb-6">
                                        This password reset link is invalid or has expired. Please request a new one from the login page.
                                    </p>
                                </div>
                                <div className="w-full">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="group relative flex w-full justify-center items-center rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 transition-all duration-200"
                                    >
                                        Back to Login
                                        <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 text-center flex flex-col items-center">
                                    <ShieldCheck className="h-12 w-12 text-primary-600 mb-4" />
                                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                                        Reset Password
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium max-w-xs text-center">
                                        Enter your new password below.
                                    </p>
                                </div>

                                <div className="space-y-1 group">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 transition-colors group-focus-within:text-primary-600">
                                        New Password
                                    </label>
                                    <div className="relative mt-2 rounded-xl shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" aria-hidden="true" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white hover:bg-gray-50/50 focus:bg-white"
                                            placeholder="••••••••"
                                            disabled={!!success}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 group">
                                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 transition-colors group-focus-within:text-primary-600">
                                        Confirm New Password
                                    </label>
                                    <div className="relative mt-2 rounded-xl shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-500" aria-hidden="true" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all duration-200 bg-white hover:bg-gray-50/50 focus:bg-white"
                                            placeholder="••••••••"
                                            disabled={!!success}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !!success || !token}
                                        className="group relative flex w-full justify-center items-center rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-primary-500 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            <>
                                                Reset Password
                                                <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
