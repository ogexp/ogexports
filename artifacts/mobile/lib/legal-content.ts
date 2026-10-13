export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

const company = 'OG Exports (Private) Limited';

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    title: 'Terms of Service',
    summary: `${company} · Effective when published. These terms govern access to the OG Exports website, investor application, and related digital services.`,
    sections: [
      { heading: '1. About these Terms', paragraphs: [
        `“OG Exports”, “we”, “our” and “us” refer to ${company}, a Pakistan-based agricultural export and trade business. These Terms govern your use of our website, investor application, account features, support channels and related services (the “Platform”). Product sales, export orders and investments may also be governed by separate written agreements.`,
        'If you do not agree to these Terms, do not create or continue using an account. Mandatory rights under applicable law are not waived by these Terms.',
      ] },
      { heading: '2. Eligibility and accounts', paragraphs: [
        'You must be legally capable of entering into a binding agreement in your jurisdiction. Provide accurate, current information and update it when it changes. Do not create an account for another person without authority.',
        'You are responsible for safeguarding your credentials, devices and verification codes, and for activity performed through your account. Notify Support promptly if you suspect unauthorized access. We may request identity or business documents to meet verification, security or legal requirements.',
      ] },
      { heading: '3. Platform services and status information', paragraphs: [
        'The Platform may display trade opportunities, project documents, investment records, wallet balances, transaction history, payment instructions, shipment milestones, support messages and account controls. Availability depends on the relevant service and information supplied by OG Exports.',
        'Project, funding, payment, deposit, withdrawal and shipment statuses are informational until confirmed by the applicable system record or written agreement. An approval is not the same as completion, a planned payout is not a distribution, and a shipment update is not live carrier tracking unless expressly identified as such.',
        'Information, balances, estimates and notifications displayed by the Platform do not by themselves amend a signed agreement or guarantee that a transaction has completed.',
      ] },
      { heading: '4. Investment eligibility and agreements', paragraphs: [
        'Investment access is subject to the opportunity being open, your account meeting the stated eligibility checks, and your identity-verification status being confirmed as required for investing. The application does not treat KYC as an automatic condition for deposits or withdrawals; separate legal, security or transaction checks may still apply.',
        'Each opportunity has its own commercial details and may require a separate signed Investment Agreement. That agreement and the offer-specific terms control the investment amount, trade, parties, currency, calculation method, settlement and other project-specific obligations. These Platform Terms do not promise that any opportunity will be available or accepted.',
      ] },
      { heading: '5. Payments, wallet and withdrawals', paragraphs: [
        'Use only payment instructions shown in an authenticated OG Exports channel or confirmed in writing by authorized personnel. A deposit is not credited until the applicable records confirm receipt and verification. Never rely on a changed bank instruction received through an unverified message.',
        'The wallet currency follows the currency recorded for your profile and wallet. Where a conversion is authorized, the applicable rate and amount are those recorded for that transaction; later market rates do not rewrite historical entries.',
        'Current withdrawal terms are a minimum bank payout equivalent to USD 100, a flat USD 2 fee added on top of the requested payout (converted to wallet currency using the request’s recorded rate where applicable), and an estimated processing period of 1–2 working days. These are current operational terms, not a guarantee of timing. The amount, fee, currency and status confirmed for your request control.',
      ] },
      { heading: '6. Acceptable use', bullets: [
        'Use the Platform lawfully and only for its intended business and investor functions.',
        'Do not impersonate another person, submit false documents, manipulate transaction records, interfere with security controls, probe or disrupt systems, scrape restricted data, or upload unlawful or harmful content.',
        'Do not use the Platform to evade sanctions, fraud controls, export restrictions, payment rules or other applicable requirements.',
      ] },
      { heading: '7. Content and intellectual property', paragraphs: [
        `The Platform, its software, design, text, marks and materials are owned by ${company} or its licensors. You may use them only as needed to access the services. You retain rights in documents you submit, while allowing us to host and process them to provide the service, maintain records and meet legal obligations.`,
      ] },
      { heading: '8. Availability, suspension and termination', paragraphs: [
        'We may update, pause or restrict a Platform feature for maintenance, security, legal, operational or commercial reasons. We may suspend access where reasonably necessary to protect users, investigate suspected misuse or comply with law, and will use reasonable efforts to communicate material account actions where permitted.',
        'You may stop using the Platform and request account deletion through the in-app data controls or the public account-deletion page. Submission starts a Support review; it does not immediately close the account or erase records. Investment, transaction, accounting and compliance records may be retained where required or justified by law or an existing agreement.',
      ] },
      { heading: '9. Risk, advice and no promised outcome', paragraphs: [
        'Trade-related investments involve the possibility of delay, reduced proceeds or loss of some or all capital. Returns are not guaranteed. Platform information is not individualized financial, legal, tax or investment advice. Read the Risk Disclosure and the applicable Investment Agreement and obtain independent advice suited to your circumstances before committing funds.',
      ] },
      { heading: '10. Third-party services and links', paragraphs: [
        'The Platform may rely on banks, payment channels, email or notification providers, hosting and other service providers, and may link to external websites. Their services are subject to their own terms and privacy notices. We are not responsible for independent third-party services, except to the extent applicable law provides otherwise.',
      ] },
      { heading: '11. Changes, conflicts and contact', paragraphs: [
        'We may publish revised Terms with a revised date. Material changes will be communicated through an appropriate Platform or account channel where required. Continued use after the effective date is subject to the revised Terms, except where renewed consent is required by law.',
        'If these Terms conflict with a signed Investment Agreement or export/order contract, that signed document controls the specific transaction; mandatory law always prevails. Governing law and dispute venue for a transaction are those stated in its signed agreement or otherwise determined under applicable law.',
        `Questions: ${company}, info@ogexports.co, https://www.ogexports.co.`,
      ] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary: `${company} · Effective when published. This Policy explains how information is handled when you use OG Exports digital services.`,
    sections: [
      { heading: '1. Who we are and scope', paragraphs: [
        `${company} operates agricultural export, trade and investor services from Pakistan. This Policy applies to our website, investor application, accounts, support communications and related digital services. It should be read with the User Agreement and the specific terms for a transaction.`,
      ] },
      { heading: '2. Information we may collect', bullets: [
        'Account and contact details: name, email, optional mobile number, country, profile details and communications.',
        'Verification details: identity, address or business documents and related review status when requested for an applicable service.',
        'Financial and trade records: bank/payment references, deposit and withdrawal requests, investment participation, transaction identifiers, wallet and currency records, signed agreements, project documents and shipment/order information.',
        'Support and preference data: messages, data-rights requests, notification choices, language and display settings.',
        'Technical and security data: device, browser, IP/session information, sign-in and audit events, and error or usage records generated by the Platform.',
      ] },
      { heading: '3. How we use information', bullets: [
        'Create and secure accounts; authenticate users; provide support and maintain requested preferences.',
        'Review identity or business eligibility where applicable, administer opportunities and agreements, and maintain accurate trade, payment and investor records.',
        'Display account activity, communicate verified status changes, deliver requested notices and investigate errors or suspected misuse.',
        'Protect the Platform, meet contractual and legal obligations, respond to lawful requests, resolve disputes and maintain required business records.',
      ] },
      { heading: '4. Legal and operational basis', paragraphs: [
        'Depending on the service and applicable law, we process information to provide a requested service, perform or administer an agreement, protect users and the Platform, meet legal obligations, or pursue legitimate operational interests. Where consent is required, we will request it and you may withdraw it subject to legal and contractual limits.',
      ] },
      { heading: '5. Sharing and service providers', paragraphs: [
        'We do not sell personal information. We may disclose only information reasonably needed to authorized staff, banks and payment channels involved in your transaction, service providers that support hosting, authentication, email or notifications, professional advisers, regulators or law-enforcement bodies where legally required, and parties needed to protect rights or investigate fraud. Investor authentication emails may be delivered using Resend; push notifications may use Expo when enabled for your device. Support email, hosting, storage and payment providers depend on the service and configuration used by OG Exports. Providers should process information for their service purpose and under applicable safeguards.',
        'We do not publish your private investment or identity records. A specific transaction may require sharing relevant details with counterparties, financial institutions or authorities; the applicable agreement and law govern that disclosure.',
      ] },
      { heading: '6. International processing', paragraphs: [
        'You may access the Platform from outside Pakistan. Information may be handled in Pakistan and in other locations where infrastructure or service providers operate. Cross-border handling is subject to applicable law and safeguards appropriate to the service. Contact us if you need details about a specific transfer.',
      ] },
      { heading: '7. Retention and deletion', paragraphs: [
        'We retain information for as long as needed to provide services, administer agreements, maintain financial and trade records, protect account security, resolve disputes and meet legal, accounting or regulatory requirements. Retention periods depend on the record and applicable obligation.',
        'You may request access, correction or deletion through the in-app data controls or https://www.ogexports.co/delete-account. Support will verify account ownership and review active investments and retention duties. Eligible personal data will be deleted or anonymized; records that must remain may be retained with access limited to appropriate purposes. A request does not itself immediately close an account or erase records.',
      ] },
      { heading: '8. Security and cookies', paragraphs: [
        'We use access controls and technical and organizational safeguards intended to protect information. No internet transmission or storage system can be guaranteed completely secure. Keep credentials private and tell Support promptly about suspected account compromise.',
        'The website may use essential cookies or similar technologies for sessions, security and preferences. Disabling them may affect sign-in or other features. Any optional analytics or similar technologies, where enabled, are subject to the applicable settings and law.',
      ] },
      { heading: '9. Children and individual rights', paragraphs: [
        'The services are intended for people legally capable of entering the relevant agreement and are not designed for children. We do not knowingly seek personal information from children. If you believe a child provided information, contact Support.',
        'Depending on applicable law, you may request access, correction, deletion, a copy of available data, or changes to optional communications. We may need to verify your identity and may retain records required for legal or contractual reasons.',
      ] },
      { heading: '10. Updates and privacy contact', paragraphs: [
        'We may update this Policy and publish a revised date. Material changes will be communicated where required by law.',
        `Privacy and data requests: ${company}, info@ogexports.co, https://www.ogexports.co. Account deletion requests may also be made at https://www.ogexports.co/delete-account.`,
      ] },
    ],
  },
  risk: {
    title: 'Risk Disclosure',
    summary: 'Read this disclosure together with the offer details and signed Investment Agreement before you invest.',
    sections: [
      { heading: '1. Capital is at risk', paragraphs: [
        'An investment may be delayed, may produce less than expected, or may result in a partial or total loss of capital. OG Exports does not promise a return, repayment date or recovery of principal unless an executed agreement expressly creates a specific obligation. Do not invest money you cannot afford to lose.',
      ] },
      { heading: '2. Trade and commodity risk', paragraphs: [
        'Commercial results can change because of commodity prices, supply availability, quality or inspection outcomes, weather, crop conditions, buyer demand, contract performance, working-capital needs, operating costs and market competition. A projected margin or target is an estimate, not a guaranteed result.',
        'OG Exports arranges insurance for each export and import trade. Insurance may reduce exposure to covered losses, but it does not eliminate risk or guarantee full compensation. Coverage depends on the applicable policy, insured value, limits, exclusions, deductibles, compliance with policy conditions, notice and evidence requirements, and the insurer’s assessment. Losses outside the cover or above its limits may remain unrecovered.',
      ] },
      { heading: '3. Counterparty, logistics and force majeure', paragraphs: [
        'A supplier, buyer, carrier, bank, insurer or other counterparty may fail, dispute performance, delay payment or become insolvent. Port congestion, vessel changes, customs, export/import controls, documentation, insurance exclusions, labor disruption, weather, conflict, public-health events or other events beyond reasonable control can delay, increase costs or prevent a trade.',
      ] },
      { heading: '4. Currency, settlement and liquidity', paragraphs: [
        'Investment, wallet, payment and settlement currencies may differ. Exchange-rate changes, bank charges, transfer restrictions or conversion timing can reduce the value received. The transaction record and relevant agreement determine the applicable currency and any recorded conversion rate.',
        'An investment may not be transferable or redeemable on demand. There may be no secondary market. Withdrawal requests are subject to applicable wallet terms, verification and available processing channels; an estimated processing time is not a guaranteed completion date.',
      ] },
      { heading: '5. Operational, legal and technology risk', paragraphs: [
        'Business operations, documentation, people, systems, cybersecurity, legal or regulatory changes and tax treatment may affect a project. The Platform may be unavailable or display information that later requires correction. Confirm important terms against the executed agreement and official transaction records.',
      ] },
      { heading: '6. Estimates and past results', paragraphs: [
        'Forecasts, target dates, funding progress, sample calculations and historical results are not promises of future performance. Past results, if shown, do not reliably predict future outcomes. Actual results may differ materially from estimates.',
      ] },
      { heading: '7. Independent assessment', paragraphs: [
        'The Platform provides information, not personal financial, legal, accounting or tax advice. Assess the risks, read all project documents and obtain independent professional advice appropriate to your circumstances. Ask Support to clarify missing or inconsistent offer information before proceeding.',
      ] },
      { heading: '8. Acknowledgment', paragraphs: [
        'By separately acknowledging this disclosure and submitting an investment request, you confirm that you have had the opportunity to review these risks. Acknowledgment does not waive rights that cannot legally be waived and does not guarantee that a request will be accepted.',
      ] },
    ],
  },
  'investment-terms': {
    title: 'Investment Terms',
    summary: 'General investor-platform terms. The specific offer and executed Investment Agreement control each investment.',
    sections: [
      { heading: '1. Opportunity-specific contract', paragraphs: [
        'Each opportunity is tied to the trade or business project described in its offer. Commodity, trade parties, destination, expected timeline, participation amount, calculation basis, settlement conditions and currency must be confirmed in that offer and its signed Investment Agreement. Do not infer missing terms from another project or from a dashboard estimate.',
        'If these general terms differ from a signed Investment Agreement, the signed agreement controls the relevant investment, subject to mandatory law.',
      ] },
      { heading: '2. Eligibility and request process', paragraphs: [
        'Only an account that meets the current opportunity requirements and has the server-confirmed Verified status may submit an investment. OG Exports may request information needed to assess eligibility. A displayed opportunity may close, change or become unavailable before a request is accepted.',
        'Submitting a request is not, by itself, proof that funds were received or that an investment agreement was executed. The authoritative response, payment record and signed agreement determine acceptance and status.',
      ] },
      { heading: '3. Trade records and updates', paragraphs: [
        'Project documents, trade identifiers, funding progress, milestones and updates are provided when recorded by OG Exports. A planned shipment date or pre-payment payout status is not evidence that shipment, distribution or settlement has occurred. Only an expressly confirmed transaction record establishes completion.',
      ] },
      { heading: '4. Capital, returns and settlement', paragraphs: [
        'Capital is exposed to the risks described in the Risk Disclosure. No profit, principal return, distribution or settlement timing is guaranteed unless the signed agreement expressly says otherwise. Any return calculation, permitted deduction, payment condition and distribution timing must be taken from the specific agreement and final transaction records.',
        'A completed investment return may be recorded as a single credit. The Platform will not split principal and profit unless the authoritative records support that breakdown.',
      ] },
      { heading: '5. Currency and wallet records', paragraphs: [
        'An offer and signed agreement identify the investment currency. Your profile and wallet display currency may be different from the investment or settlement currency. Conversion, where supported, uses the transaction’s recorded rate and amount; later rates do not restate past transactions.',
      ] },
      { heading: '6. Deposits and withdrawals', paragraphs: [
        'Follow only verified payment instructions shown in your account or confirmed by authorized OG Exports staff. A deposit is recognized only after the official record confirms receipt and any required review.',
        'Current withdrawal operations use a USD 100 minimum bank payout and a flat USD 2 fee in addition to the payout. For a non-USD wallet, the fee is converted using the rate recorded for that request. The estimated processing time is 1–2 working days. These current operational values may be changed prospectively; the confirmed terms and rate snapshot on your request control. Processing estimates are not a guarantee.',
      ] },
      { heading: '7. Records, statements and questions', paragraphs: [
        'Keep copies of your offer, signed agreement, confirmations, receipts and account statements. Report a discrepancy through the in-app Support channel promptly and include the relevant transaction ID or reference. Support review does not itself change a recorded transaction.',
      ] },
      { heading: '8. Risk and independent advice', paragraphs: [
        'Trade-based investment carries commercial, counterparty, market, logistics, currency, liquidity, legal, operational and technology risks. The Platform does not give individualized advice or promise a return. Read the Risk Disclosure and obtain independent advice before committing funds.',
      ] },
    ],
  },
  'user-agreement': {
    title: 'User Agreement',
    summary: `${company} · Effective when published. This Agreement explains account access, responsibilities and the limits of the OG Exports investor Platform.`,
    sections: [
      { heading: '1. Agreement and acceptance', paragraphs: [
        `This User Agreement is between you and ${company}. Creating an account, signing in or using investor features means you agree to this Agreement, the Terms of Service, Privacy Policy and Risk Disclosure. Opportunity-specific rights and duties are set out in the applicable signed Investment Agreement.`,
      ] },
      { heading: '2. Account details and security', bullets: [
        'Use your own accurate identity and contact details and keep them current.',
        'Protect passwords, verification codes, devices and recovery access. Do not share or transfer account access.',
        'Tell Support promptly if your account or a transaction may have been accessed or changed without authorization.',
        'You are responsible for activity performed through your account except where applicable law provides otherwise.',
      ] },
      { heading: '3. Verification and investment access', paragraphs: [
        'We may request identity, address or business records to protect accounts, meet applicable requirements and assess service eligibility. Investment features require the server-reported Verified status and any additional offer-specific eligibility. Verification is not a promise that an investment request will be accepted.',
      ] },
      { heading: '4. Your use of the Platform', bullets: [
        'Use the service for legitimate personal or business purposes and comply with applicable laws and signed agreements.',
        'Do not impersonate anyone, misstate source of funds, provide falsified records, misuse another account, interfere with security, scrape restricted data, reverse engineer protected components, or disrupt the service.',
        'Upload only material you are authorized to provide. Do not upload malware, unlawful content or another person’s sensitive information unless the Platform specifically requests it.',
      ] },
      { heading: '5. Information and transaction records', paragraphs: [
        'You may view account, wallet, investment, trade and support records made available by OG Exports. These records are operational information; they do not replace a signed contract, bank confirmation or official source record. Contact Support if a material record appears incorrect.',
        'A request marked submitted, pending, approved or processing is not necessarily complete. Completion is shown only when the authoritative record says it is complete.',
      ] },
      { heading: '6. Communications and notifications', paragraphs: [
        'We may send account, security, support, verification, transaction and legally required notices to the contact details registered on your account or through in-app channels. Keep contact information current and review security alerts. Optional notification preferences may be changed in the application, but essential service or legal notices may still be sent.',
      ] },
      { heading: '7. Suspension and account closure', paragraphs: [
        'We may restrict or suspend access where reasonably required for security, legal compliance, suspected fraud, inaccurate information or breach of this Agreement. Where permitted, we will communicate the reason and available next steps.',
        'You may request account and data deletion through the in-app Data Preferences page or the public account-deletion page. Support verifies ownership and reviews active investments and retention duties. Submission does not immediately terminate the account; records that must be retained may remain subject to restricted access.',
      ] },
      { heading: '8. No advice or guaranteed outcomes', paragraphs: [
        'The Platform does not provide personalized investment, legal, tax or accounting advice. No display, projection, estimate, shipment milestone or funding status guarantees a commercial outcome, return, repayment or date. Review the Risk Disclosure and specific contract before acting.',
      ] },
      { heading: '9. Changes, governing terms and contact', paragraphs: [
        'We may update this Agreement and publish a revised date. The Terms of Service govern general Platform use. The signed Investment Agreement governs project-specific investment matters if inconsistent with general Platform copy, subject to mandatory law. Governing law and dispute venue are those stated in the applicable signed agreement or otherwise determined by applicable law.',
        `Questions or account notices: ${company}, info@ogexports.co, https://www.ogexports.co.`,
      ] },
    ],
  },
};

export function legalDocumentFileContent(
  document: LegalDocument,
  language: 'en' | 'ur' | 'ar',
  isPendingDraft: boolean,
): string {
  const labels = {
    en: {
      language: 'Language',
      english: 'Approved English source',
      urdu: 'Urdu draft',
      arabic: 'Arabic draft',
      summary: 'Summary',
      draftNotice: 'Translation draft — qualified review pending. This translation is not approved. The approved English source is available in the app.',
    },
    ur: {
      language: 'زبان',
      english: 'منظور شدہ انگریزی اصل',
      urdu: 'اردو مسودہ',
      arabic: 'عربی مسودہ',
      summary: 'خلاصہ',
      draftNotice: 'ترجمے کا مسودہ — ماہر کا جائزہ باقی ہے۔ یہ ترجمہ منظور شدہ نہیں۔ منظور شدہ انگریزی اصل ایپ میں دستیاب ہے۔',
    },
    ar: {
      language: 'اللغة',
      english: 'المصدر الإنجليزي المعتمد',
      urdu: 'مسودة أردية',
      arabic: 'مسودة عربية',
      summary: 'الملخص',
      draftNotice: 'مسودة ترجمة — بانتظار المراجعة المتخصصة. هذه الترجمة غير معتمدة. المصدر الإنجليزي المعتمد متاح في التطبيق.',
    },
  }[language];
  const languageLabel = language === 'en' ? labels.english : language === 'ur' ? labels.urdu : labels.arabic;
  const sections = document.sections.flatMap(section => [
    section.heading,
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []).map(bullet => `• ${bullet}`),
    '',
  ]);

  return [
    'OG Exports',
    document.title,
    `${labels.language}: ${languageLabel}`,
    ...(isPendingDraft ? [labels.draftNotice] : []),
    '',
    labels.summary,
    document.summary,
    '',
    ...sections,
  ].join('\n');
}

export function legalDocumentFilename(
  section: string,
  language: 'en' | 'ur' | 'ar',
  isPendingDraft: boolean,
): string {
  const safeSection = section.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'policy';
  return `og-exports-${safeSection}-${language}${isPendingDraft ? '-draft' : ''}.txt`;
}
