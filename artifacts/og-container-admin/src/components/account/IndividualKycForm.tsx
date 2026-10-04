import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useStartIndividualKyc } from "@workspace/api-client-react"
import type { StartIndividualKycBody } from "@workspace/api-zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileUploadField } from "./FileUploadField"
import { useToast } from "@/hooks/use-toast"

type FormValues = {
  dateOfBirth: string
  nationality: string
  residentialAddress: string
  proofOfAddressObjectPath: string
}

export function IndividualKycForm({ retry }: { retry?: boolean }) {
  const { toast } = useToast()
  const startKyc = useStartIndividualKyc()

  const form = useForm<FormValues>({
    resolver: zodResolver(StartIndividualKycBody.omit({ returnUrl: true })),
    defaultValues: {
      dateOfBirth: "",
      nationality: "",
      residentialAddress: "",
      proofOfAddressObjectPath: "",
    },
  })

  const onSubmit = (values: FormValues) => {
    startKyc.mutate(
      { data: { ...values, returnUrl: window.location.href } },
      {
        onSuccess: (session) => {
          if (session.verificationUrl) {
            window.location.href = session.verificationUrl
          } else {
            toast({ title: "Verification session created", description: "Please refresh to check your status." })
          }
        },
        onError: (error: any) => {
          toast({
            title: "Could not start verification",
            description: error?.message ?? "Please try again.",
            variant: "destructive",
          })
        },
      },
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-heading font-bold">{retry ? "Resubmit your verification" : "Verify your identity"}</h1>
        <p className="text-muted-foreground">
          We use Stripe Identity to confirm who you are with a government ID and a selfie. Fill in your details below to begin.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border rounded-2xl p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-date-of-birth" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality</FormLabel>
                  <FormControl>
                    <Input placeholder="Pakistani" {...field} data-testid="input-nationality" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="residentialAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residential Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street, city, country" {...field} data-testid="input-residential-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proofOfAddressObjectPath"
            render={({ field }) => (
              <FormItem>
                <FileUploadField
                  label="Proof of Address"
                  description="Utility bill or bank statement issued in the last 3 months."
                  required
                  value={field.value}
                  onChange={(path) => field.onChange(path)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={startKyc.isPending}>
            {startKyc.isPending ? "Starting verification..." : "Continue to identity verification"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
