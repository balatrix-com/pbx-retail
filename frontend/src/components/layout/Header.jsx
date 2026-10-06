import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalMetrics } from '../../context/GlobalMetricsContext';
import { Bell, LogOut, Activity, Menu, X, Sun, Moon } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { formatCustomerId } from '../../utils/billing.utils';
import { useTheme } from '../../context/ThemeContext';

const Header = ({ onMenuClick }) => {
    const { user, logout, isImpersonating, exitImpersonation } = useAuth();
    const { balance, activeCallsCount, queueDepth, socketStatus } = useGlobalMetrics();
    const { isDark, toggleTheme } = useTheme();

    return (
        <header className="flex h-16 w-full items-center justify-between border-b border-gray-200/80 bg-white/90 backdrop-blur-xl px-4 md:px-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] sticky top-0 z-40 transition-all">
            <div className="flex items-center">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={onMenuClick}
                    className="mr-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="mr-3 md:mr-5 pr-3 md:pr-5 border-r border-gray-200/80 flex items-center gap-2">
                    <span className="items-center rounded-md bg-primary-50 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-extrabold text-primary-700 ring-1 ring-inset ring-primary-600/10 uppercase tracking-widest shadow-sm truncate max-w-[120px] md:max-w-none">
                        {user?.tenant?.name || user?.tenantId || 'No Company'}
                    </span>
                    {user?.role !== 'SUPER_ADMIN' && user?.tenant?.customerCode && (
                        <>
                            <span className="hidden sm:inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold text-gray-500 ring-1 ring-inset ring-gray-200 tracking-widest shadow-sm">
                                {formatCustomerId(user?.tenant?.customerCode)}
                            </span>
                            <span className="sm:hidden inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[8px] font-bold text-gray-500 ring-1 ring-inset ring-gray-200">
                                {formatCustomerId(user?.tenant?.customerCode)}
                            </span>
                        </>
                    )}
                    {user?.role === 'SUPER_ADMIN' && !isImpersonating && (
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 uppercase tracking-widest shadow-sm">
                            Platform
                        </span>
                    )}
                </div>

                {/* Live Metrics - Hidden on small screens, shown from md up */}
                <div className="hidden lg:flex items-center space-x-3 text-sm">
                    <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border transition-colors ${activeCallsCount > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                        <span className="relative flex h-2.5 w-2.5">
                            {socketStatus === 'connected' && activeCallsCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${socketStatus === 'connected' ? (activeCallsCount > 0 ? 'bg-green-500' : 'bg-green-400') : 'bg-gray-400'}`}></span>
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-wide flex items-center ${activeCallsCount > 0 ? 'text-green-800' : 'text-gray-600'}`}>
                            Active Calls: <strong className={`font-mono ml-1.5 text-sm ${activeCallsCount > 0 ? 'text-green-900' : 'text-gray-700'}`}>{activeCallsCount}</strong>
                        </span>
                    </div>
                    <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border transition-colors ${queueDepth > 0 ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                        <Activity className={`h-3.5 w-3.5 ${queueDepth > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wide flex items-center ${queueDepth > 0 ? 'text-amber-800' : 'text-blue-800'}`}>
                            Queue Depth: <strong className={`font-mono ml-1.5 text-sm ${queueDepth > 0 ? 'text-amber-900' : 'text-blue-900'}`}>{queueDepth}</strong>
                        </span>
                    </div>
                </div>

                {isImpersonating && (
                    <div className="ml-2 md:ml-5 flex items-center bg-yellow-50 text-yellow-800 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold uppercase tracking-wide border border-yellow-200 shadow-sm animate-pulse">
                        <span className="mr-1 md:mr-2 hidden xs:inline">IMPERSONATING</span>
                        <span className="mr-1 md:mr-2 xs:hidden">IMP</span>
                        <button
                            onClick={exitImpersonation}
                            className="underline hover:text-red-600 transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end space-x-2 md:space-x-3 min-w-0">
                {/* Wallet Balance Preview - Hidden on very small screens */}
                <div className="hidden xs:flex items-center bg-gray-900 rounded-lg px-2 py-1 md:px-3 md:py-1.5 border border-gray-800 font-mono font-bold text-xs md:text-sm shadow-sm text-white hover:bg-black transition-colors ring-1 ring-inset ring-white/10">
                    <span className="text-gray-400 font-sans text-[10px] md:text-xs uppercase tracking-widest mr-1 md:mr-2 font-bold">Balance</span> ${Number(balance || 0).toFixed(2)}
                </div>

                {/* Notifications */}
                <NotificationPanel />

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] text-[var(--color-ink-mute)] hover:text-amber-500 hover:border-amber-400/50 dark:hover:text-amber-400 dark:hover:border-amber-500/40 transition-all duration-200 focus:outline-none shadow-xs active:scale-95"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    id="dark-mode-toggle"
                >
                    <div className="relative h-5 w-5 flex items-center justify-center">
                        <Sun
                            className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${isDark
                                ? 'opacity-100 rotate-0 scale-100 text-amber-400'
                                : 'opacity-0 rotate-90 scale-0'
                                }`}
                        />
                        <Moon
                            className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${isDark
                                ? 'opacity-0 -rotate-90 scale-0'
                                : 'opacity-100 rotate-0 scale-100 text-slate-600'
                                }`}
                        />
                    </div>
                </button>

                {/* Logout Button */}
                <button
                    onClick={() => {
                        if (window.confirm("Are you sure you want to sign out?")) {
                            logout();
                        }
                    }}
                    className="flex items-center p-1.5 md:p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all ring-1 ring-gray-200 hover:ring-red-300 shadow-sm focus:outline-none"
                    title="Logout"
                >
                    <LogOut className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />
                </button>
            </div>
        </header>
    );
};

export default Header;
