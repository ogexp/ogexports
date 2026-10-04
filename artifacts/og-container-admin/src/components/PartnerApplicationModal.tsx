import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { partnerApplicationSchema } from "@/lib/schemas"
import { useCreatePartnerApplication } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"

interface PartnerApplicationModalProps {
  trigger: React.ReactNode
  defaultType?: "buyer" | "investor" | "supplier" | "freight_forwarder"
}

export function PartnerApplicationModal({ trigger, defaultType = "buyer" }: PartnerApplicationModalProps) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const submitApp = useCreatePartnerApplication()
  const resolvedDefault =
    defaultType === "supplier" && !supplierModuleEnabled ? "buyer"
    : defaultType === "investor" && !investmentModuleEnabled ? "buyer"
    : defaultType

  const form = useForm({
    resolver: zodResolver(partnerApplicationSchema),
    defaultValues: {
      type: resolvedDefault,
      fullName: "",
      email: "",
      phone: "",
      company: "",
      country: "",
      message: ""
    }
  })

  const onSubmit = (data: any) => {
    submitApp.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Application Submitted", description: "Our global trade team will contact you shortly." })
        setOpen(false)
        form.reset()
      },
      onError: () => {
        toast({ title: "Submission Failed", description: "Please try again later.", variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Partner with OG Exports</DialogTitle>
          <DialogDescription>
            Join our global network of premium agricultural commodity traders.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select partnership type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="buyer">Become a Buyer</SelectItem>
                      {supplierModuleEnabled && (
                        <SelectItem value="supplier">Become a Supplier</SelectItem>
                      )}
                      {investmentModuleEnabled && (
                        <SelectItem value="investor">Investment Opportunities</SelectItem>
                      )}
                      <SelectItem value="freight_forwarder">Become a Freight Forwarder</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Trade Co. Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="United Kingdom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+44 20 7123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about your volume requirements or specific interests..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitApp.isPending}>
              {submitApp.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
