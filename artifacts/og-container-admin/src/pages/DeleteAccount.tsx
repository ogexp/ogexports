import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Check, ClipboardCheck, LockKeyhole, ShieldCheck } from "lucide-react"
import { useCreateContactMessage } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { usePageTitle } from "@/hooks/use-page-title"
import { contactFormSchema } from "@/lib/schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"

const reviewSteps = [
  {
    number: "01",
    title: "We verify it’s you",
    description: "Support confirms account ownership before acting on a sensitive request.",
  },
  {
    number: "02",
    title: "We review what must remain",
    description: "Active investments and legal or regulatory retention requirements are checked.",
  },
  {
    number: "03",
    title: "Eligible data is removed",
    description: "We delete or anonymize eligible account and associated data, and explain any records that must be retained.",
  },
]

export default function DeleteAccount() {
  usePageTitle("Request account deletion", "Submit a request to delete your OG Exports account and associated data. Support will verify ownership and review investment and legal retention requirements.")
  const { toast } = useToast()
  const submitContact = useCreateContactMessage()
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      subject: "OG Exports account and data deletion request",
      message: "I am requesting deletion of my OG Exports account and associated personal data. Please verify my account ownership and review any active investments and legal or regulatory retention requirements. Please delete or anonymize data that is eligible for removal, and let me know if any records must be retained.",
    },
  })

  const onSubmit = (data: any) => {
    setSubmitted(false)
    submitContact.mutate(data, {
      onSuccess: (res: any) => {
        setSubmitted(true)
        if (res?.mail_sent === false) {
          const reason = res.mail_error || res.message || "Email delivery failed."
          toast({
            title: "Request received",
            description: `Your request was saved, but email delivery failed. ${reason}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Request sent to Support",
            description: "Your deletion request was saved and sent to the OG Exports Support team for review.",
          })
        }
        form.reset({
          fullName: "",
          email: "",
          phone: "",
          subject: "OG Exports account and data deletion request",
          message: "I am requesting deletion of my OG Exports account and associated personal data. Please verify my account ownership and review any active investments and legal or regulatory retention requirements. Please delete or anonymize data that is eligible for removal, and let me know if any records must be retained.",
        })
      },
      onError: (err: any) => {
        const detail = err?.errors
          ? String(Object.values(err.errors).flat()[0] || "")
          : err?.message || ""
        toast({
          title: "Unable to send request",
          description: detail || "Please check your connection and try again.",
          variant: "destructive",
        })
      },
    })
  }

  return (
    <main className="min-h-[70vh] bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[linear-gradient(145deg,hsl(var(--primary)/0.035),hsl(var(--accent)/0.10))] lg:block" />
        <div className="container relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary" data-testid="status-request-review">
              <ShieldCheck className="h-4 w-4" />
              OG Exports · Support-reviewed request
            </div>
            <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              A considered process for <span className="text-primary">your data.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Request deletion of your OG Exports account and associated data. Our Support team will verify account ownership and review your request before any eligible data is removed.
            </p>
          </div>
          <div className="relative rounded-2xl border border-border bg-background/80 p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold">No immediate deletion</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Submitting this form starts a review; it does not delete or disable your account automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[.82fr_1.18fr]">
        <aside className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">What happens next</p>
            <h2 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">Reviewed by people, not automated.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              OG Exports Support handles each request with your account and any applicable obligations in view.
            </p>
          </div>
          <ol className="space-y-0" aria-label="Deletion request review steps">
            {reviewSteps.map((step, index) => (
              <li key={step.number} className="relative flex gap-4 pb-7 last:pb-0" data-testid={`step-review-${step.number}`}>
                {index < reviewSteps.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-20px)] w-px bg-border" />}
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-background font-mono text-xs text-primary">
                  {step.number}
                </span>
                <div className="pt-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl border border-accent/25 bg-accent/5 p-5" data-testid="notice-retention-review">
            <div className="flex gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-6 text-muted-foreground">
                Investment, transaction, and compliance records may need to be retained under applicable legal or contractual requirements. Where deletion is not permitted, eligible data may instead be anonymized.
              </p>
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_12px_36px_hsl(var(--foreground)/0.045)] md:p-8">
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold">Send a deletion request</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Use the details connected to your OG Exports account so Support can verify ownership.</p>
            </div>
          </div>

          {submitted && (
            <div role="status" data-testid="status-request-submitted" className="mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-primary">
              <Check className="mt-0.5 h-5 w-5 shrink-0" />
              <span>Your request has been recorded for Support review. Account deletion is not immediate; Support will verify ownership and assess active investments and retention requirements.</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" data-testid="form-delete-account">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl><Input autoComplete="name" placeholder="Your full name" {...field} data-testid="input-full-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account email</FormLabel>
                    <FormControl><Input type="email" autoComplete="email" placeholder="you@example.com" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="tel" autoComplete="tel" placeholder="+92 300 000 0000" {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl><Input {...field} data-testid="input-subject" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Request details</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-36 resize-y leading-6" {...field} data-testid="input-request-message" />
                  </FormControl>
                  <p className="text-xs leading-5 text-muted-foreground">You can edit this message before sending.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base" disabled={submitContact.isPending} data-testid="button-submit-deletion-request">
                {submitContact.isPending ? "Sending request…" : "Send request to Support"}
                {!submitContact.isPending && <ArrowRight className="h-4 w-4" />}
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                By sending, you ask OG Exports Support to review this request. Your account and data remain unchanged until the review determines eligible next steps.
              </p>
            </form>
          </Form>
        </div>
      </section>
      <div className="container mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <p className="text-sm text-muted-foreground">
          Questions about how information is handled? Read the <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline" data-testid="link-privacy-policy">OG Exports Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}
