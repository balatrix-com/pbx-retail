import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

const ImpersonationBanner = () => {
    const { isImpersonating, exitImpersonation, user } = useAuth();

    if (!isImpersonating) return null;

    return (
        <div className="bg-orange-600 text-white px-6 py-3 flex justify-between items-center shadow-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <span className="text-2xl">🎭</span>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider opacity-90">Impersonation Mode</h3>
                    <p className="text-sm">
                        You are logged in as <strong className="font-mono bg-orange-700 px-1 rounded">{user?.email}</strong>
                    </p>
                </div>
            </div>
            <button
                onClick={exitImpersonation}
                className="bg-white text-orange-700 hover:bg-orange-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
                <LogOut size={16} />
                Exit Session
            </button>
        </div>
    );
};

export default ImpersonationBanner;
