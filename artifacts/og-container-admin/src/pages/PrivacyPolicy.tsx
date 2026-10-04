import { Link } from "wouter"

const SECTIONS = [
  {
    id: 1,
    title: "About OG Exports",
    content: (
      <>
        <p>OG Exports (Private) Limited is an international agricultural export company based in Pakistan. Our platform currently operates through two core business divisions:</p>
        <ul>
          <li>OG Exports – Agricultural Export &amp; Supply</li>
          <li>OG Exports Investment</li>
        </ul>
        <p>We are committed to maintaining the confidentiality, integrity, and security of your information.</p>
      </>
    )
  },
  {
    id: 2,
    title: "Information We Collect",
    content: (
      <>
        <p>Depending on your interaction with our platform, we may collect the following information:</p>

        <p className="font-semibold text-foreground pt-2">Personal Information</p>
        <ul>
          <li>Full Name</li>
          <li>Email Address</li>
          <li>Mobile Number</li>
          <li>Residential Address</li>
          <li>Country &amp; Nationality</li>
          <li>Date of Birth (if required)</li>
          <li>Profile Photograph</li>
        </ul>

        <p className="font-semibold text-foreground pt-2">Company Information</p>
        <ul>
          <li>Company Name</li>
          <li>Company Registration Number</li>
          <li>Business License</li>
          <li>Tax Registration Number</li>
          <li>Company Address, Website &amp; Contact Information</li>
        </ul>

        <p className="font-semibold text-foreground pt-2">KYC Information</p>
        <p>Where applicable, we may collect:</p>
        <ul>
          <li>National Identity Card or Passport</li>
          <li>Company Registration Certificate</li>
          <li>Proof of Address</li>
          <li>Selfie Verification</li>
          <li>Supporting Verification Documents</li>
        </ul>

        <p className="font-semibold text-foreground pt-2">Banking Information</p>
        <p>For investment and financial services, we may collect:</p>
        <ul>
          <li>Bank Name &amp; Account Title</li>
          <li>Account Number, SWIFT Code &amp; IBAN (where applicable)</li>
        </ul>
        <p>Sensitive financial information is handled through secure internal processes and is only used for authorized business purposes.</p>

        <p className="font-semibold text-foreground pt-2">Technical Information</p>
        <p>We may automatically collect:</p>
        <ul>
          <li>IP Address, Browser Type &amp; Device Information</li>
          <li>Operating System &amp; Session Information</li>
          <li>Login Activity, Cookies &amp; Usage Analytics</li>
        </ul>
      </>
    )
  },
  {
    id: 3,
    title: "How We Use Your Information",
    content: (
      <>
        <p>Your information may be used to:</p>
        <ul>
          <li>Create and manage your account.</li>
          <li>Verify your identity and process KYC verification.</li>
          <li>Respond to inquiries and manage export transactions.</li>
          <li>Process investment requests.</li>
          <li>Verify deposits and withdrawals.</li>
          <li>Improve platform performance and prevent fraud.</li>
          <li>Send important account notifications.</li>
          <li>Provide customer support.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
      </>
    )
  },
  {
    id: 4,
    title: "Investment Information",
    content: (
      <>
        <p>If you participate in OG Exports Investment opportunities, your information may be used to:</p>
        <ul>
          <li>Process investment requests and record transactions.</li>
          <li>Generate investment agreements.</li>
          <li>Display your investment portfolio.</li>
          <li>Process approved deposits and withdrawals.</li>
          <li>Provide project updates and generate financial reports.</li>
        </ul>
        <p>Investment records remain confidential and are accessible only to authorized users and authorized company personnel.</p>
      </>
    )
  },
  {
    id: 5,
    title: "Product Inquiries",
    content: (
      <>
        <p>When you submit a product inquiry or Request for Quotation (RFQ), we may use your information to:</p>
        <ul>
          <li>Respond to your request and prepare quotations.</li>
          <li>Communicate regarding export opportunities.</li>
          <li>Maintain customer relationship records.</li>
        </ul>
      </>
    )
  },
  {
    id: 5.1,
    title: "Orders, Quotations & Trade Records",
    content: (
      <>
        <p>When you use the Buyer Portal to place orders or request quotations, we process and retain related business records, which may include:</p>
        <ul>
          <li>Cart contents, order details, quantities, units, and destination information.</li>
          <li>RFQ submissions, issued quotations (including FOB, freight, insurance, and documentation charges), and their acceptance or rejection status.</li>
          <li>Payment references, selected payment methods, and order status history.</li>
          <li>Shipment, documentation, and delivery records connected to your transactions.</li>
        </ul>
        <p>These records are used to fulfil orders, maintain accurate trade documentation, resolve disputes, and comply with export, customs, and accounting requirements.</p>
      </>
    )
  },
  {
    id: 5.2,
    title: "Profile Photos & Uploaded Content",
    content: (
      <p>Users may upload a profile photograph and, where applicable, business documents to their account. Uploaded content is used solely to personalize your account and support verification processes. You may replace or remove your profile photo at any time from your profile settings. Please do not upload content that infringes third-party rights or contains sensitive information not requested by the platform.</p>
    )
  },
  {
    id: 5.3,
    title: "Communication Channels",
    content: (
      <>
        <p>We may communicate with you through the following channels:</p>
        <ul>
          <li>Email notifications regarding your account, orders, quotations, and investments.</li>
          <li>In-platform messages and notifications.</li>
          <li>WhatsApp or telephone, where you initiate contact or consent to such communication.</li>
        </ul>
        <p>Communications made through third-party messaging services (such as WhatsApp) are also subject to the privacy policies of those providers.</p>
      </>
    )
  },
  {
    id: 6,
    title: "Cookies",
    content: (
      <>
        <p>Our website may use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you logged in and remember preferences.</li>
          <li>Improve website performance and enhance user experience.</li>
          <li>Analyze website traffic and improve security.</li>
        </ul>
        <p>You may disable cookies through your browser settings; however, some platform features may not function properly.</p>
      </>
    )
  },
  {
    id: 7,
    title: "Data Security",
    content: (
      <>
        <p>OG Exports implements commercially reasonable technical and organizational measures to help protect user information, including:</p>
        <ul>
          <li>Secure Authentication &amp; Encrypted Password Storage</li>
          <li>HTTPS Encryption &amp; Secure Cloud Storage</li>
          <li>Role-Based Access Control</li>
          <li>Activity Logging &amp; Audit Logs</li>
          <li>Session Management</li>
          <li>Multi-Factor Authentication (where enabled)</li>
        </ul>
        <p>While we strive to protect your information, no internet transmission or electronic storage system can be guaranteed to be completely secure.</p>
      </>
    )
  },
  {
    id: 8,
    title: "Information Sharing",
    content: (
      <>
        <p>We do not sell your personal information. We may share information only when necessary:</p>
        <ul>
          <li>With authorized employees.</li>
          <li>With professional service providers acting on our behalf.</li>
          <li>When required by applicable law or legal process.</li>
          <li>To protect our legal rights or investigate fraud.</li>
          <li>With your consent.</li>
        </ul>
      </>
    )
  },
  {
    id: 9,
    title: "Data Retention",
    content: (
      <>
        <p>We retain information only for as long as reasonably necessary to:</p>
        <ul>
          <li>Provide our services and maintain business records.</li>
          <li>Fulfill contractual obligations.</li>
          <li>Meet legal, accounting, or regulatory requirements.</li>
          <li>Resolve disputes and enforce agreements.</li>
        </ul>
      </>
    )
  },
  {
    id: 10,
    title: "Your Rights",
    content: (
      <>
        <p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>Access your personal information.</li>
          <li>Update inaccurate information.</li>
          <li>Request correction or deletion of your account where legally permissible.</li>
          <li>Request a copy of available personal information.</li>
          <li>Manage communication preferences.</li>
        </ul>
        <p>Certain records may need to be retained to comply with legal or contractual obligations.</p>
      </>
    )
  },
  {
    id: 11,
    title: "Third-Party Services",
    content: (
      <p>Our platform may integrate with third-party providers, including payment processors, analytics services, or communication tools. Their handling of your information is governed by their own privacy policies. OG Exports is not responsible for the privacy practices of third-party services.</p>
    )
  },
  {
    id: 12,
    title: "Children's Privacy",
    content: (
      <p>Our services are intended for business users and individuals who are legally able to enter into binding agreements. We do not knowingly collect personal information from children.</p>
    )
  },
  {
    id: 13,
    title: "International Users",
    content: (
      <p>Users accessing the platform from outside Pakistan acknowledge that their information may be processed in accordance with the operational requirements of OG Exports and applicable laws.</p>
    )
  },
  {
    id: 14,
    title: "Policy Updates",
    content: (
      <p>We may revise this Privacy Policy from time to time. Updated versions will be published on our website with the revised effective date. Continued use of the platform after updates constitutes acceptance of the revised Privacy Policy.</p>
    )
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div className="bg-card border-b border-border pt-32 pb-16">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            How OG Exports (Private) Limited collects, uses, stores, and protects your information.
          </p>
          <p className="text-sm text-muted-foreground">Effective Date: July 16, 2026</p>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-16 md:py-24 max-w-3xl mx-auto">

        {/* Intro notice */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-12">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your privacy is important to us. This Privacy Policy explains how we collect, use, store, protect, and process your personal and business information when you use our website, products, services, and investment platform. By accessing or using our platform, you agree to the practices described in this Privacy Policy.
          </p>
        </div>

        {/* Table of contents */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-12">
          <h2 className="font-heading font-semibold text-base mb-4">Contents</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#pp-${s.id}`}
                className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-2"
              >
                <span className="text-accent font-semibold text-xs w-5 shrink-0">{i + 1}.</span>
                {s.title}
              </a>
            ))}
            <a href="#pp-contact" className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-2">
              <span className="text-accent font-semibold text-xs w-5 shrink-0">{SECTIONS.length + 1}.</span>
              Contact Us
            </a>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={`pp-${s.id}`} className="scroll-mt-24 space-y-4 pb-10 border-b border-border/50 last:border-0">
              <h2 className="text-xl font-heading font-semibold flex items-baseline gap-3">
                <span className="text-accent text-base font-bold">{i + 1}.</span>
                {s.title}
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:pl-0 [&_ul]:list-none [&_ul_li]:flex [&_ul_li]:items-start [&_ul_li]:gap-2 [&_ul_li]:before:content-['—'] [&_ul_li]:before:text-accent [&_ul_li]:before:shrink-0 [&_ul_li]:before:mt-0.5">
                {s.content}
              </div>
            </section>
          ))}

          {/* Section 15 — Contact */}
          <section id="pp-contact" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-heading font-semibold flex items-baseline gap-3">
              <span className="text-accent text-base font-bold">{SECTIONS.length + 1}.</span>
              Contact Us
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you have any questions regarding this Privacy Policy or your personal information, please contact us:
            </p>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <p className="font-heading font-semibold">OG Exports (Private) Limited</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>
                  Website:{" "}
                  <a href="https://www.ogexports.co" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    www.ogexports.co
                  </a>
                </p>
                <p>
                  Email:{" "}
                  <a href="mailto:info@ogexports.co" className="text-accent hover:underline">
                    info@ogexports.co
                  </a>
                </p>
                <p>
                  Support:{" "}
                  <a href="mailto:info@ogexports.co" className="text-accent hover:underline">
                    info@ogexports.co
                  </a>
                </p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  You may also reach us via our{" "}
                  <Link href="/contact" className="text-accent hover:underline">Contact page</Link>.
                </p>
              </div>
            </div>

            {/* Privacy commitment */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-6">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "At OG Exports (Private) Limited, protecting the privacy, confidentiality, and security of our customers, investors, and business partners is a fundamental part of our commitment to ethical business practices. We continuously work to improve our security measures and data protection processes to provide a trusted and professional international platform for agricultural trade and investment."
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}
