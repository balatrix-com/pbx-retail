import React, { useState, useEffect } from 'react';
import {
    X,
    Building2,
    Wallet,
    Phone,
    Check,
    ChevronRight,
    ChevronLeft,
    Loader,
    Eye,
    EyeOff,
    CreditCard,
    CheckCircle2,
    Plus,
    Minus,
    Package,
    Radio,
    HardDrive,
    Activity,
    AlertTriangle
} from 'lucide-react';
import api from '../../../services/api';
import { subscriptionService } from '../../../services/subscription.service';

const STEPS = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Wallet Funding', icon: Wallet },
    { number: 3, title: 'Subscription Plan', icon: CreditCard },
];

const TenantWizard = ({ onClose, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState(null);
    const [createdTenantId, setCreatedTenantId] = useState(null);
    const [walletFunded, setWalletFunded] = useState(false);
    const [tenantName, setTenantName] = useState('');
    const [customerCode, setCustomerCode] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [isValidationError, setIsValidationError] = useState(false);

    // Step 1: Basic Info
    const [basicInfo, setBasicInfo] = useState({
        customerType: 'company',
        firstName: '',
        lastName: '',
        companyName: '',
        companyTaxId: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'USA',
        creditLimit: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Step 2: Wallet
    const [walletAmount, setWalletAmount] = useState(10); // Default $10
    const [walletDescription, setWalletDescription] = useState('Initial Funding');

    // Step 3: Subscription Plan & Add-ons
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [catalog, setCatalog] = useState([]);
    const [addonQuantities, setAddonQuantities] = useState({});

    // Load subscription plans and add-on catalog when step 3 is active
    useEffect(() => {
        if (currentStep === 3 && plans.length === 0) {
            loadSubscriptionData();
        }
    }, [currentStep]);

    const loadSubscriptionData = async () => {
        setPlansLoading(true);
        try {
            const [plansData, catalogData] = await Promise.all([
                subscriptionService.getPlans(),
                Promise.resolve([])
            ]);
            const availablePlans = (plansData || []).filter(p => !p.plan_category || p.plan_category === 'base');
            setPlans(availablePlans);
            if (availablePlans.length > 0 && !selectedPlanId) {
                setSelectedPlanId(availablePlans[0].plan_id || availablePlans[0].id || availablePlans[0].name);
            }
            setCatalog(catalogData || []);
        } catch (err) {
            console.error('Failed to load subscription data:', err);
        } finally {
            setPlansLoading(false);
        }
    };

    const handleAddonQtyChange = (addonId, delta) => {
        setAddonQuantities(prev => {
            const current = prev[addonId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const updated = { ...prev };
                delete updated[addonId];
                return updated;
            }
            return { ...prev, [addonId]: next };
        });
    };

    const handleAddonQtyInput = (addonId, val) => {
        const parsed = parseInt(val, 10);
        const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
        setAddonQuantities(prev => {
            if (qty === 0) {
                const updated = { ...prev };
                delete updated[addonId];
                return updated;
            }
            return { ...prev, [addonId]: qty };
        });
    };

    const getAddonIcon = (addonType = '') => {
        const type = String(addonType).toLowerCase();
        const iconClasses = "h-4 w-4 text-indigo-600 dark:text-indigo-400";
        switch (type) {
            case 'ext':
            case 'extension':
                return <Radio className={iconClasses} />;
            case 'tfn':
            case 'did':
                return <Phone className={iconClasses} />;
            case 'storage':
                return <HardDrive className={iconClasses} />;
            case 'mon':
                return <Activity className={iconClasses} />;
            default:
                return <Package className={iconClasses} />;
        }
    };

    // --- Step Validations & Navigation (Client-side Only) ---

    const isStep1Valid = () => {
        if (!basicInfo.firstName || !basicInfo.lastName || !basicInfo.adminEmail || !basicInfo.adminPassword || !basicInfo.confirmPassword || !basicInfo.phone || !basicInfo.address || basicInfo.address.length < 10 || !basicInfo.city || !basicInfo.state || !basicInfo.country) {
            return false;
        }
        if (basicInfo.customerType === 'company') {
            if (!basicInfo.companyName || !basicInfo.companyTaxId) {
                return false;
            }
        }
        return true;
    };

    const validateStep1 = () => {
        const missingFields = [];

        // Password match check (show immediately, not as a "missing field")
        if (basicInfo.adminPassword && basicInfo.confirmPassword && basicInfo.adminPassword !== basicInfo.confirmPassword) {
            setError('Passwords do not match. Please ensure both passwords are identical.');
            setIsValidationError(true);
            return false;
        }

        // Company-specific fields
        if (basicInfo.customerType === 'company') {
            if (!basicInfo.companyName?.trim()) missingFields.push('Company Name');
            if (!basicInfo.companyTaxId?.trim()) missingFields.push('Company Tax ID');
        }

        // Personal details
        if (!basicInfo.firstName?.trim()) missingFields.push('First Name');
        if (!basicInfo.lastName?.trim()) missingFields.push('Last Name');
        if (!basicInfo.adminEmail?.trim()) missingFields.push('Email');
        if (!basicInfo.adminPassword) missingFields.push('Password');
        if (!basicInfo.confirmPassword) missingFields.push('Confirm Password');
        if (!basicInfo.phone?.trim()) missingFields.push('Phone');

        // Address validation
        if (!basicInfo.address || basicInfo.address.trim().length < 10) {
            missingFields.push('Address (min 10 characters)');
        }

        if (!basicInfo.city?.trim()) missingFields.push('City');
        if (!basicInfo.state?.trim()) missingFields.push('State');
        if (!basicInfo.country) missingFields.push('Country');

        if (missingFields.length > 0) {
            const message = missingFields.length === 1
                ? `Please fill in the required field: ${missingFields[0]}`
                : `Please fill in the following required fields: ${missingFields.join(', ')}`;
            setError(message);
            setIsValidationError(true);
            return false;
        }

        setError(null);
        setIsValidationError(false);
        return true;
    };

    const handleStep1Next = (e) => {
        if (e) e.preventDefault();
        if (!validateStep1()) {
            // Trigger shake animation
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 500);
            return;
        }
        setError(null);
        setIsValidationError(false);
        setCurrentStep(2);
    };

    const handleStep2Next = (e) => {
        if (e) e.preventDefault();
        if (walletAmount !== '' && Number(walletAmount) < 0) {
            setError('Wallet funding amount cannot be negative');
            return;
        }
        setError(null);
        setCurrentStep(3);
    };

    // --- Final Sequential Submission: Tenant -> Wallet -> Subscription ---

    const handleFinalSubmit = async (skipSubscription = false) => {
        if (!validateStep1()) {
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 500);
            setCurrentStep(1);
            return;
        }

        setLoading(true);
        setError(null);

        let tenantId = createdTenantId;
        let finalTenantName = tenantName;

        try {
            // 1. Create Tenant (if not already created in a previous partial attempt)
            if (!tenantId) {
                setStatusMessage('Creating tenant...');
                const { confirmPassword, ...data } = basicInfo;
                if (data.customerType === 'individual') {
                    delete data.companyName;
                    delete data.companyTaxId;
                }
                const res = await api.post('/tenants', data);
                const t = res.data?.tenant || res.data;
                tenantId = t?.id;
                finalTenantName = t?.name || basicInfo.companyName || `${basicInfo.firstName} ${basicInfo.lastName}`;
                setCreatedTenantId(tenantId);
                setTenantName(finalTenantName);
                setCustomerCode(t?.customerCode);
            }

            // 2. Fund Wallet (if walletAmount is provided and > 0)
            const fundingAmount = Number(walletAmount);
            if (fundingAmount > 0 && !walletFunded) {
                setStatusMessage('Funding wallet...');
                await api.post('/wallet/internal-adjust', {
                    targetTenantId: tenantId,
                    amount: fundingAmount,
                    type: 'CREDIT',
                    description: walletDescription || 'Initial Funding',
                    operationKey: `onboarding-funding:${tenantId}`
                });
                setWalletFunded(true);
            }

            // 3. Configure Subscription (if not skipped and plan selected)
            if (!skipSubscription) {
                if (selectedPlanId) {
                    setStatusMessage('Configuring subscription plan...');
                    await subscriptionService.switchPlan(tenantId, selectedPlanId, true);
                }

                // Provision selected add-ons
                const activeAddons = Object.entries(addonQuantities).filter(([, qty]) => qty > 0);
                if (activeAddons.length > 0) {
                    setStatusMessage('Provisioning add-ons...');
                    for (const [addonId, qty] of activeAddons) {
                        await subscriptionService.purchaseAddon(tenantId, addonId, qty);
                    }
                }
            }

            setStatusMessage('Tenant created successfully!');
            if (onSuccess) {
                onSuccess({ id: tenantId, name: finalTenantName });
            }
        } catch (err) {
            console.error('Tenant creation sequence failed:', err);
            const msg = err.response?.data?.message || err.message || 'Failed during tenant creation sequence';
            setError(msg);
            setIsValidationError(false);  // API error, not validation
        } finally {
            setLoading(false);
            setStatusMessage('');
        }
    };


    // Common input styling for both modes
    const inputClass = "w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-400 transition-all shadow-2xs";

    // --- Renderers ---

    const renderStep1 = () => (
        <div className="space-y-4">
            {/* Top Bar: Profile banner + Entity Type pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 size={18} />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-teal-950 dark:text-teal-200 font-display">Tenant Account Profile</h4>
                        <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 font-sans">Set up organization identity, admin credentials, and telecom service limits.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="text-[10px] font-extrabold text-teal-900 dark:text-teal-200 uppercase tracking-widest font-mono">Entity:</span>
                    <div className="flex items-center p-1 bg-white dark:bg-[#0c0e17] rounded-xl border border-teal-200/70 dark:border-white/10 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setBasicInfo({ ...basicInfo, customerType: 'company' })}
                            className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${basicInfo.customerType === 'company' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Company
                        </button>
                        <button
                            type="button"
                            onClick={() => setBasicInfo({ ...basicInfo, customerType: 'individual' })}
                            className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${basicInfo.customerType === 'individual' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Individual
                        </button>
                    </div>
                </div>
            </div>

            {/* 2-Column Responsive Form Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Column 1: Identity & Credentials */}
                <div className="space-y-4">
                    {/* Company Identity (if company) */}
                    {basicInfo.customerType === 'company' && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                <span className="w-2 h-2 rounded-full bg-teal-500" />
                                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                                    Company Identification
                                </h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                        Company Legal Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="tenant_company_name"
                                        autoComplete="off"
                                        className={inputClass}
                                        value={basicInfo.companyName}
                                        onChange={e => setBasicInfo({ ...basicInfo, companyName: e.target.value })}
                                        placeholder="e.g. Apex Global Logistics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                        Tax ID / EIN <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="tenant_company_tax_id"
                                        autoComplete="off"
                                        className={inputClass}
                                        value={basicInfo.companyTaxId}
                                        onChange={e => setBasicInfo({ ...basicInfo, companyTaxId: e.target.value })}
                                        placeholder="e.g. 12-3456789"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Administrator & Credentials */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                                Primary Administrator & Access
                            </h5>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    First Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenant_admin_first_name"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.firstName}
                                    onChange={e => setBasicInfo({ ...basicInfo, firstName: e.target.value })}
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Last Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenant_admin_last_name"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.lastName}
                                    onChange={e => setBasicInfo({ ...basicInfo, lastName: e.target.value })}
                                    placeholder="Doe"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Admin Email <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="tenant_admin_email"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.adminEmail}
                                    onChange={e => setBasicInfo({ ...basicInfo, adminEmail: e.target.value })}
                                    placeholder="admin@domain.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="tenant_admin_password"
                                        autoComplete="new-password"
                                        className={`${inputClass} pr-9 font-mono`}
                                        value={basicInfo.adminPassword}
                                        onChange={e => setBasicInfo({ ...basicInfo, adminPassword: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Confirm Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="tenant_confirm_password"
                                        autoComplete="new-password"
                                        className={`${inputClass} pr-9 font-mono`}
                                        value={basicInfo.confirmPassword}
                                        onChange={e => setBasicInfo({ ...basicInfo, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Telecom Limits & Physical Address */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                                Telecom Limits & Physical Location
                            </h5>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Credit Limit ($)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                    <input
                                        type="number"
                                        name="tenant_credit_limit"
                                        autoComplete="off"
                                        className={`${inputClass} pl-7 font-mono`}
                                        value={basicInfo.creditLimit}
                                        onChange={e => setBasicInfo({ ...basicInfo, creditLimit: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                        step="any"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Phone Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="tenant_phone"
                                    autoComplete="off"
                                    className={`${inputClass} font-mono`}
                                    value={basicInfo.phone}
                                    onChange={e => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                                    placeholder="e.g. +1 555 123 4567"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Country <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    className={inputClass}
                                    value={basicInfo.country}
                                    onChange={e => setBasicInfo({ ...basicInfo, country: e.target.value })}
                                >
                                    <option value="USA">United States</option>
                                    <option value="CAD">Canada</option>
                                    <option value="IND">India</option>
                                    <option value="PAK">Pakistan</option>
                                    <option value="PHI">Philippines</option>
                                    <option value="BNG">Bangladesh</option>
                                    <option value="OTHER">Other Region</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    Street Address <span className="text-rose-500">*</span> <span className="text-[10px] text-slate-400 font-normal">(min 10 characters)</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenant_address"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.address}
                                    onChange={e => setBasicInfo({ ...basicInfo, address: e.target.value })}
                                    placeholder="123 Business Way, Suite 400"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    City <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenant_city"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.city}
                                    onChange={e => setBasicInfo({ ...basicInfo, city: e.target.value })}
                                    placeholder="San Francisco"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 font-sans">
                                    State / Province <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenant_state"
                                    autoComplete="off"
                                    className={inputClass}
                                    value={basicInfo.state}
                                    onChange={e => setBasicInfo({ ...basicInfo, state: e.target.value })}
                                    placeholder="CA"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-2">
                        <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                        <span>All provisioned credentials undergo real-time validation upon completion.</span>
                    </div>
                </div>

            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-5 max-w-2xl mx-auto py-1">
            {/* Hero Card for Funding */}
            <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 text-white shadow-lg shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                        <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-white/20 text-teal-100 border border-white/20 mb-1.5">
                            Initial Float Provisioning
                        </span>
                        <h4 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                            Fund Tenant Operational Balance
                        </h4>
                        <p className="text-xs text-teal-100/90 mt-0.5 font-sans leading-relaxed">
                            Deposit starting float into the tenant's internal ledger to allow softphones and outbound SIP services to establish immediate live testing calls.
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactive Amount Inputs */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 font-mono">
                        Select Preset or Custom Float ($ USD)
                    </label>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {[0, 10, 25, 50].map((amt) => {
                            const isSelected = Number(walletAmount) === amt;
                            return (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setWalletAmount(amt)}
                                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all border cursor-pointer ${
                                        isSelected
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25 ring-2 ring-teal-500/20'
                                            : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-teal-500/50 hover:bg-white dark:hover:bg-white/[0.06]'
                                    }`}
                                >
                                    {amt === 0 ? '$0 (Skip)' : `$${amt}`}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">$</span>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-9 pr-4 py-2.5 text-base font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-2xs"
                            value={walletAmount}
                            onChange={e => setWalletAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                        Accounting Transaction Note
                    </label>
                    <input
                        type="text"
                        className={inputClass}
                        value={walletDescription}
                        onChange={e => setWalletDescription(e.target.value)}
                        placeholder="e.g. Initial Setup Credit, Promo Deposit"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-sans">
                        Recorded as an audit memo in the tenant's internal transaction ledger.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => {
        const selectedPlan = plans.find(p => (p.plan_id || p.id || p.name) === selectedPlanId) || plans[0];
        const planPrice = Number(selectedPlan?.amount || selectedPlan?.price || 0);

        const addonsTotal = Object.entries(addonQuantities).reduce((sum, [addonId, qty]) => {
            const item = catalog.find(c => c.addon_id === addonId);
            const price = Number(item?.unit_price || item?.price || 0);
            return sum + (price * qty);
        }, 0);

        const totalMonthlyCost = planPrice + addonsTotal;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            Select Subscription Package & Add-ons
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                            Choose base tier resources and optional starting add-on packages.
                        </p>
                    </div>
                </div>

                {plansLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader className="h-7 w-7 animate-spin text-teal-600 dark:text-teal-400" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Section A: Base Subscription Plans */}
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {plans.map((p) => {
                                    const pId = p.plan_id || p.id || p.name;
                                    const isSelected = selectedPlanId === pId;
                                    return (
                                        <div
                                            key={pId}
                                            onClick={() => setSelectedPlanId(pId)}
                                            className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between relative overflow-hidden ${isSelected
                                                ? 'border-teal-500 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-950/20 ring-2 ring-teal-500/25 shadow-sm'
                                                : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c0e17] hover:border-slate-300 dark:hover:border-white/20'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none overflow-hidden">
                                                    <div className="absolute transform rotate-45 bg-teal-600 text-white text-[8px] font-bold py-0.5 right-[-32px] top-[12px] w-[100px] text-center font-mono uppercase tracking-wider">
                                                        Selected
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-display">
                                                        {p.name}
                                                    </h4>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                                    </div>
                                                </div>

                                                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mb-2.5">
                                                    ${Number(p.amount || p.price || 0).toFixed(2)}
                                                    <span className="text-[11px] text-slate-400 font-normal font-sans"> / mo</span>
                                                </div>

                                                <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 font-sans">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                        <span><strong>{p.extensions ?? p.maxExtensions ?? 0}</strong> SIP Extensions</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                        <span><strong>{p.numbers ?? p.maxNumbers ?? 0}</strong> Direct DIDs</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                        <span><strong>{p.monitoring_extensions ?? p.maxMonitoringExtensions ?? 0}</strong> Supervisor Seats</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section B: Capacity Add-ons */}
                        {catalog.length > 0 && (
                            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
                                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                                        Optional Capacity Add-ons
                                    </h5>
                                    <span className="text-[11px] text-slate-400 font-medium">Added to recurring allocation</span>
                                </div>

                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {catalog.map((addon) => {
                                        const qty = addonQuantities[addon.addon_id] || 0;
                                        const isChecked = qty > 0;
                                        return (
                                            <div
                                                key={addon.addon_id}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isChecked
                                                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-500/30'
                                                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 shrink-0">
                                                        {getAddonIcon(addon.resource_type || addon.addon_type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h6 className="text-xs font-bold text-slate-900 dark:text-white truncate font-display">
                                                                {addon.name}
                                                            </h6>
                                                            {addon.units_count > 1 && (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 font-mono">
                                                                    {addon.units_count} Units
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-sans">
                                                            {addon.description || `Type: ${addon.resource_type || 'addon'}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2.5 shrink-0">
                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                                        ${Number(addon.unit_price || addon.price || 0).toFixed(2)}
                                                        <span className="text-[10px] text-slate-400 font-normal font-sans">/mo</span>
                                                    </span>

                                                    {/* Stepper */}
                                                    <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#121420]">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddonQtyChange(addon.addon_id, -1)}
                                                            disabled={qty <= 0 || loading}
                                                            className="px-1.5 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                                        >
                                                            <Minus size={11} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="50"
                                                            disabled={loading}
                                                            value={qty}
                                                            onChange={(e) => handleAddonQtyInput(addon.addon_id, e.target.value)}
                                                            className="w-8 text-center text-xs font-mono font-bold py-0.5 bg-transparent text-slate-900 dark:text-white border-x border-slate-200 dark:border-white/10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddonQtyChange(addon.addon_id, 1)}
                                                            disabled={loading}
                                                            className="px-1.5 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                                                        >
                                                            <Plus size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Summary Block */}
                        <div className="p-4 rounded-2xl bg-slate-900 dark:bg-black border border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                            <div>
                                <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest block font-mono">
                                    Configured Provisioning Order
                                </span>
                                <div className="text-xs sm:text-sm font-bold text-white mt-0.5 font-display">
                                    {selectedPlan?.name || 'Selected Base Plan'}
                                    {addonsTotal > 0 && ` + ${Object.values(addonQuantities).reduce((a, b) => a + b, 0)} capacity add-on(s)`}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-sans">Total Estimated Monthly Rate</span>
                                <span className="text-xl font-mono font-black text-emerald-400">
                                    ${totalMonthlyCost.toFixed(2)}
                                    <span className="text-xs text-slate-400 font-sans font-normal"> / month</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
            
            <div className="bg-[#f8fafc] dark:bg-[#07090e] rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[820px] overflow-hidden flex flex-col border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5 transition-all">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-[#081816] dark:via-[#0c2621] dark:to-[#081816] px-6 py-4 text-white border-b border-teal-500/30 dark:border-teal-500/20 shrink-0">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/10 dark:bg-teal-500/10 blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-white/15 dark:bg-teal-500/20 backdrop-blur-md border border-white/20 dark:border-teal-400/30 flex items-center justify-center shadow-lg text-white shrink-0">
                                <Building2 size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white font-display">
                                        New Tenant Provisioning
                                    </h2>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono uppercase tracking-wider bg-white/20 text-white border border-white/25">
                                        Step {currentStep} of 3
                                    </span>
                                </div>
                                <p className="text-teal-100/90 dark:text-teal-200/80 text-[11px] font-medium font-sans mt-0.5">
                                    Configure customer identity, seed wallet float, and assign telecom packages
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl p-2 text-white/80 hover:text-white hover:bg-white/20 transition-all focus:outline-none cursor-pointer disabled:opacity-40"
                            title="Close Wizard"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Horizontal Segmented Stepper */}
                <div className="bg-white/95 dark:bg-[#0b0d14]/95 border-b border-slate-200/80 dark:border-white/10 px-6 py-2.5 shrink-0 backdrop-blur-md select-none">
                    <div className="flex items-center justify-between max-w-xl mx-auto gap-3">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.number;
                            const isCompleted = currentStep > step.number;
                            return (
                                <React.Fragment key={step.number}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (step.number < currentStep || (step.number === 2 && validateStep1())) {
                                                setError(null);
                                                setCurrentStep(step.number);
                                            }
                                        }}
                                        disabled={loading || (step.number > currentStep && step.number !== 2)}
                                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/20'
                                                : isCompleted
                                                    ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20'
                                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : isCompleted
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {isCompleted ? <Check size={12} strokeWidth={3} /> : step.number}
                                        </div>
                                        <span className="text-xs font-bold font-display whitespace-nowrap">
                                            {step.title}
                                        </span>
                                    </button>

                                    {idx < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 rounded-full transition-all ${
                                            currentStep > step.number
                                                ? 'bg-teal-500'
                                                : 'bg-slate-200 dark:bg-white/10'
                                        }`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Content Canvas (Scrollable area) */}
                <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] dark:bg-[#06080d]">
                    {error && !(currentStep === 1 && isValidationError) && (
                        <div
                            className={`mb-4 p-3 rounded-2xl border text-xs font-semibold flex justify-between items-start transition-all ${isValidationError
                                ? `bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 ${showWarning ? 'animate-shake' : ''}`
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {isValidationError && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={() => { setError(null); setIsValidationError(false); }}
                                className="shrink-0 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>

                {/* Fixed Wizard Bottom Action Bar (Never cut off or hidden) */}
                <div className="px-6 py-3.5 bg-white dark:bg-[#0c0e17] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0">
                    <div>
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={() => { setError(null); setCurrentStep(prev => prev - 1); }}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                        ) : (
                            <span className="text-[11px] text-slate-400 font-sans">
                                All fields marked with <span className="text-rose-500">*</span> are mandatory
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {currentStep === 2 && (
                            <button
                                type="button"
                                onClick={() => { setError(null); setCurrentStep(3); }}
                                className="px-3.5 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Skip Funding
                            </button>
                        )}
                        {currentStep === 3 && (
                            <button
                                type="button"
                                onClick={() => handleFinalSubmit(true)}
                                disabled={loading}
                                className="px-3.5 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Skip Subscription
                            </button>
                        )}

                        {currentStep === 1 && (
                            <button
                                type="button"
                                onClick={handleStep1Next}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/25 transition-all active:scale-95 cursor-pointer"
                            >
                                Continue to Wallet Funding <ChevronRight size={15} />
                            </button>
                        )}
                        {currentStep === 2 && (
                            <button
                                type="button"
                                onClick={handleStep2Next}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/25 transition-all active:scale-95 cursor-pointer"
                            >
                                Next: Choose Subscription <ChevronRight size={15} />
                            </button>
                        )}
                        {currentStep === 3 && (
                            <button
                                type="button"
                                onClick={() => handleFinalSubmit(false)}
                                disabled={loading || plansLoading}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={14} />
                                        <span>{statusMessage || 'Provisioning Tenant...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} strokeWidth={2.5} />
                                        <span>Complete Provisioning</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantWizard;
