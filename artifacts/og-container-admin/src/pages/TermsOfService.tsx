import { Link } from "wouter"

const SECTIONS = [
  {
    id: 1,
    title: "Company Overview",
    content: (
      <>
        <p>OG Exports (Private) Limited is a Pakistan-based company engaged in the export and international supply of agricultural commodities and the management of business investment opportunities related to its commercial operations.</p>
        <p>The platform currently operates through two primary business divisions:</p>
        <ul>
          <li>OG Exports – Agricultural Export &amp; Supply</li>
          <li>OG Exports Investment</li>
        </ul>
      </>
    )
  },
  {
    id: 2,
    title: "Eligibility",
    content: (
      <>
        <p>To use our platform, users must:</p>
        <ul>
          <li>Be legally capable of entering into binding agreements.</li>
          <li>Provide accurate and complete information.</li>
          <li>Maintain the confidentiality of their account credentials.</li>
          <li>Comply with all applicable laws and regulations.</li>
        </ul>
      </>
    )
  },
  {
    id: 3,
    title: "User Registration",
    content: (
      <>
        <p>Users may register an account to access platform services. Registration requires accurate personal or company information. Users are responsible for maintaining the security of their accounts.</p>
        <p>OG Exports reserves the right to suspend or terminate accounts containing false, misleading, or fraudulent information.</p>
      </>
    )
  },
  {
    id: 4,
    title: "KYC Verification",
    content: (
      <>
        <p>Users may register and browse the platform without completing Know Your Customer (KYC) verification. However, KYC approval is required before accessing restricted services, including but not limited to:</p>
        <ul>
          <li>Making investments.</li>
          <li>Depositing funds.</li>
          <li>Requesting withdrawals.</li>
          <li>Executing investment agreements.</li>
          <li>Accessing certain financial features.</li>
        </ul>
        <p>OG Exports reserves the right to approve, reject, or request additional documentation as part of the KYC process.</p>
      </>
    )
  },
  {
    id: 5,
    title: "Products & Export Services",
    content: (
      <p>Product information, technical specifications, certifications, laboratory analysis reports, FOB prices, and export documentation are provided for informational and commercial purposes. Prices, availability, specifications, and delivery schedules may change without prior notice due to market conditions, supplier availability, logistics, currency fluctuations, or regulatory requirements.</p>
    )
  },
  {
    id: 6,
    title: "Shipping Terms",
    content: (
      <>
        <p>Supported delivery terms may include:</p>
        <ul>
          <li>EXW (Ex Works)</li>
          <li>FOB (Free On Board)</li>
          <li>CFR (Cost and Freight)</li>
          <li>CIF (Cost, Insurance and Freight)</li>
          <li>Air Shipment</li>
        </ul>
        <p>Shipping schedules, freight costs, customs procedures, and transit times may vary depending on destination, shipping line, government regulations, weather conditions, and other operational factors.</p>
      </>
    )
  },
  {
    id: 6.1,
    title: "Request for Quotation (RFQ) & Quotations",
    content: (
      <>
        <p>Registered buyers may submit a Request for Quotation (RFQ) through the Buyer Portal. Quotations are prepared as follows:</p>
        <ul>
          <li>FOB requests may be quoted instantly based on the Company's daily FOB price sheet.</li>
          <li>CIF and CFR requests are priced by our Trade Desk after assessment of freight, insurance, and destination costs.</li>
          <li>Quotations may include product cost, ocean freight, marine insurance, and documentation charges as applicable.</li>
        </ul>
        <p>Unless otherwise stated, quotations are valid for seven (7) days from the date of issue. A quotation constitutes an invitation to transact and becomes binding only upon written order confirmation by OG Exports and receipt of the agreed payment. The Company reserves the right to revise or withdraw any quotation prior to order confirmation due to market movements, freight changes, or supply conditions.</p>
      </>
    )
  },
  {
    id: 6.2,
    title: "Online Orders, Cart & Payments",
    content: (
      <>
        <p>Buyers may place orders through the platform's cart and checkout facility. The following conditions apply:</p>
        <ul>
          <li>Quantities may be entered in metric tons (MT), kilograms, bags, or container loads; all pricing is calculated on a per-MT basis after unit conversion.</li>
          <li>Orders are subject to the minimum order quantity (MOQ) stated for each product.</li>
          <li>Payment must be made only through officially designated bank accounts or approved channels (including telegraphic transfer, letter of credit, or other agreed instruments).</li>
          <li>An order is confirmed only after successful payment verification by the Company.</li>
        </ul>
        <p>Order cancellations or amendments after confirmation are subject to the Company's written approval and may involve costs already incurred (procurement, packing, freight bookings, or documentation).</p>
      </>
    )
  },
  {
    id: 6.3,
    title: "Wholesale Imported Products (Pakistan)",
    content: (
      <p>OG Exports also imports selected products and sells them directly to verified Pakistani businesses through its Imported Products marketplace. All such products are owned, imported, and sold exclusively by OG Exports; no third-party sellers operate on the platform. Stock availability, wholesale prices, delivery times, and warehouse locations are indicative and subject to change. Certain prices may be provided only on request following business verification.</p>
    )
  },
  {
    id: 7,
    title: "Investment Platform",
    content: (
      <>
        <p>OG Exports offers business-related investment opportunities connected to its commercial activities. Current investment categories may include:</p>
        <ul>
          <li>Containerised Investment</li>
          <li>Fresh Fruits &amp; Vegetables Market Investment</li>
          <li>Potato Processing Plant Investment</li>
        </ul>
        <p>Participation in any investment opportunity is subject to acceptance of the applicable Investment Agreement and compliance with platform requirements.</p>
      </>
    )
  },
  {
    id: 8,
    title: "Containerised Investment",
    content: (
      <>
        <p>Containerised Investment enables multiple verified investors to participate in funding a specific export container. Each investment opportunity may display:</p>
        <ul>
          <li>Commodity</li>
          <li>Origin &amp; Destination</li>
          <li>Estimated Project Duration</li>
          <li>Funding Target &amp; Current Funding Progress</li>
          <li>Number of Investors</li>
          <li>Minimum Investment Amount</li>
          <li>Estimated Shipment Timeline</li>
          <li>Supporting Documents</li>
        </ul>
        <p>When the required funding amount is reached, the investment opportunity will close automatically and no further participation will be accepted. Project updates will be available through the Investor Dashboard.</p>
      </>
    )
  },
  {
    id: 9,
    title: "Investment Completion & Settlement",
    content: (
      <p>Upon successful completion of the commercial project, shipment process, contractual settlement, and receipt of applicable funds, the project status will be updated within the Investor Dashboard. Where applicable under the relevant Investment Agreement, financial settlement and distribution will be processed in accordance with the agreed project terms. Project timelines shown on the platform are estimates and may change due to operational, commercial, regulatory, or logistical circumstances.</p>
    )
  },
  {
    id: 10,
    title: "No Guarantee of Results",
    content: (
      <p>Information presented on the platform, including estimated timelines, project information, funding progress, and business projections, is provided for informational purposes only. Nothing on the platform shall be interpreted as a guarantee of profits, financial returns, or project outcomes. Users are encouraged to carefully review all available project information and documentation before participating.</p>
    )
  },
  {
    id: 11,
    title: "Deposits",
    content: (
      <>
        <p>Deposits must only be made to officially designated company bank accounts or approved payment channels. Funds will be credited only after successful verification by the Company.</p>
        <p>OG Exports reserves the right to request additional verification before approving any deposit.</p>
      </>
    )
  },
  {
    id: 12,
    title: "Withdrawals",
    content: (
      <p>Withdrawal requests are subject to internal verification, compliance procedures, and applicable business processes. Processing times may vary depending on banking procedures, compliance reviews, and operational requirements.</p>
    )
  },
  {
    id: 13,
    title: "Intellectual Property",
    content: (
      <p>All content, trademarks, branding, graphics, software, documents, reports, product information, and website materials remain the exclusive property of OG Exports (Private) Limited unless otherwise stated. Unauthorized copying, distribution, reproduction, or commercial use is strictly prohibited.</p>
    )
  },
  {
    id: 14,
    title: "User Responsibilities",
    content: (
      <>
        <p>Users agree to:</p>
        <ul>
          <li>Provide accurate information.</li>
          <li>Maintain account security.</li>
          <li>Use the platform lawfully.</li>
          <li>Respect intellectual property rights.</li>
          <li>Avoid fraudulent or misleading activities.</li>
          <li>Comply with applicable local and international laws.</li>
        </ul>
      </>
    )
  },
  {
    id: 15,
    title: "Limitation of Liability",
    content: (
      <p>To the maximum extent permitted by applicable law, OG Exports shall not be liable for delays, interruptions, losses, or damages arising from events beyond its reasonable control, including but not limited to force majeure events, weather conditions, shipping delays, customs actions, port congestion, governmental restrictions, labor disputes, or other unforeseen circumstances.</p>
    )
  },
  {
    id: 16,
    title: "Suspension or Termination",
    content: (
      <p>OG Exports reserves the right to suspend, restrict, or terminate any account that violates these Terms &amp; Conditions, applicable laws, or platform policies.</p>
    )
  },
  {
    id: 17,
    title: "Amendments",
    content: (
      <p>OG Exports may update or revise these Terms &amp; Conditions from time to time. Updated versions will become effective upon publication on the website. Continued use of the platform constitutes acceptance of the revised Terms.</p>
    )
  },
  {
    id: 18,
    title: "Governing Law",
    content: (
      <p>These Terms &amp; Conditions shall be governed by and interpreted in accordance with the laws applicable to OG Exports (Private) Limited, unless otherwise agreed in writing between the parties.</p>
    )
  },
]

export default function TermsOfService() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div className="bg-card border-b border-border pt-32 pb-16">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">Terms &amp; Conditions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please read these Terms &amp; Conditions carefully before accessing or using the OG Exports platform.
          </p>
          <p className="text-sm text-muted-foreground">Effective Date: July 16, 2026</p>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-16 md:py-24 max-w-3xl mx-auto space-y-2">

        {/* Acceptance notice */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-12">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to OG Exports (Private) Limited ("OG Exports", "Company", "we", "our", or "us"). By accessing or using our website, services, products, or investment platform, you agree to be bound by these Terms &amp; Conditions. If you do not agree with these Terms, please discontinue the use of our platform.
          </p>
        </div>

        {/* Table of contents */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-12">
          <h2 className="font-heading font-semibold text-base mb-4">Contents</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#section-${s.id}`}
                className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-2"
              >
                <span className="text-accent font-semibold text-xs w-5 shrink-0">{i + 1}.</span>
                {s.title}
              </a>
            ))}
            <a href="#section-contact" className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-2">
              <span className="text-accent font-semibold text-xs w-5 shrink-0">{SECTIONS.length + 1}.</span>
              Contact Information
            </a>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={`section-${s.id}`} className="scroll-mt-24 space-y-4 pb-10 border-b border-border/50 last:border-0">
              <h2 className="text-xl font-heading font-semibold flex items-baseline gap-3">
                <span className="text-accent text-base font-bold">{i + 1}.</span>
                {s.title}
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-none [&_ul_li]:flex [&_ul_li]:items-start [&_ul_li]:gap-2 [&_ul_li]:before:content-['—'] [&_ul_li]:before:text-accent [&_ul_li]:before:shrink-0 [&_ul_li]:before:mt-0.5">
                {s.content}
              </div>
            </section>
          ))}

          {/* Section 19 — Contact */}
          <section id="section-contact" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-heading font-semibold flex items-baseline gap-3">
              <span className="text-accent text-base font-bold">{SECTIONS.length + 1}.</span>
              Contact Information
            </h2>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <p className="font-heading font-semibold">OG Exports (Private) Limited</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>
                  Email:{" "}
                  <a href="mailto:info@ogexports.co" className="text-accent hover:underline">
                    info@ogexports.co
                  </a>
                </p>
                <p>
                  Website:{" "}
                  <a href="https://www.ogexports.co" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    www.ogexports.co
                  </a>
                </p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  For account or platform questions, you may also use our{" "}
                  <Link href="/contact" className="text-accent hover:underline">
                    Contact page
                  </Link>.
                </p>
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}
