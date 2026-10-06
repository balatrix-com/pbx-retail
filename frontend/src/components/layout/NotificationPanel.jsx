import React, { useState, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, PhoneMissed, DollarSign, Activity } from 'lucide-react';
import { useGlobalMetrics } from '../../context/GlobalMetricsContext';
import { notificationService } from '../../services/notification.service';
import { formatDistanceToNow } from 'date-fns';

// Helper function to get the appropriate icon based on notification type
const getNotificationIcon = (type) => {
    switch (type) {
        case 'warning':
            return <AlertTriangle className="h-5 w-5 text-amber-500" />;
        case 'error':
            return <AlertCircle className="h-5 w-5 text-red-500" />;
        case 'missed_call':
            return <PhoneMissed className="h-5 w-5 text-purple-500" />;
        case 'billing':
            return <DollarSign className="h-5 w-5 text-emerald-500" />;
        case 'system':
            return <Activity className="h-5 w-5 text-blue-500" />;
        default:
            return <Info className="h-5 w-5 text-gray-500" />;
    }
};

const NotificationPanel = () => {
    const { balance, queueDepth } = useGlobalMetrics();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications(50);

            // Backend returns { notifications: [...] }
            const list = Array.isArray(data?.notifications) ? data.notifications : [];

            // Format timestamps for display
            const formattedData = list.map(n => ({
                ...n,
                time: n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'Just now'
            }));

            setNotifications(formattedData);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();

        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Dynamic notifications based on global metrics (Overlaying active warnings on top of DB notifications)
    useEffect(() => {
        if (loading) return; // Wait until initial fetch is done

        setNotifications(prev => {
            let newNotifications = [...prev];
            let hasChanges = false;

            // Check low balance overlay
            if (balance !== undefined && balance < 50) {
                const lowBalanceExists = newNotifications.some(n => n.id === 'low_balance');
                if (!lowBalanceExists) {
                    newNotifications.unshift({
                        id: 'low_balance',
                        type: 'warning',
                        title: 'Low Balance Warning',
                        message: `Your wallet balance is running low ($${Number(balance).toFixed(2)}). Please recharge soon to avoid service interruption.`,
                        time: 'Now',
                        read: false,
                        isOverlay: true // Mark as not from DB
                    });
                    hasChanges = true;
                }
            } else {
                const index = newNotifications.findIndex(n => n.id === 'low_balance');
                if (index > -1) {
                    newNotifications.splice(index, 1);
                    hasChanges = true;
                }
            }

            // Check high queue depth overlay
            if (queueDepth !== undefined && queueDepth > 5) {
                const highQueueExists = newNotifications.some(n => n.id === 'high_queue');
                if (!highQueueExists) {
                    newNotifications.unshift({
                        id: 'high_queue',
                        type: 'error',
                        title: 'High Queue Depth',
                        message: `There are currently ${queueDepth} callers waiting in the queues.`,
                        time: 'Now',
                        read: false,
                        isOverlay: true
                    });
                    hasChanges = true;
                }
            } else {
                const index = newNotifications.findIndex(n => n.id === 'high_queue');
                if (index > -1) {
                    newNotifications.splice(index, 1);
                    hasChanges = true;
                }
            }

            return hasChanges ? newNotifications : prev;
        });
    }, [balance, queueDepth, loading]);


    const unreadCount = notifications.filter((item) => !item.read).length;

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const markAsRead = async (id) => {
        const notification = notifications.find(n => n.id === id);
        if (notification?.read) return;

        // Optimistic update
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));

        // Don't call API for overlay notifications
        if (notification?.isOverlay) return;

        try {
            await notificationService.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert optimisitic update on error
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: false } : n));
        }
    };

    const removeNotification = async (id, e) => {
        e.stopPropagation();

        const notification = notifications.find(n => n.id === id);

        // Optimistic UI Removal
        setNotifications(notifications.filter(n => n.id !== id));

        // Mark as read in DB so it doesn't show up again.
        // Or ideallly a delete endpoint, but marking read is fine for now to remove from "new"
        if (!notification?.isOverlay && !notification?.read) {
            try {
                await notificationService.markAsRead(id);
            } catch (error) {
                console.error('Failed to hide notification:', error);
            }
        }
    };

    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    <Popover.Button
                        className={`
                            relative rounded-lg p-2 transition-all shadow-sm focus:outline-none ring-1
                            ${open ? 'bg-primary-50 text-primary-600 ring-primary-300' : 'bg-white text-gray-400 hover:text-primary-600 hover:bg-primary-50 ring-gray-200 hover:ring-primary-300'}
                        `}
                    >
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
                            </span>
                        )}
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute right-0 z-50 mt-2 w-80 sm:w-96 transform px-4 sm:px-0">
                            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 bg-white">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                                        Notifications
                                        {unreadCount > 0 && (
                                            <span className="ml-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700 ring-1 ring-inset ring-primary-600/10">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center"
                                        >
                                            <Check className="mr-1 h-3.5 w-3.5" />
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                {/* List */}
                                <div className="max-h-[400px] overflow-y-auto w-full">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                            <div className="rounded-full bg-gray-50 p-3 mb-3 ring-1 ring-gray-100">
                                                <Bell className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-900">No notifications</h4>
                                            <p className="mt-1 text-xs text-gray-500">You're all caught up! Check back later.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => markAsRead(notification.id)}
                                                    className={`
                                                        relative flex items-start gap-4 p-4 transition-colors cursor-pointer w-full group
                                                        ${notification.read ? 'bg-white hover:bg-gray-50' : 'bg-primary-50/30 hover:bg-primary-50/50'}
                                                    `}
                                                >
                                                    <div className="flex-shrink-0 mt-1">
                                                        <div className={`p-2 rounded-xl ring-1 shadow-sm ${notification.read ? 'bg-white ring-gray-200' : 'bg-white ring-primary-200 shadow-primary-500/10'}`}>
                                                            {getNotificationIcon(notification.type)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <p className={`text-sm font-bold truncate ${notification.read ? 'text-gray-900' : 'text-primary-950'}`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2 mt-0.5">
                                                                {notification.time}
                                                            </p>
                                                        </div>
                                                        <p className={`mt-1 text-xs line-clamp-2 leading-relaxed ${notification.read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                                                            {notification.message}
                                                        </p>
                                                    </div>

                                                    {/* Delete Button (Visible on hover) */}
                                                    <button
                                                        onClick={(e) => removeNotification(notification.id, e)}
                                                        className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all focus:outline-none"
                                                        title="Dismiss"
                                                    >
                                                        <span className="sr-only">Dismiss</span>
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>

                                                    {!notification.read && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {notifications.length > 0 && (
                                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                                        <button className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors w-full p-2 outline-none focus:ring-2 focus:ring-primary-500/20 rounded-lg">
                                            View all notifications
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
};

export default NotificationPanel;
