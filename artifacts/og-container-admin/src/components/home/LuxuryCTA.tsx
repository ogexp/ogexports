import React, { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Phone, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { api } from "@/lib/api";

const EMPTY_FORM = { name: "", company: "", email: "", type: "", message: "" }

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  buyer: "Product Sourcing / Buying",
  investment: "Investment Opportunities",
  other: "General Inquiry",
}

export function LuxuryCTA() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  function handleField(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      notify.error("Missing fields", "Please fill in your name and email.")
      return
    }
    setSending(true)
    try {
      const inquiryLabel = form.type ? (INQUIRY_TYPE_LABELS[form.type] || form.type) : ""
      const messageParts = [
        form.company ? `Company: ${form.company}` : "",
        inquiryLabel ? `Inquiry Type: ${inquiryLabel}` : "",
        "",
        form.message.trim() || "(no additional message)",
      ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))

      const res = await api.post<{ mail_sent?: boolean }>("/api/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: inquiryLabel ? `Home Page Inquiry: ${inquiryLabel}` : "Home Page Inquiry",
        message: messageParts.join("\n"),
        type: "contact",
        meta: {
          company: form.company || undefined,
          inquiry_type: form.type || undefined,
          source: "home",
        },
      })
      setSubmitted(true)
      if (res?.mail_sent === false) {
        notify.warning(
          "Inquiry received",
          "Your message was saved, but email delivery failed. Our team will still follow up shortly.",
        )
      } else {
        notify.success("Inquiry sent!", "We'll get back to you within 4 business hours.")
      }
    } catch {
      notify.error("Sending failed", "Please try again or email info@ogexports.co")
    } finally {
      setSending(false)
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setSubmitted(false)
  }

  // shared input style helpers
  const inputClass = "w-full h-12 px-4 rounded-xl border text-sm outline-none transition-all duration-300"
  const inputStyle = { background: "hsl(60 17% 97%)", borderColor: "hsl(60 10% 86%)", color: "hsl(207 24% 16%)" }
  const focusStyle = { borderColor: "hsl(158 59% 15%)", boxShadow: "0 0 0 3px hsl(158 59% 15% / 0.10)" }
  const blurStyle  = { borderColor: "hsl(60 10% 86%)", boxShadow: "none" }

  return (
    <>
      {/* Mid-page CTA */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(43 85% 44%) 0%, hsl(43 85% 50%) 50%, hsl(38 80% 42%) 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 120% at 50% 50%, hsl(43 90% 78% / 0.20) 0%, transparent 65%)",
          }}
        />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <h2
                className="text-3xl md:text-4xl font-heading font-bold leading-tight"
                style={{ color: "hsl(207 24% 12%)" }}
              >
                Ready to Start Trading with OG Exports?
              </h2>
              <p
                className="text-lg font-light"
                style={{ color: "hsl(207 24% 20%)" }}
              >
                Join 200+ verified buyers and investors across 40+ countries.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/products">
                <button
                  className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full font-heading font-semibold text-base transition-all duration-300"
                  style={{
                    background: "hsl(158 59% 15%)",
                    color: "white",
                    boxShadow: "0 4px 20px hsl(158 59% 15% / 0.40)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px hsl(158 59% 15% / 0.55)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(158 59% 15% / 0.40)";
                  }}
                >
                  Browse Products <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/contact">
                <button
                  className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full font-heading font-semibold text-base transition-all duration-300 border"
                  style={{
                    background: "transparent",
                    color: "hsl(207 24% 12%)",
                    borderColor: "hsl(207 24% 15% / 0.35)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "hsl(207 24% 15% / 0.10)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(207 24% 15% / 0.55)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(207 24% 15% / 0.35)";
                  }}
                >
                  Contact Our Team
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        className="py-28 lg:py-36 relative overflow-hidden"
        style={{ background: "hsl(60 17% 96%)" }}
      >
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            {/* Left: Contact Info */}
            <div className="space-y-8">
              <div>
                <div className="badge-green mb-5">Get in Touch</div>
                <h2
                  className="text-4xl md:text-5xl font-heading font-bold leading-[1.1] mb-5"
                  style={{ color: "hsl(207 24% 16%)" }}
                >
                  Start a Business
                  <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
                    Relationship Today
                  </span>
                </h2>
                <div className="w-16 h-[3px] rounded-full mb-6" style={{ background: "hsl(38 41% 59%)" }} />
                <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 42%)" }}>
                  Our trade managers are available 6 days a week across Pakistan, UAE, and UK
                  time zones. Reach out for product inquiries, investment information, or
                  logistics consultation — we respond within 4 business hours.
                </p>
              </div>

              {/* Contact Methods */}
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    label: "Email",
                    value: "info@ogexports.co",
                    href: "mailto:info@ogexports.co",
                    color: "hsl(158 59% 15%)",
                    bg: "hsl(158 59% 15% / 0.07)",
                    border: "hsl(158 59% 15% / 0.20)",
                  },
                  {
                    icon: Phone,
                    label: "Phone / WhatsApp",
                    value: "+92 303 256 9000",
                    href: "tel:+923032569000",
                    color: "hsl(123 38% 42%)",
                    bg: "hsl(123 38% 42% / 0.07)",
                    border: "hsl(123 38% 42% / 0.20)",
                  },
                  {
                    icon: MessageCircle,
                    label: "WhatsApp Business",
                    value: "Message us on WhatsApp",
                    href: "https://wa.me/923032569000",
                    color: "hsl(38 41% 59%)",
                    bg: "hsl(38 41% 59% / 0.07)",
                    border: "hsl(38 41% 59% / 0.22)",
                  },
                ].map((method, i) => (
                  <a
                    key={i}
                    href={method.href}
                    className="flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 group"
                    style={{
                      background: "white",
                      borderColor: "hsl(60 10% 88%)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = method.bg;
                      el.style.borderColor = method.border;
                      el.style.boxShadow = "0 4px 20px hsl(0 0% 0% / 0.06)";
                      el.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "white";
                      el.style.borderColor = "hsl(60 10% 88%)";
                      el.style.boxShadow = "none";
                      el.style.transform = "translateX(0)";
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: method.bg, border: `1px solid ${method.border}` }}
                    >
                      <method.icon className="w-5 h-5" style={{ color: method.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(207 16% 60%)" }}>
                        {method.label}
                      </div>
                      <div className="font-heading font-semibold" style={{ color: "hsl(207 24% 16%)" }}>
                        {method.value}
                      </div>
                    </div>
                    <ArrowRight
                      className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1"
                      style={{ color: method.color }}
                    />
                  </a>
                ))}
              </div>

              {/* Address */}
              <div
                className="p-6 rounded-2xl border"
                style={{
                  background: "white",
                  borderColor: "hsl(60 10% 88%)",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(207 16% 58%)" }}>
                  Registered Office
                </div>
                <div className="font-heading font-semibold text-sm mb-1" style={{ color: "hsl(207 24% 16%)" }}>
                  OG Exports (Private) Limited
                </div>
                <div className="text-sm" style={{ color: "hsl(207 16% 46%)" }}>
                  Depalpur, Punjab, Pakistan
                </div>
                <div className="mt-3 pt-3 flex gap-4 text-xs" style={{ borderTop: "1px solid hsl(60 10% 90%)" }}>
                  <span style={{ color: "hsl(207 16% 55%)" }}>Mon–Sat: 9am–7pm PKT</span>
                  <span style={{ color: "hsl(207 16% 70%)" }}>·</span>
                  <span style={{ color: "hsl(207 16% 55%)" }}>Response: &lt;4 hours</span>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div
              className="p-8 md:p-10 rounded-3xl border shadow-sm"
              style={{
                background: "white",
                borderColor: "hsl(60 10% 86%)",
                boxShadow: "0 4px 32px hsl(0 0% 0% / 0.06)",
              }}
            >
              <h3
                className="text-2xl font-heading font-bold mb-2"
                style={{ color: "hsl(207 24% 16%)" }}
              >
                Send an Inquiry
              </h3>
              <p className="text-sm mb-8" style={{ color: "hsl(207 16% 50%)" }}>
                Tell us about your sourcing needs or investment interests and a team
                member will respond within 4 business hours.
              </p>

              {submitted ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(158 59% 15% / 0.10)" }}>
                    <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(158 59% 22%)" }} />
                  </div>
                  <h4 className="text-xl font-heading font-bold" style={{ color: "hsl(207 24% 16%)" }}>
                    Inquiry Received!
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(207 16% 50%)" }}>
                    Thank you, <strong>{form.name}</strong>. Our trade team will reach out to{" "}
                    <strong>{form.email}</strong> within 4 business hours.
                  </p>
                  <button
                    onClick={resetForm}
                    className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ borderColor: "hsl(60 10% 82%)", color: "hsl(207 24% 30%)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsl(60 17% 95%)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(207 16% 55%)" }}>
                        Full Name <span style={{ color: "hsl(0 72% 55%)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={form.name}
                        onChange={handleField("name")}
                        className={inputClass}
                        style={inputStyle}
                        onFocus={e => Object.assign((e.currentTarget as HTMLElement).style, focusStyle)}
                        onBlur={e => Object.assign((e.currentTarget as HTMLElement).style, blurStyle)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(207 16% 55%)" }}>
                        Company
                      </label>
                      <input
                        type="text"
                        placeholder="Your Company Ltd"
                        value={form.company}
                        onChange={handleField("company")}
                        className={inputClass}
                        style={inputStyle}
                        onFocus={e => Object.assign((e.currentTarget as HTMLElement).style, focusStyle)}
                        onBlur={e => Object.assign((e.currentTarget as HTMLElement).style, blurStyle)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(207 16% 55%)" }}>
                      Email Address <span style={{ color: "hsl(0 72% 55%)" }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@business.com"
                      value={form.email}
                      onChange={handleField("email")}
                      className={inputClass}
                      style={inputStyle}
                      onFocus={e => Object.assign((e.currentTarget as HTMLElement).style, focusStyle)}
                      onBlur={e => Object.assign((e.currentTarget as HTMLElement).style, blurStyle)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(207 16% 55%)" }}>
                      Inquiry Type
                    </label>
                    <select
                      value={form.type}
                      onChange={handleField("type")}
                      className="w-full h-12 px-4 rounded-xl border text-sm outline-none transition-all duration-300 appearance-none cursor-pointer"
                      style={inputStyle}
                      onFocus={e => Object.assign((e.currentTarget as HTMLElement).style, focusStyle)}
                      onBlur={e => Object.assign((e.currentTarget as HTMLElement).style, blurStyle)}
                    >
                      <option value="">Select inquiry type…</option>
                      <option value="buyer">Product Sourcing / Buying</option>
                      <option value="investment">Investment Opportunities</option>
                      <option value="other">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(207 16% 55%)" }}>
                      Message
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about your requirements — commodity, quantity, destination, timeline…"
                      value={form.message}
                      onChange={handleField("message")}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-300 resize-none"
                      style={inputStyle}
                      onFocus={e => Object.assign((e.currentTarget as HTMLElement).style, focusStyle)}
                      onBlur={e => Object.assign((e.currentTarget as HTMLElement).style, blurStyle)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-4 rounded-xl font-heading font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{
                      background: "hsl(158 59% 15%)",
                      color: "white",
                      boxShadow: "0 4px 20px hsl(158 59% 15% / 0.30)",
                    }}
                    onMouseEnter={e => {
                      if (!sending) {
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px hsl(158 59% 15% / 0.50)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(158 59% 15% / 0.30)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>Send Inquiry <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
