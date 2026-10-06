import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './AcceptInvitePage.css';

const AcceptInvitePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing invitation token.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            await api.post('/users/invite/accept', {
                token,
                password
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to accept invitation. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="accept-invite-page">
                <div className="accept-card">
                    <div className="success-icon">✓</div>
                    <h2>Account Activated!</h2>
                    <p>Your account has been successfully set up.</p>
                    <p className="redirect-text">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="accept-invite-page">
            <div className="accept-card">
                <h2>Accept Invitation</h2>
                <p>Create a password to activate your account</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="*************"
                            minLength={8}
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="*************"
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || !token}
                    >
                        {loading ? 'Activating...' : 'Activate Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvitePage;
