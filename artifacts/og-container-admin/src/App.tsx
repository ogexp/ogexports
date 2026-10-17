import { Suspense, lazy, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { ThemeProvider } from '@/components/ThemeProvider';
import NotFound from '@/pages/not-found';
import { Layout } from '@/components/layout/Layout';
import { SafeAuthContext } from '@/lib/use-safe-auth';
import { LocalAuthProvider, useLocalAuth } from '@/lib/local-auth';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { GuardedAdminInvestment, GuardedAdminInvestCategory, GuardedInvestor } from '@/components/auth/InvestmentModuleGate';
import { GuardedInvestCategory } from '@/components/auth/InvestCategoryGate';
import { GuardedAdminSupplier, GuardedSupplier } from '@/components/auth/SupplierModuleGate';
import { useLuxeReveal } from '@/hooks/useLuxeReveal';

function Guarded({ roles, Page }: { roles: Array<'admin' | 'buyer' | 'supplier' | 'investor'>; Page: React.ComponentType }) {
  const redirectTo = roles.includes('admin') ? '/my-admin/login' : '/sign-in'
  return (
    <RoleGuard roles={roles} redirectTo={redirectTo}>
      <Page />
    </RoleGuard>
  );
}

// ─── Lazy-loaded page routes (code splitting for performance) ──────────────────
const Home                 = lazy(() => import('@/pages/Home'));
const Products             = lazy(() => import('@/pages/Products'));
const ProductDetail        = lazy(() => import('@/pages/ProductDetail'));
const About                = lazy(() => import('@/pages/About'));
const Contact              = lazy(() => import('@/pages/Contact'));
const Account              = lazy(() => import('@/pages/Account'));
const PrivacyPolicy        = lazy(() => import('@/pages/PrivacyPolicy'));
const DeleteAccount        = lazy(() => import('@/pages/DeleteAccount'));
const TermsOfService       = lazy(() => import('@/pages/TermsOfService'));
const Invest               = lazy(() => import('@/pages/Invest'));
const InvestDetail         = lazy(() => import('@/pages/InvestDetail'));
const InvestDashboard      = lazy(() => import('@/pages/InvestDashboard'));
const ContainerInvestments = lazy(() => import('@/pages/ContainerInvestments'));
const InvestmentPositionDetail = lazy(() => import('@/pages/InvestmentPositionDetail'));
const InvestorTransactionDetail = lazy(() => import('@/pages/InvestorTransactionDetail'));
const InvestDeposit        = lazy(() => import('@/pages/InvestDeposit'));
const InvestWithdraw       = lazy(() => import('@/pages/InvestWithdraw'));
const InvestReports        = lazy(() => import('@/pages/InvestReports'));
const InvestProfile        = lazy(() => import('@/pages/InvestProfile'));
const InvestSettings       = lazy(() => import('@/pages/InvestSettings'));
const InvestWallet         = lazy(() => import('@/pages/InvestWallet'));
const InvestKYC            = lazy(() => import('@/pages/InvestKYC'));
const InvestNotifications  = lazy(() => import('@/pages/InvestNotifications'));
const InvestMessages       = lazy(() => import('@/pages/InvestMessages'));
const InvestOpportunities  = lazy(() => import('@/pages/InvestOpportunities'));
const MarketIntelligence   = lazy(() => import('@/pages/MarketIntelligenceUnavailable'));
const Marketplace          = lazy(() => import('@/pages/Marketplace'));
const ExportTerms          = lazy(() => import('@/pages/ExportTerms'));
const Certifications       = lazy(() => import('@/pages/Certifications'));
const AiHub                = lazy(() => import('@/pages/AiHub'));
const Documents            = lazy(() => import('@/pages/Documents'));
const CompanyProfile       = lazy(() => import('@/pages/CompanyProfile'));
const TradeNews            = lazy(() => import('@/pages/TradeNews'));

const LocalSignInPage      = lazy(() => import('@/pages/SignIn'));
const LocalSignUpPage      = lazy(() => import('@/pages/SignUp'));
const ForgotPasswordPage   = lazy(() => import('@/pages/ForgotPassword'));
const VerifyEmailPage      = lazy(() => import('@/pages/VerifyEmail'));
const LocalAccount         = lazy(() => import('@/pages/LocalAccount'));
const AdminLoginPage       = lazy(() => import('@/pages/AdminLogin'));

const BuyerDashboard       = lazy(() => import('@/pages/BuyerDashboard'));
const BuyerCompanyProfile  = lazy(() => import('@/pages/BuyerCompanyProfile'));
const BuyerCatalogue       = lazy(() => import('@/pages/BuyerCatalogue'));
const BuyerRFQ             = lazy(() => import('@/pages/BuyerRFQ'));
const BuyerQuotations      = lazy(() => import('@/pages/BuyerQuotations'));
const BuyerOrders          = lazy(() => import('@/pages/BuyerOrders'));
const BuyerShipments       = lazy(() => import('@/pages/BuyerShipments'));
const BuyerDocuments       = lazy(() => import('@/pages/BuyerDocuments'));
const BuyerPayments        = lazy(() => import('@/pages/BuyerPayments'));
const BuyerRepeatOrders    = lazy(() => import('@/pages/BuyerRepeatOrders'));
const BuyerAnalytics       = lazy(() => import('@/pages/BuyerAnalytics'));
const BuyerMessages        = lazy(() => import('@/pages/BuyerMessages'));
const BuyerNotifications   = lazy(() => import('@/pages/BuyerNotifications'));
const BuyerSettings        = lazy(() => import('@/pages/BuyerSettings'));
const BuyerProfile         = lazy(() => import('@/pages/BuyerProfile'));
const BuyerCart            = lazy(() => import('@/pages/BuyerCart'));
const BuyerCheckout        = lazy(() => import('@/pages/BuyerCheckout'));
const BuyerOrderConfirmation = lazy(() => import('@/pages/BuyerOrderConfirmation'));
const BuyerQuotationRequested = lazy(() => import('@/pages/BuyerQuotationRequested'));

const SupplierDashboard    = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierSubmitOffer  = lazy(() => import('@/pages/supplier/SupplierSubmitOffer'));
const SupplierMyOffers     = lazy(() => import('@/pages/supplier/SupplierMyOffers'));
const SupplierMessages     = lazy(() => import('@/pages/supplier/SupplierMessages'));
const SupplierNotifications = lazy(() => import('@/pages/supplier/SupplierNotifications'));
const SupplierProfile      = lazy(() => import('@/pages/supplier/SupplierProfile'));
const SupplierSettings     = lazy(() => import('@/pages/supplier/SupplierSettings'));
const SupplierProcedure    = lazy(() => import('@/pages/supplier/SupplierProcedure'));

const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers           = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminInvestments     = lazy(() => import('@/pages/admin/AdminInvestments'));
const AdminContainerInvestments = lazy(() => import('@/pages/admin/AdminContainerInvestments'));
const AdminProjectDeposits = lazy(() => import('@/pages/admin/AdminProjectDeposits'));
const AdminInvestmentPayouts = lazy(() => import('@/pages/admin/AdminInvestmentPayouts'));
const AdminActiveProjects  = lazy(() => import('@/pages/admin/AdminActiveProjects'));
const AdminFacilityProjects = lazy(() => import('@/pages/admin/AdminFacilityProjects'));
const AdminInvestmentSections = lazy(() => import('@/pages/admin/AdminInvestmentSections'));
const AdminFinance         = lazy(() => import('@/pages/admin/AdminFinance'));
const AdminOrders          = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminShipments       = lazy(() => import('@/pages/admin/AdminShipments'));
const AdminPaidPayments    = lazy(() => import('@/pages/admin/AdminPaidPayments'));
const AdminProducts        = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminCRM             = lazy(() => import('@/pages/admin/AdminCRM'));
const AdminCompliance      = lazy(() => import('@/pages/admin/AdminCompliance'));
const AdminSupport         = lazy(() => import('@/pages/admin/AdminSupport'));
const AdminMessages        = lazy(() => import('@/pages/admin/AdminMessages'));
const AdminAnnouncements   = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminReports         = lazy(() => import('@/pages/admin/AdminReports'));
const AdminSecurity        = lazy(() => import('@/pages/admin/AdminSecurity'));
const AdminSettings        = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminTradeIntelligence = lazy(() => import('@/pages/admin/AdminTradeIntelligence'));
const AdminSuppliers       = lazy(() => import('@/pages/admin/AdminSuppliers'));
const AdminOfferDocs       = lazy(() => import('@/pages/admin/AdminOfferDocs'));
const AdminCMS             = lazy(() => import('@/pages/admin/AdminCMS'));
const AdminQuotations      = lazy(() => import('@/pages/admin/AdminQuotations'));

// ─── Branded page-load fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const clerkPubKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim() || undefined;
const clerkProxyUrl = (import.meta.env.VITE_CLERK_PROXY_URL as string | undefined)?.trim() || undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(155 60% 30%)',
    colorForeground: 'hsl(0 0% 98%)',
    colorMutedForeground: 'hsl(220 15% 60%)',
    colorDanger: 'hsl(0 84% 60%)',
    colorBackground: 'hsl(220 15% 9%)',
    colorInput: 'hsl(220 15% 16%)',
    colorInputForeground: 'hsl(0 0% 98%)',
    colorNeutral: 'hsl(220 15% 16%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(220_15%_9%)] border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-white font-heading',
    headerSubtitle: 'text-white/60',
    socialButtonsBlockButtonText: 'text-white',
    formFieldLabel: 'text-white/80',
    footerActionLink: 'text-[hsl(43_80%_55%)] hover:text-[hsl(43_80%_65%)]',
    footerActionText: 'text-white/60',
    dividerText: 'text-white/40',
    identityPreviewEditButton: 'text-[hsl(43_80%_55%)]',
    formFieldSuccessText: 'text-emerald-400',
    alertText: 'text-white',
    logoBox: 'mb-2',
    logoImage: 'h-9',
    socialButtonsBlockButton: 'border-white/15 hover:bg-white/5',
    formButtonPrimary: 'bg-[hsl(155_60%_30%)] hover:bg-[hsl(155_60%_25%)] text-white',
    formFieldInput: 'bg-white/5 border-white/15 text-white',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-white/10',
    alert: 'bg-white/5 border-white/10',
    otpCodeFieldInput: 'bg-white/5 border-white/15 text-white',
    formFieldRow: '',
    main: '',
  },
};

// ─── Shared split-screen wrapper for Clerk forms ───────────────────────────────
function SplitScreenAuthLayout({ children, isSignIn }: { children: React.ReactNode; isSignIn: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <div className="relative hidden md:flex flex-col justify-between w-[60%] p-12 bg-black border-r border-border overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img src={`${import.meta.env.BASE_URL}images/shipping-port.jpg`} alt="Global Trade" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-12 w-auto dark:brightness-125" />
          </div>
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase shadow-sm">
              Global Trade Network
            </div>
            <h1 className="text-5xl font-heading font-bold text-white leading-tight">
              From Pakistan to <br /><span className="text-accent">The World.</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Premium agricultural exports you can trust. Join buyers, suppliers, and investors on the definitive B2B commodity trading platform.
            </p>
          </div>
          <div className="flex gap-12 border-t border-white/10 pt-8 mt-12">
            <div className="space-y-1">
              <div className="text-3xl font-heading font-bold text-white">40+</div>
              <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Countries Served</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-heading font-bold text-white">5+</div>
              <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Years Experience</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-heading font-bold text-white">30+</div>
              <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Products Exported</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 text-center">
            <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-10 mx-auto mb-4 dark:brightness-125" />
            <h2 className="text-2xl font-heading font-bold">{isSignIn ? "Welcome Back" : "Create Account"}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Auth pages: Clerk when key present, local forms when not ─────────────────
function SignInPage() {
  if (!clerkPubKey) return <LocalSignInPage />;
  return (
    <SplitScreenAuthLayout isSignIn={true}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </SplitScreenAuthLayout>
  );
}

function SignUpPage() {
  if (!clerkPubKey) return <LocalSignUpPage />;
  return (
    <SplitScreenAuthLayout isSignIn={false}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </SplitScreenAuthLayout>
  );
}

// ─── Clerk auth bridge → SafeAuthContext ──────────────────────────────────────
function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  return (
    <SafeAuthContext.Provider value={{ isLoaded, isSignedIn: !!isSignedIn, userId }}>
      {children}
    </SafeAuthContext.Provider>
  );
}

// ─── Local auth bridge → SafeAuthContext ──────────────────────────────────────
function LocalAuthBridge({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn, logout, stopImpersonating } = useLocalAuth();
  return (
    <SafeAuthContext.Provider value={{
      isLoaded,
      isSignedIn,
      userId: user?.id ?? null,
      displayName: user?.fullName ?? null,
      email: user?.email ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      country: user?.country ?? null,
      accountType: user?.accountType ?? null,
      logout,
      impersonating: user?.impersonating ?? false,
      impersonatorName: user?.impersonatorName ?? null,
      stopImpersonating,
    }}>
      {children}
    </SafeAuthContext.Provider>
  );
}

// ─── Clerk route: account requires Clerk auth ─────────────────────────────────
function AccountRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <Account />;
}

// ─── Local route: account requires local auth ─────────────────────────────────
function LocalAccountRoute() {
  const { isLoaded, isSignedIn } = useLocalAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <LocalAccount />;
}

// ─── Shared non-auth routes ─────────────────────────────────────────────────
const SHARED_ROUTES = (
  <>
    <Route path="/" component={Home} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/verify-email" component={VerifyEmailPage} />
    <Route path="/forgot-password" component={ForgotPasswordPage} />
    <Route path="/my-admin/login" component={AdminLoginPage} />
    <Route path="/products" component={Products} />
    <Route path="/products/:slug" component={ProductDetail} />
    <Route path="/invest">{() => <GuardedInvestor Page={Invest} />}</Route>
    <Route path="/invest/dashboard">{() => <GuardedInvestor Page={InvestDashboard} />}</Route>
    <Route path="/invest/containers">{() => <GuardedInvestor Page={ContainerInvestments} />}</Route>
    <Route path="/invest/positions/:id">{() => <GuardedInvestor Page={InvestmentPositionDetail} />}</Route>
    <Route path="/invest/transactions/:type/:id">{() => <GuardedInvestor Page={InvestorTransactionDetail} />}</Route>
    <Route path="/invest/deposit">{() => <GuardedInvestor Page={InvestDeposit} />}</Route>
    <Route path="/invest/withdraw">{() => <GuardedInvestor Page={InvestWithdraw} />}</Route>
    <Route path="/invest/reports">{() => <GuardedInvestor Page={InvestReports} />}</Route>
    <Route path="/invest/profile">{() => <GuardedInvestor Page={InvestProfile} />}</Route>
    <Route path="/invest/settings">{() => <GuardedInvestor Page={InvestSettings} />}</Route>
    <Route path="/invest/wallet">{() => <GuardedInvestor Page={InvestWallet} />}</Route>
    <Route path="/invest/markets">{() => <GuardedInvestor Page={InvestOpportunities} />}</Route>
    <Route path="/invest/plant">{() => <GuardedInvestCategory category="plant" Page={InvestOpportunities} />}</Route>
    <Route path="/invest/feeds">{() => <GuardedInvestCategory category="feeds" Page={InvestOpportunities} />}</Route>
    <Route path="/invest/ricemill">{() => <GuardedInvestCategory category="ricemill" Page={InvestOpportunities} />}</Route>
    <Route path="/invest/kyc">{() => <GuardedInvestor Page={InvestKYC} />}</Route>
    <Route path="/invest/notifications">{() => <GuardedInvestor Page={InvestNotifications} />}</Route>
    <Route path="/invest/messages">{() => <GuardedInvestor Page={InvestMessages} />}</Route>
    <Route path="/invest/cold-storage">{() => <GuardedInvestor Page={InvestOpportunities} />}</Route>
    <Route path="/invest/domestic-trading">{() => <GuardedInvestor Page={InvestOpportunities} />}</Route>
    <Route path="/invest/opportunities">{() => <GuardedInvestor Page={InvestOpportunities} />}</Route>
    <Route path="/invest/:id">{() => <GuardedInvestor Page={InvestDetail} />}</Route>
    <Route path="/market-reports" component={MarketIntelligence} />
    <Route path="/market-intelligence" component={MarketIntelligence} />
    <Route path="/admin">{() => <Redirect to="/admin/dashboard" />}</Route>
    <Route path="/admin/dashboard">{() => <Guarded roles={['admin']} Page={AdminDashboard} />}</Route>
    <Route path="/admin/users">{() => <Guarded roles={['admin']} Page={AdminUsers} />}</Route>
    <Route path="/admin/investments">{() => <GuardedAdminInvestment Page={AdminInvestments} />}</Route>
    <Route path="/admin/container-projects">{() => <Redirect to="/admin/container-investments?view=projects" />}</Route>
    <Route path="/admin/project-deposits">{() => <GuardedAdminInvestment Page={AdminProjectDeposits} />}</Route>
    <Route path="/admin/investment-payouts">{() => <GuardedAdminInvestment Page={AdminInvestmentPayouts} />}</Route>
    <Route path="/admin/active-projects">{() => <GuardedAdminInvestment Page={AdminActiveProjects} />}</Route>
    <Route path="/admin/processing-plant">{() => <GuardedAdminInvestCategory category="plant" Page={AdminFacilityProjects} />}</Route>
    <Route path="/admin/rice-mill">{() => <GuardedAdminInvestCategory category="ricemill" Page={AdminFacilityProjects} />}</Route>
    <Route path="/admin/feed-mill">{() => <GuardedAdminInvestCategory category="feeds" Page={AdminFacilityProjects} />}</Route>
    <Route path="/admin/container-investments">{() => <GuardedAdminInvestment Page={AdminContainerInvestments} />}</Route>
    <Route path="/admin/fresh-produce">{() => <GuardedAdminInvestCategory category="produce" Page={AdminInvestmentSections} />}</Route>
    <Route path="/admin/pending-withdrawals">{() => <GuardedAdminInvestment Page={AdminInvestmentSections} />}</Route>
    <Route path="/admin/finance">{() => <Guarded roles={['admin']} Page={AdminFinance} />}</Route>
    <Route path="/admin/orders">{() => <Guarded roles={['admin']} Page={AdminOrders} />}</Route>
    <Route path="/admin/quotations">{() => <Guarded roles={['admin']} Page={AdminQuotations} />}</Route>
    <Route path="/admin/shipments">{() => <Guarded roles={['admin']} Page={AdminShipments} />}</Route>
    <Route path="/admin/paid-payments">{() => <Guarded roles={['admin']} Page={AdminPaidPayments} />}</Route>
    <Route path="/admin/products">{() => <Guarded roles={['admin']} Page={AdminProducts} />}</Route>
    <Route path="/admin/crm">{() => <Guarded roles={['admin']} Page={AdminCRM} />}</Route>
    <Route path="/admin/compliance">{() => <Guarded roles={['admin']} Page={AdminCompliance} />}</Route>
    <Route path="/admin/audit">{() => <Redirect to="/admin/compliance?tab=audit" />}</Route>
    <Route path="/admin/support">{() => <Guarded roles={['admin']} Page={AdminSupport} />}</Route>
    <Route path="/admin/messages">{() => <Guarded roles={['admin']} Page={AdminMessages} />}</Route>
    <Route path="/admin/announcements">{() => <Guarded roles={['admin']} Page={AdminAnnouncements} />}</Route>
    <Route path="/admin/reports">{() => <Guarded roles={['admin']} Page={AdminReports} />}</Route>
    <Route path="/admin/security">{() => <Guarded roles={['admin']} Page={AdminSecurity} />}</Route>
    <Route path="/admin/settings">{() => <Guarded roles={['admin']} Page={AdminSettings} />}</Route>
    <Route path="/admin/trade-intelligence">{() => <Guarded roles={['admin']} Page={AdminTradeIntelligence} />}</Route>
    <Route path="/admin/suppliers">{() => <GuardedAdminSupplier Page={AdminSuppliers} />}</Route>
    <Route path="/admin/suppliers/:id/docs">{() => <GuardedAdminSupplier Page={AdminOfferDocs} />}</Route>
    <Route path="/admin/cms">{() => <Guarded roles={['admin']} Page={AdminCMS} />}</Route>
    <Route path="/wholesale" component={Marketplace} />
    <Route path="/documents" component={Documents} />
    <Route path="/ai" component={AiHub} />
    <Route path="/about" component={About} />
    <Route path="/certifications" component={Certifications} />
    <Route path="/contact" component={Contact} />
    <Route path="/news" component={TradeNews} />
    <Route path="/privacy" component={PrivacyPolicy} />
    <Route path="/delete-account" component={DeleteAccount} />
    <Route path="/terms" component={TermsOfService} />
    <Route path="/export-terms" component={ExportTerms} />
    <Route path="/company-profile" component={CompanyProfile} />
    <Route path="/buyer">{() => <Redirect to="/buyer/dashboard" />}</Route>
    <Route path="/buyer/dashboard">{() => <Guarded roles={['buyer']} Page={BuyerDashboard} />}</Route>
    <Route path="/buyer/company">{() => <Guarded roles={['buyer']} Page={BuyerCompanyProfile} />}</Route>
    <Route path="/buyer/catalogue">{() => <Guarded roles={['buyer']} Page={BuyerCatalogue} />}</Route>
    <Route path="/buyer/rfq">{() => <Guarded roles={['buyer']} Page={BuyerRFQ} />}</Route>
    <Route path="/buyer/rfq/new">{() => <Guarded roles={['buyer']} Page={BuyerRFQ} />}</Route>
    <Route path="/buyer/quotations">{() => <Guarded roles={['buyer']} Page={BuyerQuotations} />}</Route>
    <Route path="/buyer/orders">{() => <Guarded roles={['buyer']} Page={BuyerOrders} />}</Route>
    <Route path="/buyer/shipments">{() => <Guarded roles={['buyer']} Page={BuyerShipments} />}</Route>
    <Route path="/buyer/documents">{() => <Guarded roles={['buyer']} Page={BuyerDocuments} />}</Route>
    <Route path="/buyer/payments">{() => <Guarded roles={['buyer']} Page={BuyerPayments} />}</Route>
    <Route path="/buyer/repeat-orders">{() => <Guarded roles={['buyer']} Page={BuyerRepeatOrders} />}</Route>
    <Route path="/buyer/analytics">{() => <Guarded roles={['buyer']} Page={BuyerAnalytics} />}</Route>
    <Route path="/buyer/messages">{() => <Guarded roles={['buyer']} Page={BuyerMessages} />}</Route>
    <Route path="/buyer/notifications">{() => <Guarded roles={['buyer']} Page={BuyerNotifications} />}</Route>
    <Route path="/buyer/settings">{() => <Guarded roles={['buyer']} Page={BuyerSettings} />}</Route>
    <Route path="/buyer/profile">{() => <Guarded roles={['buyer']} Page={BuyerProfile} />}</Route>
    <Route path="/buyer/cart">{() => <Guarded roles={['buyer']} Page={BuyerCart} />}</Route>
    <Route path="/buyer/checkout">{() => <Guarded roles={['buyer']} Page={BuyerCheckout} />}</Route>
    <Route path="/buyer/order-confirmation">{() => <Guarded roles={['buyer']} Page={BuyerOrderConfirmation} />}</Route>
    <Route path="/buyer/quotation-requested">{() => <Guarded roles={['buyer']} Page={BuyerQuotationRequested} />}</Route>
    <Route path="/supplier">{() => <GuardedSupplier Page={SupplierDashboard} />}</Route>
    <Route path="/supplier/dashboard">{() => <GuardedSupplier Page={SupplierDashboard} />}</Route>
    <Route path="/supplier/submit-offer">{() => <GuardedSupplier Page={SupplierSubmitOffer} />}</Route>
    <Route path="/supplier/my-offers">{() => <GuardedSupplier Page={SupplierMyOffers} />}</Route>
    <Route path="/supplier/messages">{() => <GuardedSupplier Page={SupplierMessages} />}</Route>
    <Route path="/supplier/notifications">{() => <GuardedSupplier Page={SupplierNotifications} />}</Route>
    <Route path="/supplier/profile">{() => <GuardedSupplier Page={SupplierProfile} />}</Route>
    <Route path="/supplier/settings">{() => <GuardedSupplier Page={SupplierSettings} />}</Route>
    <Route path="/supplier/procedure">{() => <GuardedSupplier Page={SupplierProcedure} />}</Route>
  </>
);

// ─── Clerk routes (uses Clerk account) ───────────────────────────────────────
const ClerkAppRoutes = () => {
  useLuxeReveal()
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {SHARED_ROUTES}
          <Route path="/account/*?" component={AccountRoute} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  )
};

// ─── Local routes (uses local account) ───────────────────────────────────────
const LocalAppRoutes = () => {
  useLuxeReveal()
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {SHARED_ROUTES}
          <Route path="/account/*?" component={LocalAccountRoute} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  )
};

// ─── QueryClient cache invalidation on Clerk user change ──────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

// ─── With Clerk ───────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to your OG Exports trade account' } },
        signUp: { start: { title: 'Create your trade account', subtitle: 'Join buyers, suppliers, and investors on OG Exports' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkAuthBridge>
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <ClerkAppRoutes />
          <Toaster />
        </QueryClientProvider>
      </ClerkAuthBridge>
    </ClerkProvider>
  );
}

// ─── Without Clerk (local auth) ───────────────────────────────────────────────
function AppWithoutClerk() {
  return (
    <LocalAuthBridge>
      <QueryClientProvider client={queryClient}>
        <LocalAppRoutes />
        <Toaster />
      </QueryClientProvider>
    </LocalAuthBridge>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <ConfirmDialogProvider>
        {/* Always provide local auth — SHARED_ROUTES pages call useLocalAuth even when Clerk is enabled. */}
        <LocalAuthProvider>
          <WouterRouter base={basePath}>
            {clerkPubKey ? <ClerkProviderWithRoutes /> : <AppWithoutClerk />}
          </WouterRouter>
        </LocalAuthProvider>
      </ConfirmDialogProvider>
    </ThemeProvider>
  );
}

export default App;
