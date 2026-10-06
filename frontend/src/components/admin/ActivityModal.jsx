import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ActivityModal.css';

const ActivityModal = ({ userId, email, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        fetchActivity();
    }, [userId, page]);

    const fetchActivity = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users/${userId}/activity?page=${page}&limit=10`);
            setLogs(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch activity:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    const getActionLabel = (action) => {
        const labels = {
            CREATE_USER: 'Created User',
            UPDATE_USER: 'Updated User',
            SUSPEND_USER: 'Suspended User',
            ACTIVATE_USER: 'Activated User',
            INVITE_USER: 'Invited User',
            ACCEPT_INVITE: 'Accepted Invite',
            REINVITE_USER: 'Re-invited User',
            IMPERSONATE_USER: 'Impersonated User',
            END_IMPERSONATION: 'Ended Impersonation'
        };
        return labels[action] || action;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Activity Log - {email}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="activity-log">
                    {loading ? (
                        <div className="p-4 text-center">Loading activity...</div>
                    ) : logs && logs.length > 0 ? (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Action</th>
                                        <th>Actor</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td>{formatDate(log.timestamp)}</td>
                                            <td>{getActionLabel(log.action)}</td>
                                            <td>{log.actor?.email || 'System'}</td>
                                            <td>
                                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pagination && (
                                <div className="pagination-controls">
                                    <button
                                        onClick={() => setPage(p => p - 1)}
                                        disabled={page === 1}
                                        className="btn-secondary-sm"
                                    >
                                        Previous
                                    </button>
                                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= pagination.totalPages}
                                        className="btn-secondary-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-activity">No activity recorded</div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ActivityModal;
