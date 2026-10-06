import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const SignupPage = () => {
    // Removed step, otp
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { signup } = useAuth(); // Removed verifyOtp
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await signup(email, password, companyName);
            // Login successful, redirect to dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message?.toString() || err.message || 'Signup failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSignup}>
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input
                                type="text"
                                required
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
