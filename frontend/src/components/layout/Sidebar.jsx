import React from 'react';
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
import { Fragment, useState, useEffect } from 'react';
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


    // ... existing nav items logic ...
    const getNavItems = (role) => {
        const canMonitor = user?.role === 'SUPER_ADMIN' || user?.monitoringEnabled;

        let items = [];
        switch (role) {
            case 'SUPER_ADMIN':
                items = [
                    { name: 'Platform Dashboard', href: '/platform', icon: LayoutGrid },
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
                    { name: 'Carriers & Gateways', href: '/super-admin/carriers', icon: Server },
                    { name: 'User Management', href: '/super-admin/users', icon: Users },
                    { name: 'System Settings', href: '/settings', icon: Settings },
                ];
                break;
            case 'ADMIN':
                items = [
                    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
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
                    { name: 'Operational Time', href: '/telecom/schedules', icon: Clock },
                    { name: 'Call Monitoring', href: '/monitoring', icon: Activity },
                    { name: 'Call Records', href: '/cdrs', icon: History },
                    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                    { name: 'User Management', href: '/users', icon: Users },
                ];
                break;

            case 'SUPPORT':
                items = [
                    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
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
                items = items.filter(item => item.name !== 'Schedules');
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
        <div className={clsx(
            "fixed inset-y-0 left-0 z-50 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out lg:static lg:flex lg:translate-x-0 shadow-2xl lg:shadow-none",
            isCollapsed ? "w-20" : "w-72",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Brand Header */}
            <div className={clsx("flex h-16 shrink-0 items-center relative", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
                <Link to="/dashboard" className="flex items-center outline-none">
                    {!isCollapsed ? (
                        (currentBranding.logoSidebar || currentBranding.logoMain) && !logoError ? (
                            <img
                                src={getMediaUrl(currentBranding.logoSidebar || currentBranding.logoMain)}
                                alt={currentBranding.name}
                                className="h-8 w-auto max-w-[180px] object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <span className="font-extrabold text-lg tracking-tight text-gray-900 truncate">
                                {currentBranding.name || 'Cloud PBX'}
                            </span>
                        )
                    ) : (
                        <div className="h-8 w-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-sm">
                            {currentBranding.name?.charAt(0) || 'P'}
                        </div>
                    )}
                </Link>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 -mr-2 text-gray-500 hover:text-gray-900 lg:hidden focus:outline-none"
                >
                    <X className="h-5 w-5" />
                </button>
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-5 h-6 w-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-600 shadow-sm z-50 transition-colors cursor-pointer"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href) && (item.href !== '/dashboard' || location.pathname === '/dashboard');
                        const Icon = item.icon;
                        if (item.hasSubmenu) {
                            const isSubActive = location.pathname.startsWith(item.subItems[0].href) || location.pathname.startsWith(item.subItems[1].href);
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => !isCollapsed && setIsExtensionsOpen(!isExtensionsOpen)}
                                        className={clsx(
                                            isSubActive && !isExtensionsOpen
                                                ? 'bg-indigo-50/90 border border-indigo-200/80 text-indigo-900 font-bold shadow-sm'
                                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold border border-transparent',
                                            'group flex w-full items-center rounded-xl px-3.5 py-2.5 text-[14px] transition-all duration-200 ease-in-out relative',
                                            isCollapsed && 'justify-center px-0'
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        {isSubActive && (
                                            <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-md" />
                                        )}
                                        <Icon
                                            className={clsx(
                                                isSubActive ? 'text-indigo-600' : 'text-slate-600 group-hover:text-slate-900',
                                                isCollapsed ? 'mx-0' : 'mr-3.5',
                                                'h-5 w-5 flex-shrink-0 transition-colors duration-200'
                                            )}
                                        />
                                        {!isCollapsed && (
                                            <div className="flex flex-1 justify-between items-center">
                                                <span>{item.name}</span>
                                                <span className="text-[10px] text-gray-400 font-normal">
                                                    {isExtensionsOpen ? '▼' : '►'}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                    {!isCollapsed && isExtensionsOpen && (
                                        <div className="pl-6 space-y-1">
                                            {item.subItems.map((sub, sIdx) => {
                                                const isSubItemActive = location.pathname === sub.href;
                                                const prefix = sIdx === item.subItems.length - 1 ? '└── ' : '├── ';
                                                return (
                                                    <Link
                                                        key={sub.name}
                                                        to={sub.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={clsx(
                                                            isSubItemActive
                                                                ? 'bg-indigo-50/90 border border-indigo-200/80 text-indigo-900 font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm font-mono'
                                                                : 'text-gray-500 hover:text-gray-900 font-mono py-2',
                                                            'flex items-center text-[13px] transition-colors'
                                                        )}
                                                    >
                                                        <span className="text-gray-400 mr-1.5 whitespace-pre">{prefix}</span>
                                                        <span>{sub.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsOpen(false)} // Close sidebar on link click (mobile)
                                className={clsx(
                                    isActive
                                        ? 'bg-indigo-50/90 border border-indigo-200/80 text-indigo-900 font-bold shadow-sm relative'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold border border-transparent',
                                    'group flex items-center rounded-xl px-3.5 py-2.5 text-[14px] transition-all duration-200 ease-in-out relative',
                                    isCollapsed && 'justify-center px-0'
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-md" />
                                )}
                                <Icon
                                    className={clsx(
                                        isActive ? 'text-indigo-600' : 'text-slate-600 group-hover:text-slate-900',
                                        isCollapsed ? 'mx-0' : 'mr-3.5',
                                        'h-5 w-5 flex-shrink-0 transition-colors duration-200'
                                    )}
                                />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-gray-100 p-4 shrink-0 bg-white">
                <Menu as="div" className="relative">
                    <Menu.Button className={clsx("group flex w-full items-center rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm", isCollapsed ? "justify-center text-center px-0" : "text-left")}>
                        <div className="h-9 w-9 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-extrabold shadow-sm ring-1 ring-primary-200 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-200">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-extrabold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs font-medium text-gray-500 truncate">{user?.tenant?.name || 'No Company'}</p>
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
                        <Menu.Items className="absolute bottom-[calc(100%+0.5rem)] left-0 w-full origin-bottom rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none overflow-hidden z-50 p-1">
                            <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(true);
                                                setIsOpen(false);
                                            }}
                                            className={clsx(
                                                active ? 'bg-gray-50 text-gray-900' : 'text-gray-700',
                                                'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-bold transition-colors'
                                            )}
                                        >
                                            <User className={clsx(
                                                active ? "text-primary-600" : "text-gray-400",
                                                "mr-3 h-4 w-4"
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
                                                active ? 'bg-red-50 text-red-700' : 'text-gray-700',
                                                'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-bold transition-colors mt-1'
                                            )}
                                        >
                                            <LogOut className={clsx(
                                                active ? "text-red-600" : "text-gray-400",
                                                "mr-3 h-4 w-4"
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
        </div>
    );
};

export default Sidebar;
