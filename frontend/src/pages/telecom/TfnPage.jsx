import React, { useState, useEffect } from 'react';
import { telecomService } from '../../services/telecom.service';
import { walletService } from '../../services/wallet.service';
import { usageService } from '../../services/usage.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Phone, ChevronRight } from 'lucide-react';
import RoutingModal from '../../components/telecom/RoutingModal';

const TfnPage = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [myNumbers, setMyNumbers] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [serviceState, setServiceState] = useState('SERVICE_ACTIVE');

    // Routing Modal State
    const [routingModalOpen, setRoutingModalOpen] = useState(false);
    const [selectedTfn, setSelectedTfn] = useState(null);

    const formatPhoneNumber = (numberString) => {
        if (!numberString) return '';

        const cleaned = ('' + numberString).replace(/\D/g, '');

        // Handle 11 digits with 1 prefix
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);

            if (match) {
                return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
            }
        }

        // Handle 10 digits
        if (cleaned.length === 10) {
            const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

            if (match) {
                return `(${match[1]}) ${match[2]}-${match[3]}`;
            }
        }

        return numberString;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [w, state, myTfns] = await Promise.all([
                    walletService.getWallet(user.tenantId),
                    usageService.getServiceState(),
                    telecomService.getMyTfns()
                ]);

                setWalletBalance(w.balance);
                setServiceState(state);
                setMyNumbers(myTfns || []);
            } catch (e) {
                console.error(e);
            }
        };

        if (user?.tenantId) {
            loadData();
        }
    }, [user]);

    // Open routing modal by clicking the number/card
    const openRouting = (tfn) => {
        setSelectedTfn(tfn);
        setRoutingModalOpen(true);
    };

    const handleRoutingUpdate = (updatedTfn) => {
        setMyNumbers(prevNumbers =>
            prevNumbers.map(n =>
                n.id === updatedTfn.id ? updatedTfn : n
            )
        );
    };

    return (
        <div className="min-h-full space-y-6">

            {/* =========================================
                PAGE HEADER
            ========================================= */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">

                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Phone Numbers (TFN)
                    </h1>

                    <p className="text-slate-600 dark:text-blue-300/80 mt-1.5 font-medium">
                        Manage your toll-free numbers and inbound routing.
                    </p>
                </div>

                {/* Wallet Balance */}
                <div className="flex justify-start sm:justify-end">
                    <span
                        className="
                            text-sm
                            text-gray-700
                            dark:text-slate-300
                            font-mono
                            bg-white
                            dark:bg-[#0d0e13]
                            border
                            border-gray-200
                            dark:border-white/[0.08]
                            px-3.5
                            py-2
                            rounded-lg
                            shadow-sm
                            dark:shadow-lg
                        "
                    >
                        Available Balance:

                        <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-2">
                            ${Number(walletBalance).toFixed(2)}
                        </span>
                    </span>
                </div>
            </div>


            {/* =========================================
                YOUR NUMBERS SECTION
            ========================================= */}
            <div
                className="
                    rounded-2xl
                    bg-white
                    dark:bg-[#090a0f]/80
                    border
                    border-gray-200/80
                    dark:border-white/[0.04]
                    shadow-sm
                    dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]
                    overflow-hidden
                "
            >

                {/* Section Header */}
                <div
                    className="
                        px-6
                        py-5
                        border-b
                        border-gray-100
                        dark:border-white/[0.06]
                        bg-gray-50/60
                        dark:bg-black/10
                    "
                >
                    <h3
                        className="
                            text-xs
                            font-extrabold
                            text-indigo-600
                            dark:text-blue-300/80
                            uppercase
                            tracking-widest
                        "
                    >
                        Your Numbers
                    </h3>
                </div>


                {/* =========================================
                    EMPTY STATE
                ========================================= */}
                {myNumbers.length === 0 ? (

                    <div className="p-8">
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                            You don't have any numbers yet.
                        </p>
                    </div>

                ) : (

                    /* =====================================
                       NUMBER CARDS
                    ===================================== */
                    <div
                        className="
                            grid
                            grid-cols-1
                            md:grid-cols-2
                            xl:grid-cols-3
                            gap-4
                            p-6
                        "
                    >
                        {myNumbers.map((n) => (

                            <button
                                key={n.number}
                                type="button"
                                onClick={() => openRouting(n)}
                                className="
                                    group
                                    relative
                                    text-left
                                    w-full
                                    min-h-[225px]

                                    rounded-xl

                                    bg-white
                                    dark:bg-gradient-to-br
                                    dark:from-[#11131b]
                                    dark:to-[#0d0f16]

                                    border
                                    border-gray-200
                                    dark:border-white/[0.09]

                                    p-6

                                    shadow-xs
                                    hover:shadow-md
                                    dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)]

                                    transition-all
                                    duration-300

                                    hover:-translate-y-1
                                    hover:border-indigo-500/40
                                    dark:hover:border-blue-500/30
                                    dark:hover:shadow-[0_15px_40px_rgba(0,0,0,0.35)]

                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-indigo-500/40
                                    dark:focus:ring-blue-500/40
                                "
                            >

                                {/* =================================
                                    TOP ROW
                                ================================= */}
                                <div className="flex items-start justify-between">

                                    {/* Phone Icon */}
                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-center

                                            w-14
                                            h-14

                                            rounded-xl

                                            bg-indigo-50
                                            dark:bg-blue-500/[0.10]

                                            border
                                            border-indigo-100
                                            dark:border-blue-400/[0.08]

                                            transition-all
                                            duration-300

                                            group-hover:bg-indigo-100
                                            dark:group-hover:bg-blue-500/[0.16]
                                        "
                                    >
                                        <Phone
                                            className="
                                                w-6
                                                h-6
                                                text-indigo-600
                                                dark:text-blue-400
                                                transition-transform
                                                duration-300
                                                group-hover:scale-110
                                            "
                                        />
                                    </div>


                                    {/* Active Status */}
                                    <span
                                        className="
                                            inline-flex
                                            items-center

                                            px-2.5
                                            py-1

                                            rounded-lg

                                            text-[10px]
                                            font-bold
                                            uppercase
                                            tracking-wider

                                            bg-emerald-50
                                            text-emerald-700
                                            border
                                            border-emerald-200/50
                                            dark:border-emerald-500/20
                                            dark:bg-emerald-950/40
                                            dark:text-emerald-400

                                            shadow-xs
                                        "
                                    >
                                        Active
                                    </span>
                                </div>


                                {/* =================================
                                    NUMBER
                                ================================= */}
                                <div className="flex items-center justify-between mt-6">

                                    <span
                                        className="
                                            text-xl
                                            lg:text-[21px]
                                            font-mono
                                            font-extrabold
                                            text-gray-900
                                            dark:text-white
                                            tracking-tight
                                        "
                                    >
                                        {formatPhoneNumber(n.number)}
                                    </span>

                                    {/* Chevron */}
                                    <ChevronRight
                                        className="
                                            w-5
                                            h-5
                                            flex-shrink-0

                                            text-gray-400
                                            dark:text-slate-400

                                            transition-all
                                            duration-300

                                            group-hover:text-indigo-600
                                            dark:group-hover:text-blue-400
                                            group-hover:translate-x-1
                                        "
                                    />

                                </div>


                                {/* =================================
                                    DIVIDER
                                ================================= */}
                                <div className="h-px bg-gray-100 dark:bg-white/[0.07] mt-5 mb-4" />


                                {/* =================================
                                    ROUTING
                                ================================= */}
                                <div className="text-sm">

                                    <span className="text-gray-500 dark:text-slate-400">
                                        Route:
                                    </span>

                                    <span className="text-indigo-600 dark:text-blue-400 ml-1 font-medium">
                                        {n.routeType
                                            ? `${n.routeType} ${n.forwardNumber || ''}`
                                            : 'Not configured'
                                        }
                                    </span>

                                </div>

                            </button>
                        ))}
                    </div>
                )}

            </div>


            {/* =========================================
                ROUTING MODAL
            ========================================= */}
            <RoutingModal
                isOpen={routingModalOpen}
                onClose={() => setRoutingModalOpen(false)}
                tfn={selectedTfn}
                onSave={handleRoutingUpdate}
            />

        </div>
    );
};

export default TfnPage;