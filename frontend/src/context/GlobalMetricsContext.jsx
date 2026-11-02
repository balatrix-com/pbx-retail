import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { walletService } from '../services/wallet.service';
import telecomService from '../services/telecom.service';
import { useWalletQuery } from '../hooks/useBillingQueries';

const GlobalMetricsContext = createContext(null);

export const GlobalMetricsProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    // Metrics State
    const { data: walletData } = useWalletQuery();
    const balance = walletData?.balance || 0;
    const [activeCalls, setActiveCalls] = useState([]);
    const [queueDepth, setQueueDepth] = useState(0);

    // Connection State
    const [socket, setSocket] = useState(null);

    const tenantId = user?.tenant?.id || user?.tenantId;
    const canMonitor = user?.role === 'SUPER_ADMIN' || user?.monitoringEnabled === true;

    useEffect(() => {
        if (!isAuthenticated || !tenantId) {
            // Cleanup on logout
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            setActiveCalls([]);
            setQueueDepth(0);
            return;
        }

        let isMounted = true;
        if (!canMonitor) setActiveCalls([]);

        // 1. Initial Data Fetch (Telecom only)
        const fetchInitialData = async () => {
            try {
                // Fetch Telecom Metrics (Initial active calls + queues) - ONLY if monitoring is enabled for this user
                if (canMonitor) {
                    try {
                        const callsData = await telecomService.getActiveCalls(tenantId);
                        if (isMounted) setActiveCalls(callsData.data?.calls || []);
                    } catch (err) {
                        console.debug('Detailed monitoring access restricted', err);
                    }
                }

            } catch (err) {
                console.error('Failed to fetch initial global metrics', err);
            }
        };

        fetchInitialData();

        // 2. Setup Socket.io for Real-time Call Updates
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        if (token && canMonitor) {
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');
            const socketUrl = `${baseUrl.replace(/\/$/, '')}/monitor`;
            const socketPath = '/api/socket.io';

            const newSocket = io(socketUrl, {
                path: socketPath,
                transports: ['websocket', 'polling'],
                auth: { token },
                reconnection: true,
                reconnectionAttempts: 5
            });

            newSocket.on('connect', () => {
                newSocket.emit('join_room', tenantId);
            });

            newSocket.on('call_update', (callData) => {
                if (!isMounted) return;

                setActiveCalls(prevCalls => {
                    const index = prevCalls.findIndex(c => c.uuid === callData.uuid);
                    let status = callData.status || callData.call_status;
                    if (status === 'connected') status = 'answered';

                    if (['hangup', 'failed', 'busy', 'no_answer', 'declined'].includes(status)) {
                        return prevCalls.filter(c => c.uuid !== callData.uuid);
                    }

                    if (index >= 0) {
                        const updated = [...prevCalls];
                        updated[index] = { ...updated[index], ...callData, status };
                        return updated;
                    } else {
                        return [{ ...callData, status }, ...prevCalls];
                    }
                });
            });

            setSocket(newSocket);

            return () => {
                isMounted = false;
                newSocket.disconnect();
            };
        }

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, tenantId, canMonitor]);

    const value = useMemo(() => ({
        balance,
        activeCallsCount: activeCalls.length,
        queueDepth,
        socketStatus: socket?.connected ? 'connected' : 'disconnected'
    }), [balance, activeCalls.length, queueDepth, socket?.connected]);

    return (
        <GlobalMetricsContext.Provider value={value}>
            {children}
        </GlobalMetricsContext.Provider>
    );
};

export const useGlobalMetrics = () => useContext(GlobalMetricsContext);
