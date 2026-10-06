import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Command, User, Building, Phone,
    Settings, FileText, LayoutDashboard, LogOut, ArrowRight, Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './CommandPalette.css';

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const inputRef = useRef(null);
    const resultContainerRef = useRef(null);
    const navigate = useNavigate();
    const { user, isSuperAdmin, logout } = useAuth();

    // Hotkey Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        } else {
            // Focus input next tick
            setTimeout(() => inputRef.current?.focus(), 50);
            // Load initial static actions
            updateResults('');
        }
    }, [isOpen]);

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) updateResults(query);
        }, 200); // Debounce
        return () => clearTimeout(timer);
    }, [query, isOpen]);

    // Keyboard Navigation
    useEffect(() => {
        const handleNav = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
                scrollSelectedIntoView(selectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
                scrollSelectedIntoView(selectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeResult(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, results, selectedIndex]);

    const scrollSelectedIntoView = (index) => {
        // Simple scroll logic could be improved
        const el = resultContainerRef.current?.children[index];
        el?.scrollIntoView({ block: 'nearest' });
    };

    const updateResults = async (searchStr) => {
        setLoading(true);
        const lowerQ = searchStr.toLowerCase();

        // 1. Static Navigation Actions
        const staticActions = [
            { id: 'nav-dashboard', type: 'navigation', label: 'Go to Dashboard', icon: LayoutDashboard, path: '/platform' },
            { id: 'nav-users', type: 'navigation', label: 'Go to Users', icon: User, path: isSuperAdmin ? '/admin/users' : '/users' },
            { id: 'nav-audit', type: 'navigation', label: 'Go to Audit Logs', icon: FileText, path: '/admin/audit-logs', requiredRole: 'SUPER_ADMIN' },
            { id: 'nav-carriers', type: 'navigation', label: 'Go to Carriers & Gateways', icon: Server, path: '/super-admin/carriers', requiredRole: 'SUPER_ADMIN' },
            { id: 'nav-profile', type: 'navigation', label: 'Profile Settings', icon: Settings, path: '/profile' },
            { id: 'nav-logout', type: 'action', label: 'Logout', icon: LogOut, action: () => logout() },
        ].filter(item => {
            if (item.requiredRole === 'SUPER_ADMIN' && !isSuperAdmin) return false;
            return item.label.toLowerCase().includes(lowerQ);
        });

        // 2. Dynamic Results (Users, Tenants)
        let dynamicResults = [];

        if (searchStr.length > 1 && isSuperAdmin) {
            try {
                // Parallel fetching
                const [usersRes, tenantsRes] = await Promise.all([
                    api.get(`/users?search=${searchStr}&limit=5`),
                    api.get(`/tenants?search=${searchStr}&limit=5`)
                ]);

                const users = (usersRes.data.data || []).map(u => ({
                    id: `user-${u.id}`,
                    type: 'user',
                    label: u.email,
                    subLabel: u.name,
                    icon: User,
                    data: u
                }));

                const tenants = (tenantsRes.data.data || []).map(t => ({
                    id: `tenant-${t.id}`,
                    type: 'tenant',
                    label: t.name,
                    subLabel: `Tenant ID: ${t.id}`,
                    icon: Building,
                    data: t
                }));

                dynamicResults = [...users, ...tenants];
            } catch (err) {
                console.error("Search failed", err);
            }
        }

        setResults([...staticActions, ...dynamicResults]);
        setSelectedIndex(0);
        setLoading(false);
    };

    const executeResult = (item) => {
        if (!item) return;

        if (item.type === 'navigation') {
            navigate(item.path);
        } else if (item.type === 'action') {
            item.action();
        } else if (item.type === 'user') {
            // Navigate to user edit or list?
            // For now, go to users list with search? Or impersonate directly?
            // Let's go to users page filtering for them?
            // Better: Open User Edit Modal? We don't have global modal state easily accessible.
            // Let's navigate to /admin/users?search=EMAIL
            navigate(`/admin/users?search=${item.label}`);
        } else if (item.type === 'tenant') {
            // Navigate to tenants list?
            // Actually, we can open Tenant Detail Modal?
            // But again, modal state is local to PlatformDashboard.
            // So we navigate to /platform?search=TENANT_NAME ideally.
            // Or just /platform.
            navigate('/platform');
            // In a real app we'd want deeplinking like /platform/tenants/:id
        }

        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
            <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="cp-header">
                    <Search className="cp-search-icon" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="cp-input"
                    />
                    <div className="cp-badge">ESC</div>
                </div>

                <div className="cp-body" ref={resultContainerRef}>
                    {results.length === 0 ? (
                        <div className="cp-empty">
                            {loading ? 'Searching...' : 'No results found.'}
                        </div>
                    ) : (
                        results.map((item, index) => (
                            <div
                                key={item.id}
                                className={`cp-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => executeResult(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="cp-item-icon">
                                    <item.icon size={18} />
                                </div>
                                <div className="cp-item-content">
                                    <div className="cp-item-label">{item.label}</div>
                                    {item.subLabel && <div className="cp-item-sub">{item.subLabel}</div>}
                                </div>
                                {index === selectedIndex && <ArrowRight size={16} className="cp-enter-icon" />}
                            </div>
                        ))
                    )}
                </div>

                <div className="cp-footer">
                    <span>ProTip: Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>↵</kbd> to select</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
