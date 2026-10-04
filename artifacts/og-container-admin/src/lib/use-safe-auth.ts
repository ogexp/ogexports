/**
 * Safe auth context — provides Clerk auth state when ClerkProvider is mounted,
 * or local auth state when the app runs without a publishable key.
 */
import { createContext, useContext } from "react"

export interface SafeAuthState {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null | undefined
  /** Populated by LocalAuthBridge; undefined when using Clerk */
  displayName?: string | null
  /** Populated by LocalAuthBridge; undefined when using Clerk */
  email?: string | null
  /** Profile photo URL — populated by LocalAuthBridge */
  avatarUrl?: string | null
  /** Profile country — populated by LocalAuthBridge (drives PKR vs USD) */
  country?: string | null
  /** Account role — populated by LocalAuthBridge */
  accountType?: "buyer" | "supplier" | "investor" | "admin" | null
  /** Sign-out function; available in local auth mode */
  logout?: () => void
  /** True when admin is viewing as another user */
  impersonating?: boolean
  impersonatorName?: string | null
  /** Return to admin panel without full logout */
  stopImpersonating?: () => Promise<{ success: boolean; redirect?: string }>
}

export const SafeAuthContext = createContext<SafeAuthState>({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
})

export function useSafeAuth(): SafeAuthState {
  return useContext(SafeAuthContext)
}
