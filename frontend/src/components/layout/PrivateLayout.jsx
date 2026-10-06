import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import BlockedScreen from '../BlockedScreen';
import ImpersonationBanner from './ImpersonationBanner';
import CommandPalette from './CommandPalette';
import ZohoChatWidget from './ZohoChatWidget';

const PrivateLayout = ({ allowedRoles }) => {
    const { isBlocked } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    // If user is blocked, show blocked screen instead of normal layout
    if (isBlocked) {
        return <BlockedScreen />;
    }

    return (
        <ProtectedRoute allowedRoles={allowedRoles}>
            <CommandPalette />
            <ImpersonationBanner />
            <ZohoChatWidget />
            <div className="flex h-screen bg-gray-50 overflow-hidden">
                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 z-40 bg-gray-600/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                
                <div className="flex flex-1 flex-col overflow-hidden w-full">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 font-sans">
                        <Outlet />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default PrivateLayout;
