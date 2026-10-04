import { z } from "zod"

export const contactFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters")
})

export const rfqFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  productInterest: z.string().min(2, "Product interest is required"),
  quantity: z.string().min(1, "Quantity is required"),
  targetDeliveryTerm: z.string().optional(),
  message: z.string().optional()
})

export const partnerApplicationSchema = z.object({
  type: z.enum(["buyer", "investor", "supplier", "freight_forwarder"]),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  message: z.string().optional()
})

export const newsletterSchema = z.object({
  email: z.string().email("Valid email is required")
})
