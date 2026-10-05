/** Executive dashboard API response types (GET /api/admin/dashboard) */

export interface DashboardKpis {
  revenue: {
    total: number
    monthly: number
    annual: number
    gross_profit: number
    net_profit: number
    growth_pct: number
    monthly_growth_pct: number
    month_label: string
    year_label: string
  }
  buyers: {
    total: number
    active: number
    new_this_month: number
    retention_pct: number
  }
  investors: {
    total: number
    active: number
    investment_value: number
  }
  orders: {
    total: number
    active: number
    completed: number
    pending: number
    cancelled: number
  }
  rfqs: {
    today: number
    quotations_pending: number
    quotations_approved: number
    quotations_rejected: number
  }
  shipments: {
    in_progress: number
    containers_transit: number
    delivered: number
  }
  inventory: {
    imported_products: number
    warehouse_items: number
    low_stock_alerts: number
    total_value: number
  }
  payments: {
    pending: number
    completed: number
    outstanding: number
  }
}

export interface DashboardPipelineOrder {
  id: string
  buyer: string
  product: string
  qty: string
  stage: string
  eta: string
  value: number
  status: string
}

export interface DashboardDestination {
  name: string
  flag: string
  orders: number
  revenue: number
}

export interface DashboardActivityItem {
  id: string
  type: string
  icon: string
  color: string
  title: string
  detail: string
  time: string
}

export interface DashboardNotification {
  id: number
  type: string
  icon: string
  color: string
  title: string
  detail: string
  time: string
}

export interface DashboardWarehouseItem {
  product: string
  sku: string
  qty: number
  unit: string
  location: string
  value: number
  status: string
}

export interface DashboardSupplierOffer {
  id: number
  supplier: string
  product: string
  qty: string
  price: string
  quality: string
  delivery: string
  status: string
}

export interface DashboardOpenProject {
  id: string
  title: string
  target: number
  raised_pct: number
  roi: string
  eta: string
}

export interface DashboardInvestmentSummary {
  total_investment: number
  active_portfolio: number
  portfolio_value: number
  total_investors: number
  avg_roi_pct: number
  active_projects: number
  open_projects: DashboardOpenProject[]
}

export interface DashboardInvestorAnalytics {
  period: string
  active_investors_30d: number
  new_investors: number
  investment_count: number
  invested_amount: number
  average_investment: number | null
  funding_projects_count: number
  funding_target: number
  funded_amount: number
  funding_conversion_pct: number | null
  realized_profit: number | null
  realized_return_pct: number | null
  realized_investments_count: number
  wallet_transaction_count: number
  wallet_completed_amounts_by_currency: Array<{
    currency: string
    credits: number
    debits: number
  }>
  withdrawal_request_count: number
  approved_withdrawal_count: number
  average_funding_days: number | null
  funding_speed_samples: number
  investor_growth: Array<{ month: string; new_investors: number }>
  investment_activity: Array<{ month: string; investments: number; amount: number }>
  wallet_activity: Array<{ month: string; credits: number; debits: number }>
  withdrawal_activity: Array<{ month: string; requests: number; approved: number }>
  top_commodities: Array<{ name: string; investment_count: number; investment_amount: number }>
  top_destinations: Array<{ name: string; investment_count: number; investment_amount: number }>
}

export interface DashboardCharts {
  revenue_trend: Array<{ month: string; revenue: number; profit: number; expenses: number }>
  buyer_growth: Array<{ month: string; buyers: number; investors: number; suppliers: number }>
  product_performance: Array<{ name: string; orders: number; revenue: number; growth: number }>
  country_performance: DashboardDestination[]
  currency_breakdown: Array<{ currency: string; volume: number; orders: number; pct: number; avg: number }>
}

export interface DashboardCalendarEvent {
  date: string
  title: string
  type: string
  time: string
}

export interface DashboardSecurityLog {
  user: string
  action: string
  ip: string
  time: string
  status: string
}

export interface DashboardSecurity {
  audit_log_count: number
  failed_attempts_today: number
  failed_attempts_7d: number
  logs: DashboardSecurityLog[]
}

export interface DashboardFinanceSummary {
  total_deposits: number
  pending_deposits: number
  total_withdrawals: number
  pending_withdrawals: number
  total_deposits_count: number
  pending_deposits_count: number
  total_withdrawals_count: number
  pending_withdrawals_count: number
}

export interface DashboardContainerProjectsByStatus {
  funding: number
  investment_confirmed: number
  cargo_loaded: number
  in_transit: number
  custom_clearance: number
  settled: number
  cancelled: number
  total: number
}

export interface AdminDashboardData {
  users: number
  buyers: number
  suppliers: number
  investors: number
  products: number
  products_pending: number
  orders: number
  orders_open: number
  rfqs: number
  rfqs_open: number
  supplier_offers_pending: number
  deposits_pending: number
  withdrawals_pending: number
  kyc_pending: number
  aml_open: number
  investment_projects: number
  investments: number
  crm_leads: number
  support_open: number
  period?: string
  kpis: DashboardKpis
  finance_summary: DashboardFinanceSummary
  container_projects_by_status: DashboardContainerProjectsByStatus
  export_pipeline: DashboardPipelineOrder[]
  top_destinations: DashboardDestination[]
  activity_feed: DashboardActivityItem[]
  smart_notifications: DashboardNotification[]
  warehouse: DashboardWarehouseItem[]
  supplier_offers: DashboardSupplierOffer[]
  investment_summary: DashboardInvestmentSummary
  investor_analytics: DashboardInvestorAnalytics
  charts: DashboardCharts
  calendar_events: DashboardCalendarEvent[]
  security: DashboardSecurity
  generated_at: string
}

export const EMPTY_DASHBOARD: AdminDashboardData = {
  users: 0,
  buyers: 0,
  suppliers: 0,
  investors: 0,
  products: 0,
  products_pending: 0,
  orders: 0,
  orders_open: 0,
  rfqs: 0,
  rfqs_open: 0,
  supplier_offers_pending: 0,
  deposits_pending: 0,
  withdrawals_pending: 0,
  kyc_pending: 0,
  aml_open: 0,
  investment_projects: 0,
  investments: 0,
  crm_leads: 0,
  support_open: 0,
  kpis: {
    revenue: {
      total: 0,
      monthly: 0,
      annual: 0,
      gross_profit: 0,
      net_profit: 0,
      growth_pct: 0,
      monthly_growth_pct: 0,
      month_label: "",
      year_label: "",
    },
    buyers: { total: 0, active: 0, new_this_month: 0, retention_pct: 0 },
    investors: { total: 0, active: 0, investment_value: 0 },
    orders: { total: 0, active: 0, completed: 0, pending: 0, cancelled: 0 },
    rfqs: { today: 0, quotations_pending: 0, quotations_approved: 0, quotations_rejected: 0 },
    shipments: { in_progress: 0, containers_transit: 0, delivered: 0 },
    inventory: { imported_products: 0, warehouse_items: 0, low_stock_alerts: 0, total_value: 0 },
    payments: { pending: 0, completed: 0, outstanding: 0 },
  },
  finance_summary: {
    total_deposits: 0,
    pending_deposits: 0,
    total_withdrawals: 0,
    pending_withdrawals: 0,
    total_deposits_count: 0,
    pending_deposits_count: 0,
    total_withdrawals_count: 0,
    pending_withdrawals_count: 0,
  },
  container_projects_by_status: {
    funding: 0,
    investment_confirmed: 0,
    cargo_loaded: 0,
    in_transit: 0,
    custom_clearance: 0,
    settled: 0,
    cancelled: 0,
    total: 0,
  },
  export_pipeline: [],
  top_destinations: [],
  activity_feed: [],
  smart_notifications: [],
  warehouse: [],
  supplier_offers: [],
  investment_summary: {
    total_investment: 0,
    active_portfolio: 0,
    portfolio_value: 0,
    total_investors: 0,
    avg_roi_pct: 0,
    active_projects: 0,
    open_projects: [],
  },
  investor_analytics: {
    period: "month",
    active_investors_30d: 0,
    new_investors: 0,
    investment_count: 0,
    invested_amount: 0,
    average_investment: null,
    funding_projects_count: 0,
    funding_target: 0,
    funded_amount: 0,
    funding_conversion_pct: null,
    realized_profit: null,
    realized_return_pct: null,
    realized_investments_count: 0,
    wallet_transaction_count: 0,
    wallet_completed_amounts_by_currency: [],
    withdrawal_request_count: 0,
    approved_withdrawal_count: 0,
    average_funding_days: null,
    funding_speed_samples: 0,
    investor_growth: [],
    investment_activity: [],
    wallet_activity: [],
    withdrawal_activity: [],
    top_commodities: [],
    top_destinations: [],
  },
  charts: {
    revenue_trend: [],
    buyer_growth: [],
    product_performance: [],
    country_performance: [],
    currency_breakdown: [],
  },
  calendar_events: [],
  security: {
    audit_log_count: 0,
    failed_attempts_today: 0,
    failed_attempts_7d: 0,
    logs: [],
  },
  generated_at: "",
}
