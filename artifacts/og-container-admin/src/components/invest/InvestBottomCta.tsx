import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { useSafeAuth } from "@/lib/use-safe-auth"

type InvestBottomCtaProps = {
  variant?: "public" | "portal"
}

export function InvestBottomCta({ variant = "public" }: InvestBottomCtaProps) {
  const { isSignedIn } = useSafeAuth()
  const isPortal = variant === "portal"

  return (
    <div className={`bg-primary text-primary-foreground border-y border-border ${isPortal ? "py-12 rounded-xl overflow-hidden" : "py-24"}`}>
      <div className={`${isPortal ? "px-6" : "container px-4 md:px-6"} text-center space-y-6 ${isPortal ? "" : "space-y-8"}`}>
        <h2 className={`font-heading font-bold ${isPortal ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"}`}>
          Ready to Start Earning?
        </h2>
        <p className={`opacity-90 max-w-xl mx-auto ${isPortal ? "text-base" : "text-lg"}`}>
          Open your investment account today and access high-yield agricultural export opportunities.
        </p>
        {isPortal ? (
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="px-8 bg-white text-primary hover:bg-gray-100"
              onClick={() => document.getElementById("investments")?.scrollIntoView({ behavior: "smooth" })}
            >
              Browse Investments
            </Button>
            <Link href="/invest/deposit">
              <Button size="lg" variant="outline" className="px-8 border-white/40 text-white hover:bg-white/10">
                Make a Deposit
              </Button>
            </Link>
          </div>
        ) : !isSignedIn ? (
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="px-8 bg-white text-primary hover:bg-gray-100">
              Create Investor Account
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            variant="secondary"
            className="px-8 bg-white text-primary hover:bg-gray-100"
            onClick={() => document.getElementById("investments")?.scrollIntoView({ behavior: "smooth" })}
          >
            Browse Investments
          </Button>
        )}
        <p className="text-sm opacity-70">investments@ogexports.co | WhatsApp: +92 303 256 9000</p>
      </div>
    </div>
  )
}
