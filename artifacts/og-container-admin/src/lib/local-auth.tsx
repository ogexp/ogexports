import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { api, ApiError } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountType = "buyer" | "supplier" | "investor" | "admin"

export interface LocalUser {
  id: string
  fullName: string
  email: string
  phone: string
  country: string
  accountType: AccountType
  createdAt: string
  avatarUrl?: string | null
  companyName?: string | null
  impersonating?: boolean
  impersonatorName?: string | null
}

export interface RegisterData {
  fullName: string
  email: string
  phone?: string
  country: string
  password: string
  accountType: AccountType
  companyName?: string
}

interface LocalAuthContextValue {
  user: LocalUser | null
  isLoaded: boolean
  isSignedIn: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<{
    success: boolean
    error?: string
    accountType?: AccountType
    requires2fa?: boolean
    twoFactorToken?: string
    maskedEmail?: string
    requiresVerification?: boolean
    email?: string
    devOtp?: string
  }>
  verifyTwoFactor: (token: string, code: string, remember?: boolean) => Promise<{
    success: boolean
    error?: string
    accountType?: AccountType
  }>
  register: (data: RegisterData) => Promise<{
    success: boolean
    error?: string
    requiresVerification?: boolean
    email?: string
    maskedEmail?: string
    devOtp?: string
  }>
  verifyEmail: (email: string, code: string) => Promise<{
    success: boolean
    error?: string
    accountType?: AccountType
  }>
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string; devOtp?: string }>
  forgotPasswordSendOtp: (email: string) => Promise<{ success: boolean; error?: string; devOtp?: string }>
  verifyResetOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (data: Partial<Pick<LocalUser, "fullName" | "phone" | "accountType" | "avatarUrl" | "companyName" | "country">>) => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  stopImpersonating: () => Promise<{ success: boolean; redirect?: string }>
}

function mapUser(raw: any): LocalUser {
  const role = (raw.accountType || raw.account_type || raw.roles?.[0] || "investor") as AccountType
  return {
    id: String(raw.id),
    fullName: raw.fullName || raw.name || "",
    email: raw.email || "",
    phone: raw.phone || "",
    country: raw.profile?.country || raw.country || "",
    accountType: role,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    avatarUrl: raw.profile?.avatarUrl || raw.profile?.avatar_url || null,
    companyName: raw.profile?.companyName || raw.profile?.company_name || null,
    impersonating: Boolean(raw.impersonating),
    impersonatorName: raw.impersonator?.name || null,
  }
}

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null)

async function stopImpersonatingInternal(setUser: (u: LocalUser | null) => void) {
  try {
    const res = await api.post<any>("/api/auth/stop-impersonating")
    const mapped = mapUser(res.user || res.data || res)
    setUser(mapped)
    return { success: true, redirect: res.redirect || "/admin/dashboard" }
  } catch {
    return { success: false }
  }
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<any>("/api/me")
      const payload = me?.data || me
      setUser(mapUser(payload))
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoaded(true))
  }, [refreshUser])

  const login = useCallback(async (
    email: string,
    password: string,
    remember = false,
  ) => {
    try {
      const res = await api.post<any>("/api/auth/login", { email, password, remember })
      if (res?.requires_2fa) {
        return {
          success: false,
          requires2fa: true,
          twoFactorToken: res.token,
          maskedEmail: res.email,
          devOtp: res.dev_otp as string | undefined,
        }
      }
      const mapped = mapUser(res.user)
      setUser(mapped)
      return { success: true, accountType: mapped.accountType }
    } catch (e) {
      if (e instanceof TypeError || (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message))) {
        return {
          success: false,
          error: "Cannot reach the API. Start `php artisan serve` and restart the frontend dev server.",
        }
      }
      const err = e as ApiError
      if (err.payload?.requires_verification) {
        return {
          success: false,
          requiresVerification: true,
          email: String(err.payload.email || email),
          maskedEmail: String(err.payload.masked_email || email),
          devOtp: err.payload.dev_otp as string | undefined,
          error: err.message,
        }
      }
      const msg = err.errors?.email?.[0] || err.message || "Sign-in failed."
      return { success: false, error: msg }
    }
  }, [])

  const verifyTwoFactor = useCallback(async (
    token: string,
    code: string,
    remember = false,
  ): Promise<{ success: boolean; error?: string; accountType?: AccountType }> => {
    try {
      const res = await api.post<any>("/api/auth/2fa/verify", { token, code, remember })
      const mapped = mapUser(res.user)
      setUser(mapped)
      return { success: true, accountType: mapped.accountType }
    } catch (e) {
      const err = e as ApiError
      const msg = err.errors?.code?.[0] || err.message || "Invalid code."
      return { success: false, error: msg }
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await api.post<any>("/api/auth/register", {
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        country: data.country,
        password: data.password,
        password_confirmation: data.password,
        account_type: data.accountType === "admin" ? "buyer" : data.accountType,
        company_name: data.companyName,
      })
      if (res?.requires_verification) {
        return {
          success: true,
          requiresVerification: true,
          email: res.email,
          maskedEmail: res.masked_email,
          devOtp: res.dev_otp as string | undefined,
        }
      }
      if (res.user) {
        const mapped = mapUser(res.user)
        setUser(mapped)
      }
      return { success: true }
    } catch (e) {
      const err = e as ApiError
      const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined
      return { success: false, error: first || err.message || "Registration failed." }
    }
  }, [])

  const verifyEmail = useCallback(async (email: string, code: string) => {
    try {
      const res = await api.post<any>("/api/auth/verify-email", { email, code })
      const mapped = mapUser(res.user)
      setUser(mapped)
      return { success: true, accountType: mapped.accountType }
    } catch (e) {
      const err = e as ApiError
      const msg = err.errors?.code?.[0] || err.errors?.email?.[0] || err.message || "Verification failed."
      return { success: false, error: msg }
    }
  }, [])

  const resendVerification = useCallback(async (email: string) => {
    try {
      const res = await api.post<any>("/api/auth/resend-verification", { email })
      return { success: true, devOtp: res.dev_otp as string | undefined }
    } catch (e) {
      const err = e as ApiError
      return { success: false, error: err.errors?.email?.[0] || err.message || "Failed to resend code." }
    }
  }, [])

  const forgotPasswordSendOtp = useCallback(async (email: string) => {
    try {
      const res = await api.post<any>("/api/auth/forgot-password", { email })
      return { success: true, devOtp: res.dev_otp as string | undefined }
    } catch (e) {
      const err = e as ApiError
      return { success: false, error: err.errors?.email?.[0] || err.message || "Failed to send code." }
    }
  }, [])

  const verifyResetOtp = useCallback(async (email: string, code: string) => {
    try {
      await api.post("/api/auth/verify-reset-otp", { email, code })
      return { success: true }
    } catch (e) {
      const err = e as ApiError
      return { success: false, error: err.errors?.code?.[0] || err.message || "Invalid code." }
    }
  }, [])

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    try {
      await api.post("/api/auth/reset-password", {
        email,
        password: newPassword,
        password_confirmation: newPassword,
      })
      return { success: true }
    } catch (e) {
      const err = e as ApiError
      return { success: false, error: err.errors?.email?.[0] || err.errors?.password?.[0] || err.message || "Failed to reset password." }
    }
  }, [])

  const logout = useCallback(() => {
    if (user?.impersonating) {
      void stopImpersonatingInternal(setUser)
      return
    }
    api.post("/api/auth/logout").catch(() => {})
    setUser(null)
  }, [user?.impersonating])

  const stopImpersonating = useCallback(async () => {
    return stopImpersonatingInternal(setUser)
  }, [])

  const updateProfile = useCallback((data: Partial<LocalUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev)
    api.put("/api/me", {
      name: data.fullName,
      phone: data.phone,
      country: data.country,
      company_name: data.companyName,
      avatar_url: data.avatarUrl,
    }).then(() => refreshUser()).catch(() => {})
  }, [refreshUser])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await api.put("/api/me/password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPassword,
      })
      return { success: true }
    } catch (e) {
      const err = e as ApiError
      return { success: false, error: err.errors?.current_password?.[0] || err.message }
    }
  }, [])

  return (
    <LocalAuthContext.Provider value={{
      user,
      isLoaded,
      isSignedIn: !!user,
      login,
      verifyTwoFactor,
      register,
      verifyEmail,
      resendVerification,
      forgotPasswordSendOtp,
      verifyResetOtp,
      resetPassword,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
      stopImpersonating,
    }}>
      {children}
    </LocalAuthContext.Provider>
  )
}

export function useLocalAuth(): LocalAuthContextValue {
  const ctx = useContext(LocalAuthContext)
  if (!ctx) throw new Error("useLocalAuth must be used within LocalAuthProvider")
  return ctx
}
