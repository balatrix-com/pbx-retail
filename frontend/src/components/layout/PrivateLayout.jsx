import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import BlockedScreen from '../BlockedScreen';
import ImpersonationBanner from './ImpersonationBanner';
import CommandPalette from './CommandPalette';
import ZohoChatWidget from './ZohoChatWidget';

const PrivateLayout = ({ allowedRoles }) => {
    const { isBlocked } = useAuth();

    // If user is blocked, show blocked screen instead of normal layout
    if (isBlocked) {
        return <BlockedScreen />;
    }

    return (
        <ProtectedRoute allowedRoles={allowedRoles}>
            <CommandPalette />
            <ImpersonationBanner />
            <ZohoChatWidget />
            <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#030712] overflow-hidden relative">
                {/* Ambient Decorative Background Waves matching reference */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-teal-200/25 via-emerald-100/15 to-transparent dark:from-teal-900/20 dark:via-emerald-950/15 blur-3xl opacity-70 animate-pulse duration-1000" />
                    <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-teal-200/20 via-sky-100/15 to-transparent dark:from-teal-900/15 dark:via-sky-950/10 blur-3xl opacity-60" />
                    <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-cyan-200/20 via-teal-100/15 to-transparent dark:from-cyan-900/15 dark:via-teal-950/10 blur-3xl opacity-50" />
                </div>

                {/* Unified Single Header Bar (with Brand, Status, Navigation Links, and User Actions) */}
                <Header />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 font-sans relative z-10">
                    <Outlet />
                </main>
            </div>
        </ProtectedRoute>
    );
};

export default PrivateLayout;
