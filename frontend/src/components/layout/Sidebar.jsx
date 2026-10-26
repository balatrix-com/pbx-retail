import React, { Fragment, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import {
    LayoutDashboard,
    LayoutGrid,
    CreditCard,
    Wallet,
    Phone,
    Users,
    UserCheck,
    BarChart3,
    Settings,
    Activity,
    PhoneCall,
    Globe,
    Shield,
    Briefcase,
    Music,
    LogOut,
    User,
    PhoneForwarded,
    ScrollText,
    Building2,
    Server,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    X,
    Clock,
    Headphones,
    DollarSign,
    ListTree,
    Hash,
    History,
    Radio
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { UserProfileModal } from '../profile';
import { getMediaUrl } from '../../utils/media.utils';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user, logout } = useAuth();
    const { branding } = useBranding();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const location = useLocation();
    const role = user?.role;

    const [isExtensionsOpen, setIsExtensionsOpen] = useState(
        location.pathname.startsWith('/extensions') || location.pathname.startsWith('/telecom/extensions')
    );

    // Resolve branding (User's tenant partner or domain-resolved fallback)
    const currentBranding = {
        ...branding,
        ...(user?.partner || {}),
        logoSidebar: user?.partner?.logoSidebar || branding?.logoSidebar,
        logoMain: user?.partner?.logoMain || branding?.logoMain,
        favicon: user?.partner?.favicon || branding?.favicon,
        name: user?.partner?.name || branding?.name,
    };

    useEffect(() => {
        setLogoError(false);
    }, [currentBranding.logoSidebar, currentBranding.logoMain]);

    const getNavItems = (role) => {
        const canMonitor = user?.role === 'SUPER_ADMIN' || user?.monitoringEnabled;

        let items = [];
        switch (role) {
            case 'SUPER_ADMIN':
                items = [
                    { name: 'Overview', href: '/platform', icon: LayoutGrid },
                    { name: 'Tenants', href: '/tenants', icon: Building2 },
                    { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
                    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                    { name: 'Revenue', href: '/revenue', icon: DollarSign },
                    { name: 'Rate Cards', href: '/super-admin/rate-cards', icon: CreditCard },
                    { name: 'Extension Status', href: '/admin/extension-status', icon: Radio },
                    { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                    { name: 'Call Records', href: '/cdrs', icon: History },
                    { name: 'Manage Numbers', href: '/super-admin/numbers', icon: Phone },
                    { name: 'Plans/Add-ons', href: '/super-admin/subscriptions', icon: CreditCard },
                    { name: 'User Management', href: '/super-admin/users', icon: Users },
                    { name: 'System Settings', href: '/settings', icon: Settings },
                ];
                break;
            case 'ADMIN':
                items = [
                    { name: 'Overview', href: '/dashboard', icon: LayoutGrid },
                    { name: 'Wallet', href: '/wallet', icon: Wallet },
                    { name: 'Phone Numbers', href: '/telecom/phone-numbers', icon: Phone },
                    {
                        name: 'Extensions',
                        icon: Users,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Extension Settings', href: '/extensions' },
                            { name: 'Extension Status', href: '/extensions/status' },
                        ]
                    },
                    { name: 'Ring Groups', href: '/telecom/ring-groups', icon: UserCheck },
                    { name: 'IVR Menus', href: '/telecom/ivrs', icon: ListTree },
                    { name: 'Audio Library', href: '/telecom/audio', icon: Music },
                    { name: 'DID Forwards', href: '/telecom/did-forwards', icon: PhoneForwarded },
                    { name: 'Trunks & Carriers', href: '/telecom/trunks', icon: Server },
                    { name: 'Operational Time', href: '/telecom/schedules', icon: Clock },
                    { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                    { name: 'Call Records', href: '/cdrs', icon: History },
                    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                    { name: 'User Management', href: '/users', icon: Users },
                ];
                break;
            case 'SUPPORT':
                items = [
                    { name: 'Overview', href: '/dashboard', icon: LayoutGrid },
                    { name: 'Wallet', href: '/wallet', icon: Wallet },
                    { name: 'Phone Numbers', href: '/telecom/phone-numbers', icon: Phone },
                    {
                        name: 'Extensions',
                        icon: Users,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Extension Settings', href: '/telecom/extensions' },
                            { name: 'Extension Status', href: '/telecom/extensions/status' },
                        ]
                    },
                    { name: 'Ring Groups', href: '/telecom/ring-groups', icon: UserCheck },
                    { name: 'IVR Menus', href: '/telecom/ivrs', icon: ListTree },
                    { name: 'Audio Library', href: '/telecom/audio', icon: Music },
                    { name: 'DID Forwards', href: '/telecom/did-forwards', icon: PhoneForwarded },
                    { name: 'Schedules', href: '/telecom/schedules', icon: Clock },
                    { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                    { name: 'Call Records', href: '/cdrs', icon: History },
                ];
                break;
            default:
                items = [];
        }

        if (!canMonitor) {
            items = items.filter(item => item.name !== 'Call Monitoring');
        }

        // Apply tenant feature controls if the user is not a global SUPER_ADMIN
        if (role !== 'SUPER_ADMIN') {
            const features = user?.tenant?.tenantFeatures || {
                ivrEnabled: true,
                ringGroupEnabled: true,
                schedulerEnabled: true,
                didForwardEnabled: true,
                monitorEnabled: true,
            };

            if (!features.ivrEnabled) {
                items = items.filter(item => item.name !== 'IVR Menus');
            }
            if (!features.ringGroupEnabled) {
                items = items.filter(item => item.name !== 'Ring Groups');
            }
            if (!features.schedulerEnabled) {
                items = items.filter(item => item.name !== 'Schedules' && item.name !== 'Operational Time');
            }
            if (!features.didForwardEnabled) {
                items = items.filter(item => item.name !== 'DID Forwards');
            }
            if (!features.monitorEnabled) {
                items = items.filter(item => item.name !== 'Call Monitoring');
            }
        }

        return items;
    };

    const navItems = getNavItems(role);

    return (
        <aside className={clsx(
            "app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0c0d12] text-gray-700 dark:text-slate-300 transition-all duration-300 ease-in-out lg:static lg:flex lg:translate-x-0 select-none font-sans",
            isCollapsed ? "w-20" : "w-64",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Header Brand */}
            <div className={clsx(
                "flex h-16 shrink-0 items-center relative",
                isCollapsed ? "justify-center px-0" : "justify-between px-5"
            )}>
                <Link to="/dashboard" className="flex items-center gap-2.5 outline-none group">
                    {!isCollapsed ? (
                        (currentBranding.logoSidebar || currentBranding.logoMain) && !logoError ? (
                            <img
                                src={getMediaUrl(currentBranding.logoSidebar || currentBranding.logoMain)}
                                alt={currentBranding.name}
                                className="h-8 w-auto max-w-[170px] object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                    {currentBranding.name || 'Cloud PBX'}
                                </span>
                            </div>
                        )
                    ) : (
                        <div className="h-9 w-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center font-black text-primary-600 dark:text-primary-400 text-lg shadow-sm">
                            {currentBranding.name?.charAt(0) || 'P'}
                        </div>
                    )}
                </Link>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white lg:hidden focus:outline-none rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/60"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-white dark:bg-[#0c0d12] border border-gray-200 dark:border-white/20 rounded-full items-center justify-center text-gray-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-500/50 shadow-sm z-50 transition-all cursor-pointer"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 overflow-y-auto py-5 px-3 scrollbar-thin scrollbar-thumb-purple-950/30 scrollbar-track-transparent">
                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        if (item.hasSubmenu) {
                            const isSubActive = item.subItems.some(sub => location.pathname.startsWith(sub.href));
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => !isCollapsed && setIsExtensionsOpen(!isExtensionsOpen)}
                                        className={clsx(
                                            "group flex w-full h-12 items-center transition-all duration-200 outline-none rounded-xl",
                                            isCollapsed
                                                ? "justify-center px-0 w-12 mx-auto"
                                                : "px-3",
                                            isSubActive
                                                ? "text-primary-600 dark:text-[#c084fc] font-bold"
                                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        {/* Minimized: Show Icon; Expanded: Show Horizontal Stepper Tick Line */}
                                        {isCollapsed ? (
                                            <div className={clsx(
                                                "flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200",
                                                isSubActive
                                                    ? "bg-primary-100 dark:bg-purple-600/20 text-primary-600 dark:text-[#c084fc] shadow-sm dark:shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                                                    : "text-slate-500 hover:text-primary-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-purple-300 group-hover:bg-slate-100 dark:group-hover:bg-purple-950/30"
                                            )}>
                                                {Icon && <Icon className="h-5 w-5" />}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-center shrink-0 w-8">
                                                    <span
                                                        className={clsx(
                                                            "transition-all duration-300 rounded-full",
                                                            isSubActive
                                                                ? "w-8 h-[2.5px] bg-primary-600 dark:bg-[#a855f7] shadow-[0_0_10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_10px_#a855f7]"
                                                                : "w-5 h-[1.5px] bg-slate-300 dark:bg-[#3a354d] group-hover:w-7 group-hover:bg-slate-500 dark:group-hover:bg-[#6b6282]"
                                                        )}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between flex-1 min-w-0 ml-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {Icon && (
                                                            <Icon className={clsx(
                                                                "h-4.5 w-4.5 shrink-0 transition-colors",
                                                                isSubActive
                                                                    ? "text-primary-600 dark:text-[#c084fc]"
                                                                    : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                                                            )} />
                                                        )}
                                                        <span className={clsx(
                                                            "text-[14.5px] truncate transition-colors",
                                                            isSubActive
                                                                ? "text-primary-600 dark:text-[#c084fc] font-bold"
                                                                : "font-semibold text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
                                                        )}>
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <ChevronDown
                                                        className={clsx(
                                                            "h-4 w-4 transition-transform duration-200 shrink-0 ml-2",
                                                            isExtensionsOpen
                                                                ? "rotate-180 text-primary-600 dark:text-[#c084fc]"
                                                                : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                                                        )}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu Drawer */}
                                    {!isCollapsed && isExtensionsOpen && (
                                        <div className="ml-9 pl-3.5 border-l border-slate-200 dark:border-purple-900/30 space-y-1 my-1.5">
                                            {item.subItems.map((sub) => {
                                                const isSubItemActive = location.pathname === sub.href;
                                                return (
                                                    <Link
                                                        key={sub.name}
                                                        to={sub.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={clsx(
                                                            "flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-[13.5px] transition-all",
                                                            isSubItemActive
                                                                ? "text-primary-700 dark:text-[#c084fc] font-bold bg-primary-50 dark:bg-purple-950/40"
                                                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30"
                                                        )}
                                                    >
                                                        <span className={clsx(
                                                            "h-1.5 w-1.5 rounded-full shrink-0 transition-all",
                                                            isSubItemActive
                                                                ? "bg-primary-600 dark:bg-[#a855f7] shadow-[0_0_8px_rgba(99,102,241,0.5)] dark:shadow-[0_0_8px_#a855f7] scale-125"
                                                                : "bg-slate-300 dark:bg-[#4f4866]"
                                                        )} />
                                                        <span className="truncate">{sub.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isActive = location.pathname.startsWith(item.href) && (item.href !== '/dashboard' || location.pathname === '/dashboard');
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    "group flex h-12 items-center transition-all duration-200 outline-none rounded-xl",
                                    isCollapsed
                                        ? "justify-center px-0 w-12 mx-auto"
                                        : "px-3",
                                    isActive
                                        ? "text-primary-600 dark:text-[#c084fc] font-bold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                {/* Minimized: Show Icon; Expanded: Show Horizontal Stepper Tick Line */}
                                {isCollapsed ? (
                                    <div className={clsx(
                                        "flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-primary-100 dark:bg-purple-600/20 text-primary-600 dark:text-[#c084fc] shadow-sm dark:shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                                            : "text-slate-500 hover:text-primary-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-purple-300 group-hover:bg-slate-100 dark:group-hover:bg-purple-950/30"
                                    )}>
                                        {Icon && <Icon className="h-5 w-5" />}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-center shrink-0 w-8">
                                            <span
                                                className={clsx(
                                                    "transition-all duration-300 rounded-full",
                                                    isActive
                                                        ? "w-8 h-[2.5px] bg-primary-600 dark:bg-[#a855f7] shadow-[0_0_10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_10px_#a855f7]"
                                                        : "w-5 h-[1.5px] bg-slate-300 dark:bg-[#3a354d] group-hover:w-7 group-hover:bg-slate-500 dark:group-hover:bg-[#6b6282]"
                                                )}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 ml-3 min-w-0">
                                            {Icon && (
                                                <Icon className={clsx(
                                                    "h-4.5 w-4.5 shrink-0 transition-colors",
                                                    isActive
                                                        ? "text-primary-600 dark:text-[#c084fc]"
                                                        : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                                                )} />
                                            )}
                                            <span className={clsx(
                                                "text-[14.5px] truncate transition-colors",
                                                isActive
                                                    ? "text-primary-600 dark:text-[#c084fc] font-bold"
                                                    : "font-semibold text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
                                            )}>
                                                {item.name}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom User Profile Section */}
            <div className="p-3 shrink-0 bg-white dark:bg-[#0c0d12]">
                <Menu as="div" className="relative">
                    <Menu.Button className={clsx(
                        "group flex w-full items-center rounded-xl p-2 focus:outline-none hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 border border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/5",
                        isCollapsed ? "justify-center px-0" : "text-left"
                    )}>
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary-100 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm shadow-xs group-hover:border-primary-400 transition-colors">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-200 truncate">{user?.name || 'User'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 truncate">{user?.tenant?.name || 'Cloud PBX'}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-gray-200 dark:bg-white/10 text-primary-700 dark:text-primary-300 border border-gray-300 dark:border-white/10">
                                        {user?.role?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2"
                    >
                        <Menu.Items className="absolute bottom-[calc(100%+0.5rem)] left-0 w-full origin-bottom rounded-2xl bg-white dark:bg-[#12141c] border border-gray-200 dark:border-white/15 shadow-xl p-1.5 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none overflow-hidden z-50">
                            <div className="py-1 space-y-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(true);
                                                setIsOpen(false);
                                            }}
                                            className={clsx(
                                                active ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300' : 'text-gray-700 dark:text-slate-300',
                                                'group flex w-full items-center rounded-xl px-3 py-2 text-xs font-bold transition-colors'
                                            )}
                                        >
                                            <User className={clsx(
                                                active ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-slate-400",
                                                "mr-2.5 h-4 w-4"
                                            )} aria-hidden="true" />
                                            My Profile
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to sign out?")) {
                                                    logout();
                                                }
                                            }}
                                            className={clsx(
                                                active ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'text-red-500 dark:text-red-400',
                                                'group flex w-full items-center rounded-xl px-3 py-2 text-xs font-bold transition-colors'
                                            )}
                                        >
                                            <LogOut className={clsx(
                                                active ? "text-red-600 dark:text-red-300" : "text-red-500 dark:text-red-400",
                                                "mr-2.5 h-4 w-4"
                                            )} aria-hidden="true" />
                                            Sign out
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </aside>
    );
};

export default Sidebar;
