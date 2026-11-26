import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    ChevronDown,
    Clock,
    Headphones,
    DollarSign,
    ListTree,
    Hash,
    History,
    Radio
} from 'lucide-react';

const TopNavbar = ({ inline = false }) => {
    const { user } = useAuth();
    const location = useLocation();
    const role = user?.role;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsMenuOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsMenuOpen(false);
        }, 150);
    };

    // Close open dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    // Close open dropdown on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    const getNavItems = (role) => {
        const canMonitor = user?.role === 'SUPER_ADMIN' || user?.monitoringEnabled;

        let items = [];
        switch (role) {
            case 'SUPER_ADMIN':
                items = [
                    {
                        name: 'Dashboard',
                        icon: LayoutDashboard,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Overview', href: '/platform', icon: LayoutGrid },
                        ]
                    },
                    {
                        name: 'Tenant & User Management',
                        icon: Building2,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Tenants', href: '/tenants', icon: Building2 },
                            { name: 'User Management', href: '/super-admin/users', icon: Users },
                        ]
                    },
                    {
                        name: 'Telephony & Call Operations',
                        icon: PhoneCall,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Extension Status', href: '/admin/extension-status', icon: Radio },
                            { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                            { name: 'Call Records', href: '/cdrs', icon: History },
                            { name: 'SIP Traces', href: '/super-admin/sip-traces', icon: ScrollText },
                        ]
                    },
                    {
                        name: 'Billing & Subscription',
                        icon: CreditCard,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Plan Catalog', href: '/super-admin/plans', icon: Briefcase },
                            { name: 'Rate Cards', href: '/super-admin/rate-cards', icon: CreditCard },
                            { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
                            { name: 'Revenue', href: '/revenue', icon: DollarSign },
                        ]
                    },
                    {
                        name: 'System Administration & Insights',
                        icon: Shield,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                            { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
                            { name: 'System Settings', href: '/settings', icon: Settings },
                        ]
                    },
                ];
                break;
            case 'ADMIN':
                items = [
                    {
                        name: 'Dashboard',
                        icon: LayoutDashboard,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Overview', href: '/dashboard', icon: LayoutGrid },
                        ]
                    },
                    {
                        name: 'User & Account Management',
                        icon: Users,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'User Management', href: '/users', icon: Users },
                        ]
                    },
                    {
                        name: 'Telephony & Call Operations',
                        icon: PhoneCall,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Phone Numbers', href: '/telecom/phone-numbers', icon: Phone },
                            { name: 'Extension Settings', href: '/extensions', icon: Settings },
                            { name: 'Extension Status', href: '/extensions/status', icon: Radio },
                            { name: 'Ring Groups', href: '/telecom/ring-groups', icon: UserCheck },
                            { name: 'IVR Menus', href: '/telecom/ivrs', icon: ListTree },
                            { name: 'Audio Library', href: '/telecom/audio', icon: Music },
                            { name: 'Voicemail', href: '/telecom/voicemail', icon: Headphones },
                            { name: 'DID Forwards', href: '/telecom/did-forwards', icon: PhoneForwarded },
                            { name: 'Trunks & Carriers', href: '/telecom/trunks', icon: Server },
                            { name: 'Operational Schedules', href: '/telecom/schedules', icon: Clock },
                            { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                            { name: 'Call Records', href: '/cdrs', icon: History },
                            { name: 'SIP Traces', href: '/telecom/sip-traces', icon: ScrollText },
                        ]
                    },
                    {
                        name: 'Wallet & Analytics',
                        icon: CreditCard,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Wallet', href: '/wallet', icon: Wallet },
                            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                        ]
                    },
                ];
                break;
            case 'SUPPORT':
                items = [
                    {
                        name: 'Dashboard',
                        icon: LayoutDashboard,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Overview', href: '/dashboard', icon: LayoutGrid },
                        ]
                    },
                    {
                        name: 'Telephony & Call Routing',
                        icon: PhoneCall,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Phone Numbers', href: '/telecom/phone-numbers', icon: Phone },
                            { name: 'Extension Settings', href: '/telecom/extensions', icon: Settings },
                            { name: 'Extension Status', href: '/telecom/extensions/status', icon: Radio },
                            { name: 'Ring Groups', href: '/telecom/ring-groups', icon: UserCheck },
                            { name: 'IVR Menus', href: '/telecom/ivrs', icon: ListTree },
                            { name: 'Audio Library', href: '/telecom/audio', icon: Music },
                            { name: 'Voicemail', href: '/telecom/voicemail', icon: Headphones },
                            { name: 'DID Forwards', href: '/telecom/did-forwards', icon: PhoneForwarded },
                            { name: 'Operational Schedules', href: '/telecom/schedules', icon: Clock },
                        ]
                    },
                    {
                        name: 'Call Operations',
                        icon: Activity,
                        hasSubmenu: true,
                        subItems: [
                            { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                            { name: 'Call Records', href: '/cdrs', icon: History },
                        ]
                    },
                ];
                break;
            default:
                items = [];
        }

        items = items.map(item => item.hasSubmenu
            ? {
                ...item,
                subItems: item.subItems.filter(subItem => {
                    if (!canMonitor && subItem.name === 'Call Monitoring') return false;
                    return true;
                })
            }
            : item).filter(item => !item.hasSubmenu || item.subItems.length > 0);

        if (role !== 'SUPER_ADMIN') {
            const features = user?.tenant?.tenantFeatures || {
                ivrEnabled: true,
                ringGroupEnabled: true,
                schedulerEnabled: true,
                didForwardEnabled: true,
                monitorEnabled: true,
            };

            items = items.map(item => item.hasSubmenu
                ? {
                    ...item,
                    subItems: item.subItems.filter(subItem => {
                        if (!features.ivrEnabled && subItem.name === 'IVR Menus') return false;
                        if (!features.ringGroupEnabled && subItem.name === 'Ring Groups') return false;
                        if (!features.schedulerEnabled && ['Schedules', 'Operational Schedules', 'Operational Time'].includes(subItem.name)) return false;
                        if (!features.didForwardEnabled && subItem.name === 'DID Forwards') return false;
                        if (!features.monitorEnabled && subItem.name === 'Call Monitoring') return false;
                        return true;
                    })
                }
                : item).filter(item => !item.hasSubmenu || item.subItems.length > 0);
        }

        return items;
    };

    const navItems = getNavItems(role);

    return (
        <nav
            ref={dropdownRef}
            aria-label="Main Navigation"
            className={clsx(
                "select-none",
                inline
                    ? "flex items-center"
                    : "w-full bg-white dark:bg-[#0c0d12] border-b border-gray-200/80 dark:border-white/10 px-4 md:px-6 z-30 sticky top-16 shadow-xs"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={clsx("flex items-center gap-1 sm:gap-1.5 relative", !inline && "py-2")}>
                {navItems.map((item) => {
                    const Icon = item.icon;

                    if (item.hasSubmenu) {
                        const isSubActive = item.subItems.some(sub => location.pathname.startsWith(sub.href));

                        return (
                            <div key={item.name} className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen(prev => !prev)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 outline-none whitespace-nowrap cursor-pointer",
                                        isSubActive || isMenuOpen
                                            ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/40 shadow-xs"
                                            : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent"
                                    )}
                                >
                                    {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                                    <span>{item.name}</span>
                                    <ChevronDown
                                        className={clsx(
                                            "h-3.5 w-3.5 transition-transform duration-200 text-slate-400",
                                            isMenuOpen && "rotate-180 text-teal-600 dark:text-teal-400"
                                        )}
                                    />
                                </button>
                            </div>
                        );
                    }

                    const isActive = location.pathname.startsWith(item.href) && (item.href !== '/dashboard' || location.pathname === '/dashboard');
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={clsx(
                                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 outline-none whitespace-nowrap shrink-0",
                                isActive
                                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/40 shadow-xs"
                                    : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent"
                            )}
                        >
                            {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                            <span>{item.name}</span>
                        </Link>
                    );
                })}

                {/* Unified Mega Menu Flyout Dropdown displaying all categories together */}
                {isMenuOpen && (
                    <div
                        className="fixed left-4 right-4 sm:left-6 sm:right-6 top-16 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="max-w-7xl mx-auto rounded-3xl bg-white/95 dark:bg-[#0f1118]/95 border border-gray-200/90 dark:border-white/15 shadow-2xl p-6 sm:p-7 backdrop-blur-2xl">
                            {/* Grid of all categories and their sub-items */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-7 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/5">
                                {navItems.filter(item => item.hasSubmenu).map((cat, idx) => {
                                    const CatIcon = cat.icon;
                                    const isAnySubActive = cat.subItems.some(sub => location.pathname.startsWith(sub.href));
                                    const isWideColumn = cat.subItems.length > 6;

                                    return (
                                        <div
                                            key={cat.name}
                                            className={clsx(
                                                "flex flex-col gap-3",
                                                isWideColumn ? "lg:col-span-4" : "lg:col-span-2",
                                                idx > 0 && "sm:pl-7 pt-4 sm:pt-0"
                                            )}
                                        >
                                            {/* Column Header */}
                                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100 dark:border-white/10">
                                                <div className={clsx(
                                                    "h-8 w-8 rounded-xl flex items-center justify-center transition-colors shadow-2xs shrink-0",
                                                    isAnySubActive
                                                        ? "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
                                                        : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                                                )}>
                                                    {CatIcon && <CatIcon className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-gray-900 dark:text-white truncate">
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                                                        {cat.subItems.length} {cat.subItems.length === 1 ? 'Service' : 'Services'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Submenu Item Links */}
                                            <div className={clsx(
                                                "flex flex-col gap-1.5",
                                                cat.subItems.length > 6 && "grid grid-cols-2 gap-x-2 gap-y-1.5"
                                            )}>
                                                {cat.subItems.map((sub) => {
                                                    const isSubItemActive = location.pathname === sub.href;
                                                    const SubIcon = sub.icon;

                                                    return (
                                                        <Link
                                                            key={sub.name}
                                                            to={sub.href}
                                                            onClick={() => setIsMenuOpen(false)}
                                                            className={clsx(
                                                                "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-[12.5px] font-bold transition-all duration-150 group/item",
                                                                isSubItemActive
                                                                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 border border-teal-100 dark:border-teal-800/40 shadow-2xs"
                                                                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className={clsx(
                                                                    "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                                                    isSubItemActive
                                                                        ? "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300"
                                                                        : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover/item:text-teal-600 dark:group-hover/item:text-teal-400 group-hover/item:bg-teal-50 dark:group-hover/item:bg-teal-950/40"
                                                                )}>
                                                                    {SubIcon && <SubIcon className="h-3.5 w-3.5" />}
                                                                </div>
                                                                <span className="truncate">{sub.name}</span>
                                                            </div>
                                                            {isSubItemActive && (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0" />
                                                            )}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default TopNavbar;
