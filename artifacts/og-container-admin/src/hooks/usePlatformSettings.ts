import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { getSettings, type AdminSettings } from "@/lib/admin-data"
import { parsePlatformBool } from "@/lib/parse-platform-bool"

function mapSettings(raw: any): AdminSettings {
  const base = getSettings()
  if (!raw) return base
  const prefs = raw.notification_prefs || raw.notifications || {}
  return {
    ...base,
    siteName: raw.site_name || raw.siteName || base.siteName,
    tagline: raw.tagline || base.tagline,
    supportEmail: raw.support_email || raw.supportEmail || base.supportEmail,
    whatsapp: raw.whatsapp || base.whatsapp,
    maintenanceMode: Boolean(raw.maintenance_mode ?? raw.maintenanceMode ?? base.maintenanceMode),
    registrationOpen: raw.registration_open !== undefined ? Boolean(raw.registration_open) : base.registrationOpen,
    kycRequired: raw.kyc_required !== undefined ? Boolean(raw.kyc_required) : base.kycRequired,
    investmentOpen: raw.investment_open !== undefined ? Boolean(raw.investment_open) : base.investmentOpen,
    investmentModuleEnabled: raw.investment_module_enabled !== undefined
      ? Boolean(raw.investment_module_enabled)
      : (raw.investmentModuleEnabled !== undefined ? Boolean(raw.investmentModuleEnabled) : base.investmentModuleEnabled),
    supplierModuleEnabled: raw.supplier_module_enabled !== undefined
      ? Boolean(raw.supplier_module_enabled)
      : (raw.supplierModuleEnabled !== undefined ? Boolean(raw.supplierModuleEnabled) : base.supplierModuleEnabled),
    adminOtpEnabled: raw.admin_otp_enabled !== undefined
      ? Boolean(raw.admin_otp_enabled)
      : (raw.adminOtpEnabled !== undefined ? Boolean(raw.adminOtpEnabled) : base.adminOtpEnabled),
    investPlantVisible: raw.invest_plant_visible !== undefined
      ? Boolean(raw.invest_plant_visible)
      : (raw.investPlantVisible !== undefined ? Boolean(raw.investPlantVisible) : base.investPlantVisible),
    investFeedsVisible: raw.invest_feeds_visible !== undefined
      ? Boolean(raw.invest_feeds_visible)
      : (raw.investFeedsVisible !== undefined ? Boolean(raw.investFeedsVisible) : base.investFeedsVisible),
    investRicemillVisible: raw.invest_ricemill_visible !== undefined
      ? Boolean(raw.invest_ricemill_visible)
      : (raw.investRicemillVisible !== undefined ? Boolean(raw.investRicemillVisible) : base.investRicemillVisible),
    investYellowMaizeVisible: raw.invest_yellow_maize_visible !== undefined
      ? Boolean(raw.invest_yellow_maize_visible)
      : (raw.investYellowMaizeVisible !== undefined ? Boolean(raw.investYellowMaizeVisible) : base.investYellowMaizeVisible),
    investProduceVisible: raw.invest_produce_visible !== undefined
      ? Boolean(raw.invest_produce_visible)
      : (raw.investProduceVisible !== undefined ? Boolean(raw.investProduceVisible) : base.investProduceVisible),
    investPkrDisplayEnabled: parsePlatformBool(
      raw.invest_pkr_display_enabled !== undefined
        ? raw.invest_pkr_display_enabled
        : raw.investPkrDisplayEnabled,
      base.investPkrDisplayEnabled,
    ),
    investDualCurrencyEnabled: parsePlatformBool(
      raw.invest_dual_currency_enabled !== undefined
        ? raw.invest_dual_currency_enabled
        : raw.investDualCurrencyEnabled,
      base.investDualCurrencyEnabled,
    ),
    supplierPkrDisplayEnabled: parsePlatformBool(
      raw.supplier_pkr_display_enabled !== undefined
        ? raw.supplier_pkr_display_enabled
        : raw.supplierPkrDisplayEnabled,
      base.supplierPkrDisplayEnabled,
    ),
    buyerPkrDisplayEnabled: parsePlatformBool(
      raw.buyer_pkr_display_enabled !== undefined
        ? raw.buyer_pkr_display_enabled
        : raw.buyerPkrDisplayEnabled,
      base.buyerPkrDisplayEnabled,
    ),
    currency: raw.currency || base.currency,
    minInvestment: Number(raw.min_investment ?? raw.minInvestment ?? base.minInvestment),
    notifications: {
      emailOnOrder: prefs.emailOnOrder ?? prefs.email ?? base.notifications.emailOnOrder,
      emailOnDeposit: prefs.emailOnDeposit ?? prefs.email ?? base.notifications.emailOnDeposit,
      smsOnKYC: prefs.smsOnKYC ?? prefs.sms ?? base.notifications.smsOnKYC,
      whatsappAlerts: prefs.whatsappAlerts ?? prefs.whatsapp ?? base.notifications.whatsappAlerts,
    },
  }
}

export function usePlatformSettings() {
  const query = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const res = await api.publicGet("/api/settings")
      const data = (res as any)?.data ?? res
      return mapSettings(data)
    },
    staleTime: 15_000,
    placeholderData: () => getSettings(),
  })

  const settings = query.data ?? getSettings()

  return {
    settings,
    isLoading: query.isLoading,
    supplierModuleEnabled: settings.supplierModuleEnabled !== false,
    investmentModuleEnabled: settings.investmentModuleEnabled !== false,
    investmentOpen: settings.investmentOpen !== false,
    registrationOpen: settings.registrationOpen !== false,
    investPkrDisplayEnabled: parsePlatformBool(settings.investPkrDisplayEnabled, true),
    investDualCurrencyEnabled: parsePlatformBool(settings.investDualCurrencyEnabled, false),
    supplierPkrDisplayEnabled: parsePlatformBool(settings.supplierPkrDisplayEnabled, true),
    buyerPkrDisplayEnabled: parsePlatformBool(settings.buyerPkrDisplayEnabled, true),
    investCategoryVisible: {
      produce: settings.investProduceVisible === true,
      plant: settings.investPlantVisible === true,
      feeds: settings.investFeedsVisible === true,
      ricemill: settings.investRicemillVisible === true,
      yellowMaize: settings.investYellowMaizeVisible === true,
    },
    refetch: query.refetch,
  }
}
