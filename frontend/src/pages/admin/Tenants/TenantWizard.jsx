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
                subscriptionService.getCatalog()
            ]);
            const availablePlans = plansData || [];
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
            if (fundingAmount > 0) {
                setStatusMessage('Funding wallet...');
                await api.post('/wallet/internal-adjust', {
                    targetTenantId: tenantId,
                    amount: fundingAmount,
                    type: 'CREDIT',
                    description: walletDescription || 'Initial Funding'
                });
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


    // Common input styling for dark mode consistency
    const inputClass = "w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-all";

    // --- Renderers ---

    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tenant & Admin Details</h3>
            <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Tenant Type *</label>
                        <select
                            className={inputClass}
                            value={basicInfo.customerType}
                            onChange={e => setBasicInfo({ ...basicInfo, customerType: e.target.value })}
                        >
                            <option value="company">Company</option>
                            <option value="individual">Individual</option>
                        </select>
                    </div>
                </div>

                {basicInfo.customerType === 'company' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Company Name *</label>
                            <input
                                type="text"
                                name="tenant_company_name"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.companyName}
                                onChange={e => setBasicInfo({ ...basicInfo, companyName: e.target.value })}
                                placeholder="Acme Inc"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Company Tax ID *</label>
                            <input
                                type="text"
                                name="tenant_company_tax_id"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.companyTaxId}
                                onChange={e => setBasicInfo({ ...basicInfo, companyTaxId: e.target.value })}
                                placeholder="TAX-123456"
                            />
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <p className="text-xs text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Personal Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">First Name *</label>
                            <input
                                type="text"
                                name="tenant_admin_first_name"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.firstName}
                                onChange={e => setBasicInfo({ ...basicInfo, firstName: e.target.value })}
                                placeholder="First Name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Last Name *</label>
                            <input
                                type="text"
                                name="tenant_admin_last_name"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.lastName}
                                onChange={e => setBasicInfo({ ...basicInfo, lastName: e.target.value })}
                                placeholder="Last Name"
                            />
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Email *</label>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Password *</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="tenant_admin_password"
                                    autoComplete="new-password"
                                    className={`${inputClass} pr-10`}
                                    value={basicInfo.adminPassword}
                                    onChange={e => setBasicInfo({ ...basicInfo, adminPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Confirm Password *</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="tenant_confirm_password"
                                    autoComplete="new-password"
                                    className={`${inputClass} pr-10`}
                                    value={basicInfo.confirmPassword}
                                    onChange={e => setBasicInfo({ ...basicInfo, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <p className="text-xs text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Billing & Limits</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Credit Limit ($)</label>
                            <input
                                type="number"
                                name="tenant_credit_limit"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.creditLimit}
                                onChange={e => setBasicInfo({ ...basicInfo, creditLimit: e.target.value })}
                                placeholder="0.00"
                                min="0"
                                step="any"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Phone *</label>
                            <input
                                type="tel"
                                name="tenant_phone"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.phone}
                                onChange={e => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                                placeholder="1234567890"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Country *</label>
                            <select
                                className={inputClass}
                                value={basicInfo.country}
                                onChange={e => setBasicInfo({ ...basicInfo, country: e.target.value })}
                            >
                                <option value="USA">USA</option>
                                <option value="CAD">Canada</option>
                                <option value="IND">India</option>
                                <option value="PAK">Pakistan</option>
                                <option value="PHI">Philippines</option>
                                <option value="BNG">Bangladesh</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Address (min 10 chars) *</label>
                            <input
                                type="text"
                                name="tenant_address"
                                autoComplete="off"
                                className={inputClass}
                                value={basicInfo.address}
                                onChange={e => setBasicInfo({ ...basicInfo, address: e.target.value })}
                                placeholder="123 Main St, Suite 100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">City *</label>
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
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">State *</label>
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
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
                {error && isValidationError && (
                    <div
                        className={`p-3 rounded-xl border text-xs font-semibold flex justify-between items-start transition-all bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 ${showWarning ? 'animate-shake' : ''}`}
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                        <button
                            onClick={() => { setError(null); setIsValidationError(false); }}
                            className="flex-shrink-0 ml-2"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleStep1Next}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-primary-600/20 flex items-center gap-1.5 transition-all"
                    >
                        Next: Wallet Funding <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fund Wallet (Optional)</h3>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">Add initial credits to the tenant's wallet.</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Amount ($)</label>
                <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-bold">$</span>
                    <input
                        type="number"
                        min="0"
                        step="any"
                        className={`${inputClass} pl-8 text-base font-semibold`}
                        value={walletAmount}
                        onChange={e => setWalletAmount(e.target.value)}
                        placeholder="0.00"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">Description / Note</label>
                <input
                    type="text"
                    className={inputClass}
                    value={walletDescription}
                    onChange={e => setWalletDescription(e.target.value)}
                    placeholder="e.g. Initial Funding, Promo Credits"
                />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => { setError(null); setCurrentStep(1); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => { setError(null); setCurrentStep(3); }}
                        className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handleStep2Next}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-primary-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                    >
                        Next: Subscription Plan <ChevronRight size={16} />
                    </button>
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
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        Select Subscription Plan & Add-ons
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                        Choose the base billing plan and any starting resource add-ons for this tenant.
                    </p>
                </div>

                {plansLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Section A: Base Subscription Plans */}
                        <div>
                            <label className="text-xs font-extrabold text-gray-700 dark:text-slate-300 uppercase tracking-wider block mb-2.5">
                                Available Subscription Plans *
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {plans.map((p) => {
                                    const pId = p.plan_id || p.id || p.name;
                                    const isSelected = selectedPlanId === pId;
                                    return (
                                        <div
                                            key={pId}
                                            onClick={() => setSelectedPlanId(pId)}
                                            className={`cursor-pointer rounded-xl p-3.5 border transition-all flex flex-col justify-between ${isSelected
                                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 dark:ring-indigo-500/30 shadow-xs'
                                                : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
                                                }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {p.name}
                                                    </h4>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-600 dark:bg-indigo-500 text-white' : 'border-gray-300 dark:border-slate-700'}`}>
                                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                                    </div>
                                                </div>

                                                <div className="text-base font-extrabold font-mono text-gray-900 dark:text-white mb-2">
                                                    ${Number(p.amount || p.price || 0).toFixed(2)}
                                                    <span className="text-[10px] text-gray-500 dark:text-slate-400 font-normal font-sans"> / mo</span>
                                                </div>

                                                <ul className="space-y-1 text-[11px] text-gray-600 dark:text-slate-300">
                                                    <li className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                                                        <span><strong>{p.extensions || 1}</strong> SIP Extensions</span>
                                                    </li>
                                                    <li className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                                                        <span><strong>{p.free_mins || 0}</strong> Free Inbound Mins</span>
                                                    </li>
                                                    <li className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                                                        <span><strong>{p.tfns || 0}</strong> TFNs included</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section B: Capacity Add-ons */}
                        {catalog.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-extrabold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                                        Capacity Add-ons (Optional)
                                    </label>
                                    <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Add instant resources to this tenant</span>
                                </div>

                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-gray-100 dark:border-slate-800 rounded-xl p-2 bg-gray-50/50 dark:bg-slate-800/30">
                                    {catalog.map((addon) => {
                                        const qty = addonQuantities[addon.addon_id] || 0;
                                        const isChecked = qty > 0;
                                        return (
                                            <div
                                                key={addon.addon_id}
                                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isChecked
                                                    ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/70 shadow-xs'
                                                    : 'bg-white/80 dark:bg-slate-900/60 border-gray-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex-shrink-0">
                                                        {getAddonIcon(addon.resource_type || addon.addon_type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                                {addon.name}
                                                            </h5>
                                                            {addon.units_count > 1 && (
                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                                    {addon.units_count} Units / Pack
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                                                            {addon.description || `Type: ${addon.resource_type || 'addon'}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                                                        ${Number(addon.unit_price || addon.price || 0).toFixed(2)}
                                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal font-sans">/mo</span>
                                                    </span>

                                                    {/* Stepper */}
                                                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddonQtyChange(addon.addon_id, -1)}
                                                            disabled={qty <= 0 || loading}
                                                            className="px-2 py-1 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="50"
                                                            disabled={loading}
                                                            value={qty}
                                                            onChange={(e) => handleAddonQtyInput(addon.addon_id, e.target.value)}
                                                            className="w-10 text-center text-xs font-mono font-bold py-0.5 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border-x border-gray-200 dark:border-slate-700"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddonQtyChange(addon.addon_id, 1)}
                                                            disabled={loading}
                                                            className="px-2 py-1 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Section C: Summary Footer */}
                        <div className="p-3.5 rounded-xl bg-gray-900 dark:bg-slate-950 border border-transparent dark:border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">
                                    Configured Plan & Add-ons Summary
                                </span>
                                <div className="text-xs font-medium text-gray-200 dark:text-slate-200 mt-0.5">
                                    {selectedPlan?.name || 'Selected Plan'}
                                    {addonsTotal > 0 && ` + ${Object.values(addonQuantities).reduce((a, b) => a + b, 0)} add-on resource(s)`}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 dark:text-slate-400 block">Total Monthly Cost</span>
                                <span className="text-lg font-mono font-extrabold text-emerald-400">
                                    ${totalMonthlyCost.toFixed(2)}
                                    <span className="text-xs text-gray-300 dark:text-slate-400 font-sans font-normal"> / month</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => { setError(null); setCurrentStep(2); }}
                        disabled={loading}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleFinalSubmit(true)}
                            disabled={loading}
                            className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                        >
                            Skip Subscription
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFinalSubmit(false)}
                            disabled={loading || plansLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader className="animate-spin" size={14} />
                                    <span>{statusMessage || 'Creating Tenant...'}</span>
                                </>
                            ) : (
                                <>
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Create Tenant & Complete Setup</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-gray-200 dark:ring-slate-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/40">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-gray-900 dark:text-white text-base">New Tenant Wizard</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Create tenant, fund wallet, and configure subscription</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"><X size={18} /></button>
                </div>

                {/* Progress */}
                <div className="px-6 py-3.5 border-b border-gray-100 dark:border-slate-800 flex justify-between select-none">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.number;
                        const isCompleted = currentStep > step.number;
                        return (
                            <div key={step.number} className={`flex justify-between flex-col items-center flex-1 relative ${idx !== STEPS.length - 1 ? 'after:content-[""] after:h-[2px] after:w-1/2 after:bg-gray-300 dark:after:bg-slate-700 after:absolute after:top-4 after:-right-1/4 after:z-0' : ''}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (step.number < currentStep || (step.number === 2 && validateStep1())) {
                                            setError(null);
                                            setCurrentStep(step.number);
                                        }
                                    }}
                                    disabled={loading || (step.number > currentStep && step.number !== 2)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors text-xs font-bold ${isCompleted
                                        ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20 cursor-pointer'
                                        : isActive
                                            ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500/20'
                                            : 'bg-transparent text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700'
                                        }`}
                                >
                                    {isCompleted ? <Check size={16} strokeWidth={2.5} /> : <Icon size={16} />}
                                </button>
                                <span className={`text-[11px] mt-1.5 font-bold transition-colors ${isCompleted
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isActive
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-gray-500 dark:text-slate-400'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
                    {error && !(currentStep === 1 && isValidationError) && (
                        <div
                            className={`mb-4 p-3 rounded-xl border text-xs font-semibold flex justify-between items-start transition-all ${isValidationError
                                ? `bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 ${showWarning ? 'animate-shake' : ''}`
                                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40'
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {isValidationError && <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />}
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={() => { setError(null); setIsValidationError(false); }}
                                className="flex-shrink-0 ml-2"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>
            </div>
        </div>
    );
};

export default TenantWizard;
