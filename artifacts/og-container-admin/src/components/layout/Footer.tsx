import * as React from "react"
import { Link } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { newsletterSchema } from "@/lib/schemas"
import { useSubscribeNewsletter } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react"
import { FaLinkedin, FaFacebook, FaInstagram } from "react-icons/fa"
import { SiX } from "react-icons/si"
import { useTranslation } from "react-i18next"
import { useSafeAuth } from "@/lib/use-safe-auth"

export function Footer() {
  const { toast } = useToast()
  const subscribe = useSubscribeNewsletter()
  const { t } = useTranslation()
  const { isSignedIn, accountType } = useSafeAuth()
  const isInvestor = isSignedIn && accountType === "investor"

  const form = useForm({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" }
  })

  const onSubmit = (data: { email: string }) => {
    subscribe.mutate({ data }, {
      onSuccess: () => {
        toast({ title: t('footerExt.subscribeSuccess'), description: t('footerExt.subscribeSuccessDesc') })
        form.reset()
      },
      onError: () => {
        toast({ title: t('footerExt.subscribeError'), description: t('footerExt.subscribeErrorDesc'), variant: "destructive" })
      }
    })
  }

  return (
    <footer className="bg-card border-t pt-16 pb-8 relative overflow-hidden" style={{ borderTopColor: "hsl(var(--border))" }}>
      {/* Top gold accent line */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, hsl(43 88% 52% / 0.55) 30%, hsl(43 88% 52% / 0.55) 70%, transparent)"
        }}
      />

      {/* Ambient glows */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(155 55% 35% / 0.07) 0%, transparent 70%)" }} />
      <div className="absolute top-0 right-0 w-[400px] h-[300px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 88% 52% / 0.06) 0%, transparent 70%)" }} />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">

          {/* Brand */}
          <div className="space-y-5 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group inline-flex">
              <img
                src={`${import.meta.env.BASE_URL}og-logo.png`}
                alt="OG Exports"
                className="h-20 w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_10px_hsl(43_88%_52%_/_0.45)]"
              />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('footerExt.brandDesc')}
            </p>
            {/* Divider */}
            <div className="h-px w-16" style={{ background: "hsl(var(--accent) / 0.45)" }} />
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/share/18zPFjV3tP/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full border flex items-center justify-center text-muted-foreground hover:text-[#1877F2] transition-all duration-200 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/8"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <FaFacebook size={17} />
              </a>
              <a
                href="https://www.instagram.com/og_exports?igsh=MXF2OTJ1eXl5Y2M5eg=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full border flex items-center justify-center text-muted-foreground hover:text-[#E1306C] transition-all duration-200 hover:border-[#E1306C]/40 hover:bg-[#E1306C]/8"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <FaInstagram size={17} />
              </a>
              <a
                href="https://www.linkedin.com/in/og-exports-pakistan-8238aa3b4?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-full border flex items-center justify-center text-muted-foreground hover:text-[#0A66C2] transition-all duration-200 hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/8"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <FaLinkedin size={17} />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="w-10 h-10 rounded-full border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:border-foreground/40 hover:bg-foreground/8"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <SiX size={17} />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">{t('footerExt.company')}</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/company-profile", label: t('footerExt.companyProfile') },
                { href: "/about", label: t('footerExt.aboutUs') },
                { href: "/products", label: t('footerExt.productCatalog') },
                { href: "/contact", label: t('footerExt.contactUs') },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-accent transition-colors duration-200">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Investment — investors only */}
          {isInvestor && (
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">{t('footerExt.investment')}</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/invest", label: t('footerExt.opportunities') },
                { href: "/account", label: t('footerExt.investorDashboard') },
                { href: "/export-terms", label: t('footerExt.exportTerms') },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-accent transition-colors duration-200">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider">{t('footerExt.contact')}</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="leading-relaxed">Depalpur City<br />Punjab, Pakistan</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <a href="https://wa.me/923032569000" className="hover:text-accent transition-colors">+92 303 256 9000</a>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <a href="mailto:info@ogexports.co" className="hover:text-accent transition-colors">info@ogexports.co</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-2 text-sm uppercase tracking-wider">{t('footerExt.marketInsights')}</h4>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {t('footerExt.newsletterDesc')}
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={t('footerExt.emailPlaceholder')}
                            {...field}
                            className="pr-12 text-sm"
                            style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 w-7 h-7 text-muted-foreground hover:text-accent hover:bg-transparent"
                            disabled={subscribe.isPending}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          <p>© {new Date().getFullYear()} {t('footerExt.copyright')} {t('footer.rights')}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-accent transition-colors">{t('footer.privacy')}</Link>
            <Link href="/delete-account" className="hover:text-accent transition-colors" data-testid="link-delete-account">Request account deletion</Link>
            <Link href="/terms" className="hover:text-accent transition-colors">{t('footerExt.termsConditions')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
