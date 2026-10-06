import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { GlobalMetricsProvider } from './context/GlobalMetricsContext';
import { QueryProvider } from './providers/QueryProvider';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignupPage from './pages/auth/SignupPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ImpersonateLoader from './pages/admin/ImpersonateLoader';
import DashboardPage from './pages/dashboard/DashboardPage';
import WalletPage from './pages/billing/WalletPage';
import PaymentMethodsPage from './pages/billing/PaymentMethodsPage';
import PhoneNumbersPage from './pages/telecom/PhoneNumbersPage';
import ExtensionsPage from './pages/telecom/Extensions/ExtensionsPage';
import ExtensionsStatusPage from './pages/telecom/Extensions/ExtensionsStatusPage';
import ExtensionForm from './pages/telecom/Extensions/ExtensionForm';
import RingGroupsPage from './pages/telecom/RingGroups/RingGroupsPage';
import RingGroupForm from './pages/telecom/RingGroups/RingGroupForm';
import IVRsPage from './pages/telecom/IVRs/IVRsPage';
import IVRForm from './pages/telecom/IVRs/IVRForm';
import SchedulesPage from './pages/telecom/schedules/SchedulesPage';
import ScheduleForm from './pages/telecom/schedules/ScheduleForm';
import AudioLibrary from './pages/telecom/AudioLibrary';
import AnalyticsDashboard from './pages/telecom/analytics/AnalyticsDashboard';
import MonitoringPage from './pages/telecom/MonitoringPage';
import CdrsPage from './pages/telecom/CdrsPage';
import DIDForwardsPage from './pages/telecom/did-forwards/DIDForwardsPage';
import DIDForwardForm from './pages/telecom/did-forwards/DIDForwardForm';
import RevenuePage from './pages/admin/RevenuePage';

import UserManagement from './pages/admin/UserManagement';
import SuperAdminUsers from './pages/admin/SuperAdminUsers';
import AllUsersPage from './pages/admin/AllUsersPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import TenantsPage from './pages/admin/Tenants/TenantsPage';
import RateCardsPage from './pages/admin/RateCardsPage';
import NumbersManagement from './pages/admin/NumbersManagement';
import PackagesPage from './pages/admin/PackagesPage';
import CarriersGatewaysPage from './pages/admin/CarriersGatewaysPage';
import BrandingSettingsPage from './pages/admin/BrandingSettingsPage';
import ExtensionStatus from './pages/admin/ExtensionStatus';
import PlansPage from './pages/admin/PlansPage';
import CreatePlanPage from './pages/admin/CreatePlanPage';
import OnboardingLayout from './pages/onboarding/OnboardingLayout';
import TfnOnboardingPage from './pages/onboarding/TfnOnboardingPage';
import PrivateLayout from './components/layout/PrivateLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import GlobalAnalyticsDashboard from './pages/platform/GlobalAnalyticsDashboard';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const DashboardRedirect = () => {
    const { user } = useAuth();
    if (user?.role === 'SUPER_ADMIN') {
        return <Navigate to="/platform" replace />;
    }
    return <DashboardPage />;
};

const MonitoringRoute = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'SUPER_ADMIN' && !user?.monitoringEnabled) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

const AnalyticsPageDispatcher = () => {
    const { user } = useAuth();
    if (user?.role === 'SUPER_ADMIN') {
        return <GlobalAnalyticsDashboard />;
    }
    return <AnalyticsDashboard />;
};

function App() {
    return (
        <QueryProvider>
            <BrandingProvider>
                <AuthProvider>
                    <ToastProvider>
                        <ThemeProvider>
                            <BrowserRouter>
                                <div className="h-screen w-screen overflow-hidden bg-gray-50 font-sans text-slate-900">
                                    <Routes>
                                        {/* Public Routes */}
                                        <Route path="/login" element={<LoginPage />} />
                                        <Route path="/reset" element={<ResetPasswordPage />} />
                                        {/* <Route path="/signup" element={<SignupPage />} /> */}
                                        <Route path="/invite/accept" element={<AcceptInvitePage />} />
                                        <Route path="/impersonate" element={<ImpersonateLoader />} />
                                        <Route path="/auth/change-password" element={<ChangePasswordPage />} />
                                        {/* Onboarding Routes */}
                                        <Route element={<OnboardingLayout />}>
                                            <Route path="/onboarding/select-tfn" element={<TfnOnboardingPage />} />
                                        </Route>

                                        {/* Protected Routes */}
                                        {/* Protected Routes */}
                                        <Route element={
                                            <GlobalMetricsProvider>
                                                <PrivateLayout />
                                            </GlobalMetricsProvider>
                                        }>
                                            {/* Dashboard: All Authenticated Users (Redirect Super Admin) */}
                                            <Route path="/dashboard" element={<DashboardRedirect />} />

                                            {/* Admin & Support Access */}
                                            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT', 'SUPER_ADMIN']} />}>
                                                <Route path="/wallet" element={<WalletPage />} />
                                                <Route path="/wallet/cards" element={<PaymentMethodsPage />} />
                                                <Route path="/telecom/phone-numbers" element={<PhoneNumbersPage />} />
                                                <Route path="/phone-numbers" element={<Navigate to="/telecom/phone-numbers" replace />} />
                                                <Route path="/tfn" element={<Navigate to="/telecom/phone-numbers" replace />} />
                                                <Route path="/telecom/dids" element={<Navigate to="/telecom/phone-numbers" replace />} />
                                                <Route path="/telecom/dids/new" element={<Navigate to="/telecom/phone-numbers" replace />} />
                                                <Route path="/telecom/dids/:id/edit" element={<Navigate to="/telecom/phone-numbers" replace />} />
                                                <Route path="/telecom/extensions" element={<ExtensionsPage />} />
                                                <Route path="/telecom/extensions/status" element={<ExtensionsStatusPage />} />
                                                <Route path="/telecom/extensions/new" element={<ExtensionForm />} />
                                                <Route path="/telecom/extensions/:id/edit" element={<ExtensionForm />} />
                                                <Route path="/extensions" element={<ExtensionsPage />} />
                                                <Route path="/extensions/status" element={<ExtensionsStatusPage />} />
                                                <Route path="/telecom/ring-groups" element={<RingGroupsPage />} />
                                                <Route path="/telecom/ring-groups/new" element={<RingGroupForm />} />
                                                <Route path="/telecom/ring-groups/:id/edit" element={<RingGroupForm />} />
                                                <Route path="/telecom/ivrs" element={<IVRsPage />} />
                                                <Route path="/telecom/ivrs/new" element={<IVRForm />} />
                                                <Route path="/telecom/ivrs/:id/edit" element={<IVRForm />} />
                                                <Route path="/telecom/did-forwards" element={<DIDForwardsPage />} />
                                                <Route path="/telecom/did-forwards/new" element={<DIDForwardForm />} />
                                                <Route path="/telecom/did-forwards/:id/edit" element={<DIDForwardForm />} />
                                                {/* Monitor */}

                                                {/* Fallback route */}
                                                <Route path="/telecom/schedules" element={<SchedulesPage />} />
                                                <Route path="/telecom/schedules/new" element={<ScheduleForm />} />
                                                <Route path="/telecom/schedules/:id/edit" element={<ScheduleForm />} />
                                                <Route path="/telecom/schedules/:id/edit" element={<ScheduleForm />} />
                                                <Route path="/telecom/audio" element={<AudioLibrary />} />
                                                <Route path="/analytics" element={<AnalyticsPageDispatcher />} />
                                                <Route path="/monitoring" element={
                                                    <MonitoringRoute>
                                                        <MonitoringPage />
                                                    </MonitoringRoute>
                                                } />
                                                <Route path="/cdrs" element={<CdrsPage />} />
                                                <Route path="/subscriptions" element={<PlansPage />} />
                                                <Route path="/subscriptions/plans/new" element={<CreatePlanPage />} />
                                            </Route>

                                            {/* Admin Only */}
                                            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                                                <Route path="/users" element={<UserManagement />} />
                                                <Route path="/settings" element={<BrandingSettingsPage />} />
                                            </Route>


                                            {/* Super Admin Only */}
                                            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                                                <Route path="/platform" element={<PlatformDashboard />} />
                                                <Route path="/admin/users" element={<AllUsersPage />} />
                                                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                                                <Route path="/super-admin/users" element={<SuperAdminUsers />} />
                                                <Route path="/super-admin/rate-cards" element={<RateCardsPage />} />
                                                <Route path="/super-admin/numbers" element={<NumbersManagement />} />
                                                <Route path="/super-admin/packages" element={<PackagesPage />} />
                                                <Route path="/super-admin/subscriptions" element={<PlansPage />} />
                                                <Route path="/super-admin/plans" element={<PlansPage />} />
                                                <Route path="/super-admin/plans/new" element={<CreatePlanPage />} />
                                                <Route path="/super-admin/carriers" element={<CarriersGatewaysPage />} />
                                                <Route path="/tenants" element={<TenantsPage />} />
                                                <Route path="/revenue" element={<RevenuePage />} />
                                                <Route path="/admin/extension-status" element={<ExtensionStatus />} />
                                            </Route>
                                        </Route>

                                        {/* Default redirect */}
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                </div>
                            </BrowserRouter>
                        </ThemeProvider>
                    </ToastProvider>
                </AuthProvider>
            </BrandingProvider>
        </QueryProvider>
    );
}

export default App;
