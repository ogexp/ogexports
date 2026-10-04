import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSubmitCompanyKyc } from "@workspace/api-client-react"
import type { SubmitCompanyKycBody } from "@workspace/api-zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileUploadField } from "./FileUploadField"
import { useToast } from "@/hooks/use-toast"
import type { z } from "zod"

type FormValues = z.infer<typeof SubmitCompanyKycBody>

const TEXT_FIELDS: { name: keyof FormValues & string; label: string; placeholder?: string; required?: boolean }[] = [
  { name: "companyName", label: "Company Name", required: true },
  { name: "registrationNumber", label: "Registration Number", required: true },
  { name: "taxNumber", label: "Tax Number", required: true },
  { name: "businessLicenseNumber", label: "Business License Number (Optional)" },
  { name: "country", label: "Country of Incorporation", required: true },
  { name: "address", label: "Registered Address", required: true },
  { name: "website", label: "Website (Optional)", placeholder: "https://" },
  { name: "directorName", label: "Director Name", required: true },
  { name: "directorTitle", label: "Director Title (Optional)" },
  { name: "authorizedRepName", label: "Authorized Representative Name", required: true },
  { name: "authorizedRepEmail", label: "Authorized Representative Email", required: true },
  { name: "authorizedRepPhone", label: "Authorized Representative Phone (Optional)" },
  { name: "bankName", label: "Bank Name", required: true },
  { name: "bankAccountName", label: "Bank Account Name", required: true },
  { name: "bankAccountNumber", label: "Bank Account Number", required: true },
  { name: "bankSwiftCode", label: "SWIFT Code (Optional)" },
  { name: "bankCountry", label: "Bank Country (Optional)" },
  { name: "importExportLicenseNumber", label: "Import/Export License Number (Optional)" },
]

export function CompanyKycForm({ retry }: { retry?: boolean }) {
  const { toast } = useToast()
  const submitKyc = useSubmitCompanyKyc()

  const form = useForm<FormValues>({
    resolver: zodResolver(SubmitCompanyKycBody),
    defaultValues: {
      companyName: "",
      registrationNumber: "",
      taxNumber: "",
      country: "",
      address: "",
      directorName: "",
      authorizedRepName: "",
      authorizedRepEmail: "",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      registrationCertObjectPath: "",
      taxCertObjectPath: "",
    },
  })

  const onSubmit = (values: FormValues) => {
    submitKyc.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Company verification submitted", description: "Our compliance team will review your documents shortly." })
        },
        onError: (error: any) => {
          toast({
            title: "Could not submit verification",
            description: error?.message ?? "Please try again.",
            variant: "destructive",
          })
        },
      },
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-heading font-bold">{retry ? "Resubmit company verification" : "Verify your company"}</h1>
        <p className="text-muted-foreground">
          Company accounts are reviewed manually by our compliance team. Provide accurate registration, banking, and licensing details.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-card border border-border rounded-2xl p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {TEXT_FIELDS.map(({ name, label, placeholder }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input placeholder={placeholder} {...field} value={(field.value as string) ?? ""} data-testid={`input-${name}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-border">
            <FormField
              control={form.control}
              name="registrationCertObjectPath"
              render={({ field }) => (
                <FormItem>
                  <FileUploadField
                    label="Certificate of Registration"
                    required
                    value={field.value}
                    onChange={(path) => field.onChange(path)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxCertObjectPath"
              render={({ field }) => (
                <FormItem>
                  <FileUploadField
                    label="Tax Registration Certificate"
                    required
                    value={field.value}
                    onChange={(path) => field.onChange(path)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessLicenseObjectPath"
              render={({ field }) => (
                <FormItem>
                  <FileUploadField
                    label="Business License (Optional)"
                    value={field.value ?? undefined}
                    onChange={(path) => field.onChange(path)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="importExportLicenseObjectPath"
              render={({ field }) => (
                <FormItem>
                  <FileUploadField
                    label="Import/Export License (Optional)"
                    value={field.value ?? undefined}
                    onChange={(path) => field.onChange(path)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={submitKyc.isPending}>
            {submitKyc.isPending ? "Submitting..." : "Submit for review"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
