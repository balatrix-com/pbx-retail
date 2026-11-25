import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { useGlobalMetrics } from '../../context/GlobalMetricsContext';
import { LogOut, Activity, Sun, Moon, User } from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { LogOut, Activity, Menu, X, Sun, Moon } from 'lucide-react';
import { formatCustomerId } from '../../utils/billing.utils';
import { useTheme } from '../../context/ThemeContext';
import { getMediaUrl } from '../../utils/media.utils';
import { UserProfileModal } from '../profile';
import TopNavbar from './TopNavbar';

const Header = () => {
    const { user, logout, isImpersonating, exitImpersonation } = useAuth();
    const { branding } = useBranding();
    const { balance, activeCallsCount, queueDepth, socketStatus } = useGlobalMetrics();
    const { isDark, toggleTheme } = useTheme();
    const [logoError, setLogoError] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Resolve branding (User's tenant partner or domain-resolved fallback)
    const currentBranding = {
        ...branding,
        ...(user?.partner || {}),
        logoSidebar: user?.partner?.logoSidebar || branding?.logoSidebar,
        logoMain: user?.partner?.logoMain || branding?.logoMain,
        favicon: user?.partner?.favicon || branding?.favicon,
        name: user?.partner?.name || branding?.name,
    };

    return (
        <>
            <header className="flex h-16 w-full items-center justify-between bg-white/90 dark:bg-[#0c0d12]/95 backdrop-blur-xl px-4 md:px-6 sticky top-0 z-40 border-b border-teal-200/60 dark:border-white/10 transition-all gap-4 shadow-2xs">
                {/* Left Area: Logo & Company / Role Badges */}
                <div className="flex items-center shrink-0">
                    {/* Brand Logo */}
                    <Link to={user?.role === 'SUPER_ADMIN' ? '/platform' : '/dashboard'} className="flex items-center gap-2.5 mr-3 md:mr-4 outline-none group shrink-0">
                        {(currentBranding.logoMain || currentBranding.logoSidebar) && !logoError ? (
                            <img
                                src={getMediaUrl(currentBranding.logoMain || currentBranding.logoSidebar)}
                                alt={currentBranding.name}
                                className="h-7 w-auto max-w-[130px] md:max-w-[160px] object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                    {currentBranding.name || 'Cloud PBX'}
                                </span>
                            </div>
                        )}
                    </Link>

                    <div className="flex items-center gap-1.5 pr-3 border-r border-gray-200/80 dark:border-white/10">
                        <span className="items-center rounded-lg bg-primary-50 dark:bg-purple-950/40 px-2 py-1 text-[10px] md:text-xs font-bold text-primary-700 dark:text-[#c084fc] ring-1 ring-inset ring-primary-600/10 dark:ring-purple-500/20 uppercase tracking-wider shadow-2xs truncate max-w-[110px] md:max-w-none">
                            {user?.tenant?.name || user?.tenantId || 'No Company'}
                        </span>
                        {user?.role !== 'SUPER_ADMIN' && user?.tenant?.customerCode && (
                            <span className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-white/5 px-2 py-1 text-[10px] md:text-xs font-mono font-bold text-gray-500 dark:text-slate-400 ring-1 ring-inset ring-gray-200 dark:ring-white/10 tracking-wider shadow-2xs">
                                {formatCustomerId(user?.tenant?.customerCode)}
                            </span>
                        )}
                        {user?.role === 'SUPER_ADMIN' && !isImpersonating && (
                            <span className="inline-flex items-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 text-[10px] md:text-xs font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20 uppercase tracking-wider shadow-2xs">
                                Platform
                            </span>
                        )}
                    </div>
                </div>

                {/* Center Area: Primary Navigation Links */}
                <div className="flex-1 flex items-center justify-center min-w-0">
                    <TopNavbar inline />
                </div>

                {/* Right Area: Live Telemetry, Dark Mode & User Profile */}
                <div className="flex items-center justify-end space-x-2 md:space-x-3 shrink-0">
                    {/* Live Metrics Telemetry Pill */}
                    <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 shadow-2xs text-xs font-medium">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                            <span className="relative flex h-2 w-2">
                                {socketStatus === 'connected' && activeCallsCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketStatus === 'connected' ? (activeCallsCount > 0 ? 'bg-emerald-500' : 'bg-emerald-400') : 'bg-gray-400'}`}></span>
                            </span>
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                                Calls: <strong className="font-mono text-gray-900 dark:text-white">{activeCallsCount}</strong>
                            </span>
                        </div>
                        <div className="h-3 w-[1px] bg-gray-200 dark:bg-white/10" />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                            <Activity className="h-3 w-3 text-blue-500" />
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                                Queue: <strong className="font-mono text-gray-900 dark:text-white">{queueDepth}</strong>
                            </span>
                        </div>
                    </div>

                    {isImpersonating && (
                        <div className="flex items-center bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wide border border-yellow-200 dark:border-yellow-700/50 shadow-2xs animate-pulse">
                            <span className="mr-1 hidden sm:inline">IMP</span>
                            <button
                                onClick={exitImpersonation}
                                className="underline hover:text-red-600 transition-colors cursor-pointer"
                            >
                                Exit
                            </button>
                        </div>
                    )}

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

                    {/* User Profile Dropdown */}
                    <HeadlessMenu as="div" className="relative">
                        <HeadlessMenu.Button className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none">
                            <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs shadow-xs">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        </HeadlessMenu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white dark:bg-[#12141c] border border-gray-200 dark:border-white/15 shadow-xl p-2 z-50 focus:outline-none">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 mb-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <HeadlessMenu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => setIsProfileOpen(true)}
                                            className={`${active ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-slate-300'} flex w-full items-center rounded-xl px-3 py-2 text-xs font-semibold`}
                                        >
                                            <User className="mr-2 h-4 w-4" /> My Profile
                                        </button>
                                    )}
                                </HeadlessMenu.Item>
                                <HeadlessMenu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to sign out?")) {
                                                    logout();
                                                }
                                            }}
                                            className={`${active ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300' : 'text-red-500 dark:text-red-400'} flex w-full items-center rounded-xl px-3 py-2 text-xs font-semibold`}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" /> Sign out
                                        </button>
                                    )}
                                </HeadlessMenu.Item>
                            </HeadlessMenu.Items>
                        </Transition>
                    </HeadlessMenu>
                </div>
            </header>

            <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
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
