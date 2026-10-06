<?php

use App\Http\Controllers\Api\Admin\AnnouncementController as AdminAnnouncementController;
use App\Http\Controllers\Api\Admin\CmsController as AdminCmsController;
use App\Http\Controllers\Api\Admin\GoogleNewsSyncController;
use App\Http\Controllers\Api\Admin\ComplianceController;
use App\Http\Controllers\Api\Admin\CrmController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\DepositOptionController as AdminDepositOptionController;
use App\Http\Controllers\Api\Admin\FacilityContentController as AdminFacilityContentController;
use App\Http\Controllers\Api\Admin\FinanceController;
use App\Http\Controllers\Api\Admin\IncotermController as AdminIncotermController;
use App\Http\Controllers\Api\Admin\PaymentMethodController as AdminPaymentMethodController;
use App\Http\Controllers\Api\Admin\SupplierCertificationController as AdminSupplierCertificationController;
use App\Http\Controllers\Api\Admin\SupplierPackagingSizeController as AdminSupplierPackagingSizeController;
use App\Http\Controllers\Api\Admin\SupplierPaymentTermController as AdminSupplierPaymentTermController;
use App\Http\Controllers\Api\Admin\InvestmentProfitDistributionController;
use App\Http\Controllers\Api\Admin\InvestmentController as AdminInvestmentController;
use App\Http\Controllers\Api\Admin\ProjectInvestmentController as AdminProjectInvestmentController;
use App\Http\Controllers\Api\Admin\InvestmentProjectDocumentController as AdminInvestmentProjectDocumentController;
use App\Http\Controllers\Api\Admin\InvestmentProjectContainerTrackingController;
use App\Http\Controllers\Api\Admin\InvestmentProjectStageUpdateController;
use App\Http\Controllers\Api\Admin\InvestmentProjectTradeUpdateController;
use App\Http\Controllers\Api\Admin\MessageController as AdminMessageController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\PublicQuotationController as AdminPublicQuotationController;
use App\Http\Controllers\Api\Admin\QuotationController as AdminQuotationController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\ShipmentController as AdminShipmentController;
use App\Http\Controllers\Api\Admin\SupplierOfferController as AdminSupplierOfferController;
use App\Http\Controllers\Api\Admin\OrderTradeDocumentController as AdminOrderTradeDocumentController;
use App\Http\Controllers\Api\Admin\TradeDocumentController as AdminTradeDocumentController;
use App\Http\Controllers\Api\Admin\SupportController as AdminSupportController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\ModuleCountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Mobile\MobileAppController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\Buyer\AnalyticsController as BuyerAnalyticsController;
use App\Http\Controllers\Api\Buyer\CartController;
use App\Http\Controllers\Api\Buyer\CompanyController as BuyerCompanyController;
use App\Http\Controllers\Api\Buyer\DashboardController as BuyerDashboardController;
use App\Http\Controllers\Api\Buyer\DocumentController as BuyerDocumentController;
use App\Http\Controllers\Api\Buyer\OrderController as BuyerOrderController;
use App\Http\Controllers\Api\Buyer\PaymentController as BuyerPaymentController;
use App\Http\Controllers\Api\Buyer\QuotationController as BuyerQuotationController;
use App\Http\Controllers\Api\Buyer\RfqController as BuyerRfqController;
use App\Http\Controllers\Api\Buyer\ShipmentController as BuyerShipmentController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\MaintController;
use App\Http\Controllers\Api\Investor\DashboardController as InvestorDashboardController;
use App\Http\Controllers\Api\Investor\DepositController as InvestorDepositController;
use App\Http\Controllers\Api\Investor\DepositOptionController as InvestorDepositOptionController;
use App\Http\Controllers\Api\Investor\FacilityContentController as InvestorFacilityContentController;
use App\Http\Controllers\Api\Investor\KycController as InvestorKycController;
use App\Http\Controllers\Api\Investor\NotificationController as InvestorNotificationController;
use App\Http\Controllers\Api\Investor\ProfileController as InvestorProfileController;
use App\Http\Controllers\Api\Investor\ProjectController as InvestorProjectController;
use App\Http\Controllers\Api\Investor\ReportController as InvestorReportController;
use App\Http\Controllers\Api\Investor\WalletController as InvestorWalletController;
use App\Http\Controllers\Api\Investor\WithdrawalController as InvestorWithdrawalController;
use App\Http\Controllers\Api\Public\CmsController as PublicCmsController;
use App\Http\Controllers\Api\Public\ContactController;
use App\Http\Controllers\Api\Public\ImportedProductController;
use App\Http\Controllers\Api\Public\InvestmentController as PublicInvestmentController;
use App\Http\Controllers\Api\Public\LocationController;
use App\Http\Controllers\Api\Public\NewsController;
use App\Http\Controllers\Api\Public\ProductController as PublicProductController;
use App\Http\Controllers\Api\Shared\AnnouncementController as SharedAnnouncementController;
use App\Http\Controllers\Api\Shared\ExchangeRateController;
use App\Http\Controllers\Api\Shared\MessageController;
use App\Http\Controllers\Api\Shared\NotificationController as SharedNotificationController;
use App\Http\Controllers\Api\Shared\SupportTicketController;
use App\Http\Controllers\Api\Shared\UploadController;
use App\Http\Controllers\Api\Supplier\DashboardController as SupplierDashboardController;
use App\Http\Controllers\Api\Supplier\OfferController as SupplierOfferController;
use App\Http\Controllers\Api\Supplier\OfferMediaController as SupplierOfferMediaController;
use App\Http\Controllers\Api\Supplier\OfferSettingsController as SupplierOfferSettingsController;
use App\Http\Controllers\Api\Supplier\ProfileController as SupplierProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

// Token-gated maintenance (CDN-safe under /api/*). Requires MAINT_TOKEN in .env.
Route::prefix('maint')->group(function () {
    Route::get('/status', [MaintController::class, 'status']);
    Route::get('/migrate', [MaintController::class, 'migrate']);
    Route::get('/cache-clear', [MaintController::class, 'cacheClear']);
    Route::get('/seed-email-templates', [MaintController::class, 'seedEmailTemplates']);
    Route::get('/mail-probe', [MaintController::class, 'mailProbe']);
    Route::get('/apply-quotation-contact', [MaintController::class, 'applyQuotationContact']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/verify-email', [AuthController::class, 'verifyEmail'])->middleware('throttle:5,1');
    Route::post('/resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:3,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/2fa/verify', [SecurityController::class, 'twoFactorVerifyLogin'])->middleware('throttle:5,1');
    Route::post('/2fa/resend', [SecurityController::class, 'twoFactorResend'])->middleware('throttle:3,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('/verify-reset-otp', [AuthController::class, 'verifyResetOtp'])->middleware('throttle:5,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    // Mobile (Flutter) — Sanctum personal access tokens (no session/CSRF)
    Route::post('/mobile/login', [AuthController::class, 'mobileLogin'])->middleware('throttle:5,1');
    Route::post('/mobile/verify-email', [AuthController::class, 'mobileVerifyEmail'])->middleware('throttle:5,1');
    Route::post('/mobile/2fa/verify', [SecurityController::class, 'twoFactorVerifyLoginMobile'])->middleware('throttle:5,1');
});

// Mobile investor API surface (Flutter) — aliases + bootstrap
Route::prefix('mobile/v1')->group(function () {
    Route::get('/bootstrap', [MobileAppController::class, 'bootstrap']);

    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'mobileLogin'])->middleware('throttle:5,1');
        Route::post('/verify-email', [AuthController::class, 'mobileVerifyEmail'])->middleware('throttle:5,1');
        Route::post('/2fa/verify', [SecurityController::class, 'twoFactorVerifyLoginMobile'])->middleware('throttle:5,1');
    });
});

// Public CMS & catalog
Route::get('/settings', [PublicCmsController::class, 'settings']);
Route::get('/faqs', [PublicCmsController::class, 'faqs']);
Route::get('/certifications', [PublicCmsController::class, 'certifications']);
Route::get('/document-types', [PublicCmsController::class, 'documentTypes']);
Route::get('/testimonials', [PublicCmsController::class, 'testimonials']);

Route::get('/products', [PublicProductController::class, 'index']);
Route::get('/products/{slug}/lab-report', [PublicProductController::class, 'downloadLabReport']);
Route::get('/products/{slug}', [PublicProductController::class, 'show']);
Route::get('/categories', [PublicProductController::class, 'categories']);
Route::get('/imported-products', [ImportedProductController::class, 'index']);
Route::get('/countries', [LocationController::class, 'countries']);
Route::get('/countries/{country}/ports', [LocationController::class, 'ports']);
Route::get('/incoterms', [LocationController::class, 'incoterms']);
Route::get('/payment-methods', [LocationController::class, 'paymentMethods']);

Route::middleware('investment_module')->group(function () {
    Route::get('/investments', [PublicInvestmentController::class, 'index']);
    Route::get('/investments/{id}', [PublicInvestmentController::class, 'show']);
});

Route::get('/news', [NewsController::class, 'index']);
Route::get('/news/{slug}', [NewsController::class, 'show']);

Route::post('/contact', [ContactController::class, 'storeContact']);
Route::post('/newsletter', [ContactController::class, 'storeNewsletter']);
Route::post('/partner-applications', [ContactController::class, 'storePartner']);
Route::get('/bank-accounts', [FinanceController::class, 'publicBankAccounts']);

Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/mobile/logout', [AuthController::class, 'mobileLogout']);
        Route::post('/mobile/v1/auth/logout', [AuthController::class, 'mobileLogout']);
        Route::post('/auth/stop-impersonating', [AuthController::class, 'stopImpersonating']);
        Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::put('/me/password', [AuthController::class, 'changePassword']);

    Route::get('/me/sessions', [SecurityController::class, 'sessions']);
    Route::delete('/me/sessions/others', [SecurityController::class, 'destroyOtherSessions']);
    Route::delete('/me/sessions/{id}', [SecurityController::class, 'destroySession']);
    Route::get('/me/audit-logs', [SecurityController::class, 'auditLogs']);
    Route::get('/me/2fa', [SecurityController::class, 'twoFactorStatus']);
        Route::post('/me/2fa/enable', [SecurityController::class, 'twoFactorEnable'])->middleware('throttle:5,1');
        Route::post('/me/2fa/confirm', [SecurityController::class, 'twoFactorConfirm'])->middleware('throttle:5,1');
        Route::post('/me/2fa/disable', [SecurityController::class, 'twoFactorDisable'])->middleware('throttle:5,1');

        Route::post('/uploads', [UploadController::class, 'store'])->middleware('throttle:10,1');

    Route::get('/exchange-rates', ExchangeRateController::class);

    Route::get('/conversations/with-admin', [MessageController::class, 'withAdmin']);
    Route::get('/conversations', [MessageController::class, 'conversations']);
    Route::post('/conversations', [MessageController::class, 'storeConversation']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'storeMessage']);
    Route::post('/conversations/{conversation}/read', [MessageController::class, 'markRead']);
    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);

    Route::get('/support/tickets', [SupportTicketController::class, 'index']);
    Route::post('/support/tickets', [SupportTicketController::class, 'store']);
    Route::get('/support/tickets/unread-count', [SupportTicketController::class, 'unreadCount']);
    Route::get('/support/tickets/{id}', [SupportTicketController::class, 'show']);
    Route::post('/support/tickets/{id}/reply', [SupportTicketController::class, 'reply']);
    Route::post('/support/tickets/{id}/read', [SupportTicketController::class, 'markRead']);

    Route::get('/announcements', [SharedAnnouncementController::class, 'index']);
    Route::get('/announcements/unread-count', [SharedAnnouncementController::class, 'unreadCount']);
    Route::post('/announcements/{id}/read', [SharedAnnouncementController::class, 'markRead']);

    Route::get('/notifications', [SharedNotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [SharedNotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [SharedNotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read', [SharedNotificationController::class, 'markRead']);

    // Buyer
    Route::middleware('role:buyer')->prefix('buyer')->group(function () {
        Route::get('/dashboard', BuyerDashboardController::class);
        Route::get('/analytics', BuyerAnalyticsController::class);

        Route::get('/cart', [CartController::class, 'show']);
        Route::post('/cart', [CartController::class, 'add']);
        Route::put('/cart/{item}', [CartController::class, 'update']);
        Route::delete('/cart/{item}', [CartController::class, 'remove']);
        Route::post('/cart/checkout', [CartController::class, 'checkout']);
        Route::post('/cart/request-quotation', [CartController::class, 'requestQuotation']);

        Route::get('/rfqs', [BuyerRfqController::class, 'index']);
        Route::post('/rfqs', [BuyerRfqController::class, 'store']);
        Route::get('/rfqs/{id}', [BuyerRfqController::class, 'show']);

        Route::get('/quotations', [BuyerQuotationController::class, 'index']);
        Route::get('/quotations/{id}', [BuyerQuotationController::class, 'show']);
        Route::post('/quotations/{id}/accept', [BuyerQuotationController::class, 'accept']);
        Route::post('/quotations/{id}/reject', [BuyerQuotationController::class, 'reject']);
        Route::get('/quotations/{id}/messages', [BuyerQuotationController::class, 'messages']);
        Route::post('/quotations/{id}/messages', [BuyerQuotationController::class, 'storeMessage']);

        Route::get('/orders', [BuyerOrderController::class, 'index']);
        Route::get('/orders/{id}', [BuyerOrderController::class, 'show']);
        Route::get('/orders/{id}/pdf', [BuyerOrderController::class, 'pdf']);
        Route::post('/orders/{id}/repeat', [BuyerOrderController::class, 'repeat']);

        Route::get('/shipments', [BuyerShipmentController::class, 'index']);
        Route::get('/shipments/{id}', [BuyerShipmentController::class, 'show']);

        Route::get('/documents', [BuyerDocumentController::class, 'index']);
        Route::post('/documents', [BuyerDocumentController::class, 'store']);
        Route::get('/documents/{id}', [BuyerDocumentController::class, 'show']);
        Route::get('/documents/{id}/download', [BuyerDocumentController::class, 'download']);
        Route::get('/documents/{id}/view', [BuyerDocumentController::class, 'view']);

        Route::get('/payments/bank-accounts', [BuyerPaymentController::class, 'bankAccounts']);
        Route::get('/payments/history', [BuyerPaymentController::class, 'history']);
        Route::post('/payments/orders/{order}/mark-paid', [BuyerPaymentController::class, 'markPaid']);

        Route::get('/company', [BuyerCompanyController::class, 'show']);
        Route::put('/company', [BuyerCompanyController::class, 'update']);
        Route::put('/company/preferences', [BuyerCompanyController::class, 'updatePreferences']);
        Route::get('/company/contacts', [BuyerCompanyController::class, 'contactsIndex']);
        Route::post('/company/contacts', [BuyerCompanyController::class, 'contactsStore']);
        Route::put('/company/contacts/{id}', [BuyerCompanyController::class, 'contactsUpdate']);
        Route::delete('/company/contacts/{id}', [BuyerCompanyController::class, 'contactsDestroy']);
        Route::post('/company/kyc/upload', [BuyerCompanyController::class, 'kycUpload']);
    });

    // Supplier
    Route::middleware(['role:supplier', 'supplier_module'])->prefix('supplier')->group(function () {
        Route::get('/dashboard', SupplierDashboardController::class);
        Route::get('/profile', [SupplierProfileController::class, 'show']);
        Route::put('/profile', [SupplierProfileController::class, 'update']);
        Route::post('/profile/kyc/upload', [SupplierProfileController::class, 'kycUpload']);

        Route::get('/offer-settings', SupplierOfferSettingsController::class);
        Route::post('/offers/media', [SupplierOfferMediaController::class, 'store']);
        Route::get('/offers/stats', [SupplierOfferController::class, 'stats']);
        Route::get('/offers', [SupplierOfferController::class, 'index']);
        Route::post('/offers', [SupplierOfferController::class, 'store']);
        Route::get('/offers/{id}', [SupplierOfferController::class, 'show']);
        Route::put('/offers/{id}', [SupplierOfferController::class, 'update']);
    });

    // Investor
    Route::middleware(['role:investor', 'investment_module'])->prefix('investor')->group(function () {
        Route::get('/dashboard', InvestorDashboardController::class);

        Route::get('/reports', [InvestorReportController::class, 'index']);
        Route::post('/reports', [InvestorReportController::class, 'generate']);
        Route::get('/reports/{id}/download', [InvestorReportController::class, 'download']);
        Route::get('/statements', [\App\Http\Controllers\Api\Investor\StatementController::class, 'show']);
        Route::get('/statements/{month}/pdf', [\App\Http\Controllers\Api\Investor\StatementController::class, 'download'])
            ->where('month', '\d{4}-(0[1-9]|1[0-2])');

        Route::get('/profile', [InvestorProfileController::class, 'show']);
        Route::put('/profile', [InvestorProfileController::class, 'update']);
        Route::post('/profile/kyc/upload', [InvestorProfileController::class, 'kycUpload']);
        Route::get('/bank-accounts', [\App\Http\Controllers\Api\Investor\BankAccountController::class, 'index']);
        Route::post('/bank-accounts', [\App\Http\Controllers\Api\Investor\BankAccountController::class, 'store']);
        Route::patch('/bank-accounts/{id}/default', [\App\Http\Controllers\Api\Investor\BankAccountController::class, 'setDefault']);

        Route::get('/wallet', [InvestorWalletController::class, 'show']);
        Route::get('/wallet/exchange-rates', [InvestorWalletController::class, 'exchangeRates']);
        Route::get('/wallet/transactions', [InvestorWalletController::class, 'transactions']);
        Route::get('/wallet/transactions/{id}', [InvestorWalletController::class, 'transaction'])->whereNumber('id');
        Route::get('/wallet/transactions/{id}/pdf', [InvestorWalletController::class, 'transactionPdf']);

        Route::get('/projects', [InvestorProjectController::class, 'index']);
        Route::get('/facility-content/{type}', [InvestorFacilityContentController::class, 'show']);
        Route::get('/projects/{id}', [InvestorProjectController::class, 'show']);
        Route::get('/projects/{id}/documents/{documentId}/download', [InvestorProjectController::class, 'downloadDocument']);
        Route::get('/projects/{id}/updates/{updateId}/attachment', [InvestorProjectController::class, 'downloadTradeUpdateAttachment']);
        Route::post('/projects/{id}/invest', [InvestorProjectController::class, 'invest'])->middleware('throttle:5,1');
        Route::get('/investments', [InvestorProjectController::class, 'myInvestments']);
        Route::get('/investments/{id}', [InvestorProjectController::class, 'showInvestment']);
        Route::get('/investments/{id}/pdf', [InvestorProjectController::class, 'investmentPdf']);
        Route::get('/investments/{id}/export', [InvestorProjectController::class, 'exportInvestment']);

        Route::get('/payment-bank-accounts', [InvestorDepositController::class, 'paymentBankAccounts']);
        Route::get('/deposit-options', [InvestorDepositOptionController::class, 'index']);
        Route::get('/deposits', [InvestorDepositController::class, 'index']);
        Route::post('/deposits', [InvestorDepositController::class, 'store'])->middleware('throttle:5,1');
        Route::get('/deposits/{id}', [InvestorDepositController::class, 'show']);
        Route::get('/deposits/{id}/pdf', [InvestorDepositController::class, 'pdf']);

        Route::get('/withdrawals', [InvestorWithdrawalController::class, 'index']);
        Route::post('/withdrawals/otp/send', [InvestorWithdrawalController::class, 'sendOtp'])->middleware('throttle:3,1');
        Route::post('/withdrawals', [InvestorWithdrawalController::class, 'store'])->middleware('throttle:5,1');
        Route::get('/withdrawals/{id}', [InvestorWithdrawalController::class, 'show']);
        Route::get('/withdrawals/{id}/pdf', [InvestorWithdrawalController::class, 'pdf']);

        Route::get('/security/transaction-password', [SecurityController::class, 'transactionPasswordStatus']);
        Route::post('/security/transaction-password/set', [SecurityController::class, 'transactionPasswordSet'])->middleware('throttle:5,1');
        Route::post('/security/transaction-password/reset', [SecurityController::class, 'transactionPasswordReset'])->middleware('throttle:5,1');

        Route::get('/kyc', [InvestorKycController::class, 'index']);
        Route::post('/kyc', [InvestorKycController::class, 'store'])->middleware('throttle:5,1');
        Route::get('/kyc/{id}', [InvestorKycController::class, 'show']);

        Route::get('/notifications', [InvestorNotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [InvestorNotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [InvestorNotificationController::class, 'markAllRead']);
        Route::post('/notifications/{id}/read', [InvestorNotificationController::class, 'markRead']);
    });

    // Admin
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/reports', ReportController::class);

        Route::get('/module-counts', [ModuleCountController::class, 'index']);
        Route::post('/module-views/{module}', [ModuleCountController::class, 'markViewed']);

        Route::get('/notifications', [AdminNotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [AdminNotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [AdminNotificationController::class, 'markAllRead']);
        Route::post('/notifications/{id}/read', [AdminNotificationController::class, 'markRead']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::get('/users/{id}', [AdminUserController::class, 'show']);
        Route::get('/users/{id}/kyc', [AdminUserController::class, 'userKyc']);
        Route::post('/users/{id}/impersonate', [AdminUserController::class, 'impersonate']);
        Route::put('/users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

        Route::get('/products', [AdminProductController::class, 'index']);
        Route::post('/products', [AdminProductController::class, 'store']);
        Route::post('/products/images', [AdminProductController::class, 'uploadImages']);
        Route::get('/products/{id}', [AdminProductController::class, 'show']);
        Route::put('/products/{id}', [AdminProductController::class, 'update']);
        Route::patch('/products/{id}/status', [AdminProductController::class, 'updateStatus']);
        Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

        Route::put('/cms/site-settings', [AdminCmsController::class, 'updateSiteSettings']);
        Route::put('/cms/platform-settings', [AdminCmsController::class, 'updatePlatformSettings']);

        Route::get('/cms/news', [AdminCmsController::class, 'newsIndex']);
        Route::post('/cms/news', [AdminCmsController::class, 'newsStore']);
        Route::put('/cms/news/{id}', [AdminCmsController::class, 'newsUpdate']);
        Route::delete('/cms/news/{id}', [AdminCmsController::class, 'newsDestroy']);
        Route::post('/news/google-sync', GoogleNewsSyncController::class);

        Route::get('/cms/media', [AdminCmsController::class, 'mediaIndex']);
        Route::post('/cms/media', [AdminCmsController::class, 'mediaStore']);

        Route::get('/cms/faqs', [AdminCmsController::class, 'faqsIndex']);
        Route::post('/cms/faqs', [AdminCmsController::class, 'faqsStore']);
        Route::put('/cms/faqs/{id}', [AdminCmsController::class, 'faqsUpdate']);
        Route::delete('/cms/faqs/{id}', [AdminCmsController::class, 'faqsDestroy']);

        Route::get('/cms/certifications', [AdminCmsController::class, 'certificationsIndex']);
        Route::post('/cms/certifications', [AdminCmsController::class, 'certificationsStore']);
        Route::put('/cms/certifications/{id}', [AdminCmsController::class, 'certificationsUpdate']);
        Route::delete('/cms/certifications/{id}', [AdminCmsController::class, 'certificationsDestroy']);

        Route::get('/cms/testimonials', [AdminCmsController::class, 'testimonialsIndex']);
        Route::post('/cms/testimonials', [AdminCmsController::class, 'testimonialsStore']);
        Route::put('/cms/testimonials/{id}', [AdminCmsController::class, 'testimonialsUpdate']);
        Route::delete('/cms/testimonials/{id}', [AdminCmsController::class, 'testimonialsDestroy']);

        Route::get('/orders', [AdminOrderController::class, 'orders']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'showOrder']);
        Route::get('/orders/{id}/pdf', [AdminOrderController::class, 'pdf']);
        Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateOrderStatus']);
        Route::get('/orders/{id}/documents', [AdminOrderTradeDocumentController::class, 'index']);
        Route::post('/orders/{id}/documents', [AdminOrderTradeDocumentController::class, 'store']);
        Route::delete('/orders/{id}/documents/{documentId}', [AdminOrderTradeDocumentController::class, 'destroy']);
        Route::get('/orders/{id}/documents/{documentId}/download', [AdminOrderTradeDocumentController::class, 'download']);
        Route::get('/orders/{id}/documents/{documentId}/view', [AdminOrderTradeDocumentController::class, 'view']);
        Route::get('/rfqs', [AdminOrderController::class, 'rfqs']);

        Route::get('/fob-prices', [AdminQuotationController::class, 'fobIndex']);
        Route::post('/fob-prices', [AdminQuotationController::class, 'fobStore']);
        Route::put('/fob-prices/{id}', [AdminQuotationController::class, 'fobUpdate']);
        Route::delete('/fob-prices/{id}', [AdminQuotationController::class, 'fobDestroy']);
        Route::get('/quotations', [AdminQuotationController::class, 'index']);
        Route::post('/rfqs/{rfq}/quotations', [AdminQuotationController::class, 'storeFromRfq']);
        Route::post('/quotations/{id}/send', [AdminQuotationController::class, 'send']);
        Route::get('/quotations/{id}/messages', [AdminQuotationController::class, 'messages']);
        Route::post('/quotations/{id}/messages', [AdminQuotationController::class, 'storeMessage']);
        Route::get('/public-quotations', [AdminPublicQuotationController::class, 'index']);
        Route::put('/public-quotations/{id}', [AdminPublicQuotationController::class, 'update']);

        Route::get('/shipments', [AdminShipmentController::class, 'index']);
        Route::post('/shipments', [AdminShipmentController::class, 'store']);
        Route::get('/shipments/{id}', [AdminShipmentController::class, 'show']);
        Route::put('/shipments/{id}', [AdminShipmentController::class, 'update']);
        Route::delete('/shipments/{id}', [AdminShipmentController::class, 'destroy']);
        Route::post('/shipments/{id}/milestones', [AdminShipmentController::class, 'storeMilestone']);
        Route::put('/shipments/{id}/milestones/{milestone}', [AdminShipmentController::class, 'updateMilestone']);
        Route::get('/shipments/{id}/documents', [AdminTradeDocumentController::class, 'index']);
        Route::post('/shipments/{id}/documents', [AdminTradeDocumentController::class, 'store']);
        Route::delete('/shipments/{id}/documents/{documentId}', [AdminTradeDocumentController::class, 'destroy']);
        Route::get('/shipments/{id}/documents/{documentId}/download', [AdminTradeDocumentController::class, 'download']);
        Route::get('/shipments/{id}/documents/{documentId}/view', [AdminTradeDocumentController::class, 'view']);

        Route::get('/finance/exchange-rates', [FinanceController::class, 'exchangeRates']);
        Route::get('/finance/stats', [FinanceController::class, 'stats']);
        Route::get('/finance/buyer-deposits', [FinanceController::class, 'buyerDeposits']);
        Route::post('/finance/buyer-deposits/{id}/approve', [FinanceController::class, 'approveBuyerDeposit']);
        Route::post('/finance/buyer-deposits/{id}/reject', [FinanceController::class, 'rejectBuyerDeposit']);
        Route::post('/finance/buyer-deposits/{id}/cancel', [FinanceController::class, 'cancelBuyerDeposit']);
        Route::get('/finance/transactions', [FinanceController::class, 'transactions']);
        Route::get('/finance/bank-accounts', [FinanceController::class, 'bankAccounts']);
        Route::post('/finance/bank-accounts', [FinanceController::class, 'storeBankAccount']);
        Route::put('/finance/bank-accounts/{id}', [FinanceController::class, 'updateBankAccount']);
        Route::delete('/finance/bank-accounts/{id}', [FinanceController::class, 'destroyBankAccount']);

        Route::middleware('investment_module')->group(function () {
            Route::get('/finance/deposits', [FinanceController::class, 'deposits']);
            Route::get('/finance/deposits/{id}/proof', [FinanceController::class, 'depositProof']);
            Route::post('/finance/deposits/{id}/approve', [FinanceController::class, 'approveDeposit']);
            Route::post('/finance/deposits/{id}/reject', [FinanceController::class, 'rejectDeposit']);
            Route::post('/finance/deposits/{id}/cancel', [FinanceController::class, 'cancelDeposit']);
            Route::get('/finance/withdrawals', [FinanceController::class, 'withdrawals']);
            Route::post('/finance/withdrawals/{id}/approve', [FinanceController::class, 'approveWithdrawal']);
            Route::post('/finance/withdrawals/{id}/reject', [FinanceController::class, 'rejectWithdrawal']);
            Route::get('/finance/platform-wallet', [FinanceController::class, 'platformWallet']);
            Route::get('/finance/platform-wallet/transactions', [FinanceController::class, 'platformWalletTransactions']);
        });

        Route::get('/incoterms', [AdminIncotermController::class, 'index']);
        Route::post('/incoterms', [AdminIncotermController::class, 'store']);
        Route::put('/incoterms/{id}', [AdminIncotermController::class, 'update']);
        Route::delete('/incoterms/{id}', [AdminIncotermController::class, 'destroy']);

        Route::get('/deposit-options', [AdminDepositOptionController::class, 'index']);
        Route::post('/deposit-options', [AdminDepositOptionController::class, 'store']);
        Route::put('/deposit-options/{id}', [AdminDepositOptionController::class, 'update']);
        Route::delete('/deposit-options/{id}', [AdminDepositOptionController::class, 'destroy']);

        Route::get('/payment-methods', [AdminPaymentMethodController::class, 'index']);
        Route::post('/payment-methods', [AdminPaymentMethodController::class, 'store']);
        Route::put('/payment-methods/{id}', [AdminPaymentMethodController::class, 'update']);
        Route::delete('/payment-methods/{id}', [AdminPaymentMethodController::class, 'destroy']);

        Route::middleware('supplier_module')->group(function () {
            Route::get('/supplier-certifications', [AdminSupplierCertificationController::class, 'index']);
            Route::post('/supplier-certifications', [AdminSupplierCertificationController::class, 'store']);
            Route::put('/supplier-certifications/{id}', [AdminSupplierCertificationController::class, 'update']);
            Route::delete('/supplier-certifications/{id}', [AdminSupplierCertificationController::class, 'destroy']);

            Route::get('/supplier-packaging-sizes', [AdminSupplierPackagingSizeController::class, 'index']);
            Route::post('/supplier-packaging-sizes', [AdminSupplierPackagingSizeController::class, 'store']);
            Route::put('/supplier-packaging-sizes/{id}', [AdminSupplierPackagingSizeController::class, 'update']);
            Route::delete('/supplier-packaging-sizes/{id}', [AdminSupplierPackagingSizeController::class, 'destroy']);

            Route::get('/supplier-payment-terms', [AdminSupplierPaymentTermController::class, 'index']);
            Route::post('/supplier-payment-terms', [AdminSupplierPaymentTermController::class, 'store']);
            Route::put('/supplier-payment-terms/{id}', [AdminSupplierPaymentTermController::class, 'update']);
            Route::delete('/supplier-payment-terms/{id}', [AdminSupplierPaymentTermController::class, 'destroy']);

            Route::get('/supplier-offers/stats', [AdminSupplierOfferController::class, 'stats']);
            Route::get('/supplier-offers', [AdminSupplierOfferController::class, 'index']);
            Route::get('/supplier-offers/{id}', [AdminSupplierOfferController::class, 'show']);
            Route::patch('/supplier-offers/{id}/status', [AdminSupplierOfferController::class, 'updateStatus']);
            Route::post('/supplier-offers/{id}/notes', [AdminSupplierOfferController::class, 'addNote']);
            Route::post('/supplier-offers/{id}/rate', [AdminSupplierOfferController::class, 'rate']);
        });

        Route::middleware('investment_module')->group(function () {
            Route::get('/projects/{id}/container-tracking', [InvestmentProjectContainerTrackingController::class, 'show']);
            Route::patch('/projects/{id}/container-tracking', [InvestmentProjectContainerTrackingController::class, 'update']);
            Route::get('/projects/{id}/updates', [InvestmentProjectTradeUpdateController::class, 'index']);
            Route::post('/projects/{id}/updates', [InvestmentProjectTradeUpdateController::class, 'store']);
            Route::get('/projects/{id}/stage-updates', [InvestmentProjectStageUpdateController::class, 'index']);
            Route::post('/projects/{id}/stage-updates', [InvestmentProjectStageUpdateController::class, 'store']);

            Route::get('/investment-projects', [AdminInvestmentController::class, 'index']);
            Route::get('/investment-projects/active', [AdminInvestmentController::class, 'activeProjects']);
            Route::get('/investment-projects/stats', [AdminInvestmentController::class, 'stats']);
            Route::post('/investment-projects', [AdminInvestmentController::class, 'store']);
            Route::post('/investment-projects/images', [AdminInvestmentController::class, 'uploadImage']);
            Route::get('/investment-projects/{id}', [AdminInvestmentController::class, 'show']);
            Route::get('/investment-projects/{id}/detail', [AdminInvestmentController::class, 'detail']);
            Route::put('/investment-projects/{id}', [AdminInvestmentController::class, 'update']);
            Route::delete('/investment-projects/{id}', [AdminInvestmentController::class, 'destroy']);
            Route::post('/investment-projects/{id}/investments/approve-next', [AdminInvestmentController::class, 'approveNextInvestment']);
            Route::post('/investment-projects/{id}/investments/{investmentId}/approve', [AdminInvestmentController::class, 'approveInvestment']);
            Route::post('/investment-projects/{id}/investments/{investmentId}/reject', [AdminInvestmentController::class, 'rejectInvestment']);
            Route::get('/investment-projects/{id}/documents', [AdminInvestmentProjectDocumentController::class, 'index']);
            Route::post('/investment-projects/{id}/documents', [AdminInvestmentProjectDocumentController::class, 'store']);
            Route::delete('/investment-projects/{id}/documents/{documentId}', [AdminInvestmentProjectDocumentController::class, 'destroy']);
            Route::get('/investment-projects/{id}/documents/{documentId}/download', [AdminInvestmentProjectDocumentController::class, 'download']);

            Route::get('/project-investments', [AdminProjectInvestmentController::class, 'index']);
            Route::get('/project-investments/{id}', [AdminProjectInvestmentController::class, 'show']);
            Route::post('/project-investments/{id}/approve', [AdminProjectInvestmentController::class, 'approve']);
            Route::post('/project-investments/{id}/reject', [AdminProjectInvestmentController::class, 'reject']);
            Route::patch('/project-investments/{id}/status', [AdminProjectInvestmentController::class, 'updateStatus']);

            Route::get('/facility-content/{type}', [AdminFacilityContentController::class, 'show']);
            Route::put('/facility-content/{type}', [AdminFacilityContentController::class, 'update']);

            Route::get('/investment-profit-distributions', [InvestmentProfitDistributionController::class, 'index']);
            Route::get('/investment-payout-progress', [InvestmentProfitDistributionController::class, 'payoutProgressIndex']);
            Route::patch('/investment-payout-progress/{investmentId}', [InvestmentProfitDistributionController::class, 'updatePayoutProgress']);
        });

        Route::get('/compliance/kyc', [ComplianceController::class, 'kycIndex']);
        Route::get('/compliance/kyc/{id}', [ComplianceController::class, 'kycShow']);
        Route::post('/compliance/kyc/{id}/approve', [ComplianceController::class, 'kycApprove']);
        Route::post('/compliance/kyc/{id}/reject', [ComplianceController::class, 'kycReject']);
        Route::get('/compliance/kyc/{kycId}/documents/{documentId}/view', [ComplianceController::class, 'kycDocumentView']);
        Route::get('/compliance/kyc/{kycId}/documents/{documentId}/download', [ComplianceController::class, 'kycDocumentDownload']);
        Route::get('/compliance/bank-accounts', [\App\Http\Controllers\Api\Admin\InvestorBankAccountReviewController::class, 'index']);
        Route::get('/compliance/bank-accounts/{verification}/proof', [\App\Http\Controllers\Api\Admin\InvestorBankAccountReviewController::class, 'proof']);
        Route::post('/compliance/bank-accounts/{verification}/approve', [\App\Http\Controllers\Api\Admin\InvestorBankAccountReviewController::class, 'approve']);
        Route::post('/compliance/bank-accounts/{verification}/reject', [\App\Http\Controllers\Api\Admin\InvestorBankAccountReviewController::class, 'reject']);
        Route::get('/compliance/aml', [ComplianceController::class, 'amlIndex']);
        Route::patch('/compliance/aml/{id}', [ComplianceController::class, 'amlUpdate']);
        Route::get('/compliance/audit-logs', [ComplianceController::class, 'auditLogs']);

        Route::get('/crm/leads', [CrmController::class, 'index']);
        Route::post('/crm/leads', [CrmController::class, 'store']);
        Route::get('/crm/leads/{id}', [CrmController::class, 'show']);
        Route::put('/crm/leads/{id}', [CrmController::class, 'update']);
        Route::delete('/crm/leads/{id}', [CrmController::class, 'destroy']);
        Route::post('/crm/leads/{id}/activities', [CrmController::class, 'storeActivity']);

        Route::get('/support/tickets', [AdminSupportController::class, 'index']);
        Route::get('/support/tickets/unread-count', [AdminSupportController::class, 'unreadCount']);
        Route::get('/support/tickets/{id}', [AdminSupportController::class, 'show']);
        Route::post('/support/tickets/{id}/reply', [AdminSupportController::class, 'reply']);
        Route::patch('/support/tickets/{id}/status', [AdminSupportController::class, 'updateStatus']);
        Route::post('/support/tickets/{id}/read', [AdminSupportController::class, 'markRead']);

        Route::get('/conversations', [AdminMessageController::class, 'index']);
        Route::post('/conversations/ensure', [AdminMessageController::class, 'ensureForUser']);
        Route::get('/conversations/{id}/messages', [AdminMessageController::class, 'messages']);
        Route::post('/conversations/{id}/messages', [AdminMessageController::class, 'storeMessage']);
        Route::post('/conversations/{id}/read', [AdminMessageController::class, 'markRead']);
        Route::get('/messages/unread-count', [AdminMessageController::class, 'unreadCount']);

        Route::get('/announcements', [AdminAnnouncementController::class, 'index']);
        Route::post('/announcements', [AdminAnnouncementController::class, 'store']);
        Route::get('/announcements/{id}', [AdminAnnouncementController::class, 'show']);
        Route::put('/announcements/{id}', [AdminAnnouncementController::class, 'update']);
        Route::delete('/announcements/{id}', [AdminAnnouncementController::class, 'destroy']);
    });
});
