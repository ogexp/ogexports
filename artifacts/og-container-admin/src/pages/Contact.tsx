import { useForm } from "react-hook-form"
import { usePageTitle } from "@/hooks/use-page-title"
import { zodResolver } from "@hookform/resolvers/zod"
import { contactFormSchema } from "@/lib/schemas"
import { useCreateContactMessage, useListFaqs } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Phone, Mail, Clock, MessageSquare } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function Contact() {
  usePageTitle("Contact Us", "Get in touch with OG Exports for bulk agricultural trade inquiries, RFQs, freight quotations, or partnership opportunities. Based in Karachi, Pakistan.")
  const { toast } = useToast()
  const submitContact = useCreateContactMessage()
  const { data: faqs } = useListFaqs()

  const form = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      subject: "",
      message: ""
    }
  })

  const onSubmit = (data: any) => {
    submitContact.mutate(data, {
      onSuccess: (res: any) => {
        if (res?.mail_sent === false) {
          const reason = res.mail_error || res.message || "Email delivery failed."
          toast({
            title: "Email not sent",
            description: `Your message was saved, but email delivery failed. ${reason}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Message Sent",
            description: "Thank you for reaching out. Your message was saved and emailed to our team.",
          })
        }
        form.reset()
      },
      onError: (err: any) => {
        const detail =
          err?.errors
            ? String(Object.values(err.errors).flat()[0] || "")
            : err?.message || ""
        toast({
          title: "Sending Failed",
          description: detail || "Please try again later.",
          variant: "destructive",
        })
      },
    })
  }

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border py-16 md:py-24">
        <div className="container px-4 md:px-6 max-w-4xl text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-heading font-bold">Contact Our Export Desk</h1>
          <p className="text-xl text-muted-foreground">
            Whether you have an immediate procurement need or want to discuss long-term supply contracts, our global trade specialists are ready.
          </p>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Contact Form */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-heading font-semibold">Send a Message</h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ahmed Ali" {...field} />
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
                        <FormLabel>Corporate Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Inquiry about..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="How can we help your business?" 
                          className="min-h-[150px] resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" size="lg" className="w-full text-base h-12" disabled={submitContact.isPending}>
                  {submitContact.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Contact Info & FAQ */}
          <div className="space-y-16">
            <div className="space-y-8">
              <h2 className="text-3xl font-heading font-bold">Head Office</h2>
              
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <MapPin className="w-6 h-6 text-accent shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Head Office</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Depalpur City<br/>
                      Punjab, Pakistan
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Phone className="w-6 h-6 text-accent shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">WhatsApp / Call</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <a href="https://wa.me/923032569000" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                        +92 303 256 9000
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Mail className="w-6 h-6 text-accent shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Email</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <a href="mailto:info@ogexports.co" className="hover:text-accent transition-colors">info@ogexports.co</a><br/>
                      <a href="mailto:sales@ogexports.co" className="hover:text-accent transition-colors">sales@ogexports.co</a><br/>
                      <a href="mailto:export@ogexports.co" className="hover:text-accent transition-colors">export@ogexports.co</a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="w-6 h-6 text-accent shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Trading Hours</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Mon–Fri: 09:00 – 18:00 (PKT)<br/>
                      Sat: 09:00 – 13:00 (PKT)
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/923032569000"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-whatsapp"
                className="inline-flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-5 py-3 text-sm font-medium hover:bg-[#25D366]/20 hover:border-[#25D366] transition-colors text-[#25D366]"
              >
                <FaWhatsapp className="w-5 h-5" />
                Chat with us on WhatsApp — +92 303 256 9000
              </a>

              <div className="rounded-2xl overflow-hidden border border-border">
                <iframe
                  title="OG Exports — Depalpur City, Punjab"
                  src="https://www.google.com/maps?q=Depalpur+City,Punjab,Pakistan&output=embed"
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  data-testid="iframe-map"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold">Frequently Asked Questions</h2>
              {faqs && faqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground">No FAQs available at the moment.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
