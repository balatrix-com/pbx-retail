import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

/**
 * useAnalyticsSocket
 *
 * Connects to the /monitor WebSocket namespace, joins the tenant room,
 * and listens for `analytics_snapshot` events emitted every 30s by MonitorGateway.
 *
 * Only users with monitoringEnabled or SUPER_ADMIN role can connect.
 * Everyone else gets { isConnected: false, liveStats: null }.
 */
const useAnalyticsSocket = () => {
    const { user } = useAuth();
    const [liveStats, setLiveStats] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    const canConnect = user?.role === 'SUPER_ADMIN' || user?.monitoringEnabled === true;
    const tenantId = user?.tenant?.id || user?.tenantId;

    const connect = useCallback(() => {
        if (!canConnect || !tenantId) return;

        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        if (!token) return;

        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');
        const socketUrl = `${baseUrl.replace(/\/$/, '')}/monitor`;
        const socketPath = '/api/socket.io';

        const socket = io(socketUrl, {
            path: socketPath,
            transports: ['websocket', 'polling'],
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join_room', tenantId);
        });

        socket.on('disconnect', () => setIsConnected(false));
        socket.on('connect_error', () => setIsConnected(false));

        socket.on('analytics_snapshot', (data) => {
            setLiveStats(data);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [canConnect, tenantId]);

    useEffect(() => {
        const cleanup = connect();
        return () => {
            if (cleanup) cleanup();
            else if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [connect]);

    return { liveStats, isConnected };
};

export default useAnalyticsSocket;
