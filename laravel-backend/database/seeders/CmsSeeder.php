<?php

namespace Database\Seeders;

use App\Models\Certification;
use App\Models\DocumentType;
use App\Models\Faq;
use App\Models\NewsArticle;
use App\Models\PlatformSetting;
use App\Models\SiteSetting;
use App\Models\Testimonial;
use Illuminate\Database\Seeder;

class CmsSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedSiteSettings();
        $this->seedPlatformSettings();
        $this->seedFaqs();
        $this->seedCertifications();
        $this->seedDocumentTypes();
        $this->seedTestimonials();
        $this->seedNews();
    }

    private function seedSiteSettings(): void
    {
        $settings = [
            'hero' => [
                'headline' => "Connecting the World to Pakistan's Finest Produce",
                'subheadline' => 'OG Exports bridges premium Pakistani agricultural commodities with global buyers across 40+ countries — trusted, certified, and shipment-ready.',
                'badge' => 'Global Agricultural Trade Leader',
                'ctaLabel' => 'Request a Quote',
                'ctaSecondaryLabel' => 'Explore Products',
            ],
            'stats' => [
                'countries' => '40+',
                'commodities' => '30+',
                'years' => '5+',
                'buyers' => '200+',
                'shipments' => '500+',
                'certifications' => '12',
                'partners' => '80+',
                'marketCoverage' => '65%',
            ],
            'contact' => [
                'address' => 'Plot 45, Block 7, SITE Area',
                'city' => 'Karachi, Pakistan',
                'phone' => '+92-21-3456-7890',
                'whatsapp' => '+92-303-256-9000',
                'email' => 'info@ogexports.co',
                'emailSales' => 'sales@ogexports.co',
            ],
            'social' => [
                'linkedin' => 'https://linkedin.com/company/ogexports',
                'twitter' => 'https://twitter.com/OGExports',
                'whatsapp' => 'https://wa.me/923032569000',
                'instagram' => 'https://instagram.com/ogexports',
            ],
            'footer' => [
                'tagline' => 'From Pakistan to The World — Premium Agricultural Exports',
                'copyright' => '© '.date('Y').' OG Exports. All rights reserved.',
                'quickLinks' => ['Home', 'Products', 'About', 'Invest', 'Contact'],
            ],
            'company' => [
                'description' => 'OG Exports is a Karachi-based international agricultural trading company specializing in the export of premium Pakistani commodities including Basmati rice, fresh fruits, vegetables, spices, and pulses to buyers across the Middle East, Europe, and Asia.',
                'ceoMessage' => 'Our vision has always been simple — connect Pakistan\'s world-class agricultural bounty with buyers who value quality and reliability. We have built OG Exports on trust, transparency, and a relentless commitment to excellence in every shipment we dispatch.',
                'vision' => 'To be the most trusted agricultural export company from Pakistan, recognized globally for quality, reliability, and sustainable trade practices.',
                'mission' => 'To deliver premium Pakistani agricultural products to international markets with integrity, efficiency, and end-to-end trade support — empowering both our farmers and our global buyers.',
            ],
            'registrations' => [
                'secp' => '0327442',
                'ntn' => 'I563098',
                'strn' => '32778-7638246-2',
                'psw' => 'PSW-I563098',
                'weboc' => 'WEB-KHI-20240115',
                'chamber' => '1755-C',
            ],
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
    }

    private function seedPlatformSettings(): void
    {
        $existing = PlatformSetting::query()->first();

        $payload = [
            'site_name' => 'OG Exports',
            'tagline' => 'From Pakistan to The World — Premium Agricultural Exports',
            'support_email' => 'info@ogexports.co',
            'whatsapp' => '+92-303-256-9000',
            'maintenance_mode' => false,
            'registration_open' => true,
            'kyc_required' => false,
            'investment_open' => true,
            'supplier_module_enabled' => true,
            'investment_module_enabled' => true,
            'invest_plant_visible' => false,
            'invest_feeds_visible' => false,
            'invest_ricemill_visible' => false,
            'currency' => 'USD',
            'min_investment' => 100,
            'payment_methods' => ['LC at Sight', 'TT', 'SBLC', 'Bank Transfer'],
            'notification_prefs' => ['email' => true, 'whatsapp' => true],
            'seo' => [
                'title' => 'OG Exports — Premium Pakistani Agricultural Exports',
                'description' => 'Export-grade Basmati rice, sesame, maize, fresh produce and IQF foods from Pakistan.',
            ],
        ];

        if ($existing) {
            $existing->update($payload);
        } else {
            PlatformSetting::create($payload);
        }
    }

    private function seedFaqs(): void
    {
        $faqs = [
            [
                'question' => 'What is the minimum order quantity (MOQ)?',
                'answer' => 'Most commodities start at one 20ft or 40ft container. Exact MOQ varies by product — for example Premium Basmati is typically ~25 MT per 20ft container.',
                'sort_order' => 1,
            ],
            [
                'question' => 'Which payment terms do you accept?',
                'answer' => 'We commonly work with LC at Sight, SBLC, and TT (often 30% advance). Terms can be tailored for established buyers with a verified trade history.',
                'sort_order' => 2,
            ],
            [
                'question' => 'How do I request a quotation?',
                'answer' => 'Create a buyer account, open an RFQ against the product you need, and our trade desk will respond with FOB/CIF pricing, lead time, and documentation checklist.',
                'sort_order' => 3,
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::updateOrCreate(
                ['question' => $faq['question']],
                [
                    'answer' => $faq['answer'],
                    'sort_order' => $faq['sort_order'],
                    'published' => true,
                ]
            );
        }
    }

    private function seedCertifications(): void
    {
        $certs = [
            ['name' => 'HACCP', 'issuer' => 'International Food Safety Authority', 'description' => 'Food safety management across the supply chain.'],
            ['name' => 'ISO 9001:2015', 'issuer' => 'ISO', 'description' => 'Quality management system for export operations.'],
            ['name' => 'ISO 22000', 'issuer' => 'ISO', 'description' => 'Food safety management for agricultural commodities.'],
            ['name' => 'FDA Registered', 'issuer' => 'U.S. FDA', 'description' => 'Registration for U.S.-bound food shipments.'],
            ['name' => 'SECP Registered', 'issuer' => 'SECP Pakistan', 'description' => 'Corporate registration number 0327442.'],
            ['name' => 'TDAP Certified Exporter', 'issuer' => 'Trade Development Authority of Pakistan', 'description' => 'Recognized exporter of agricultural commodities.'],
        ];

        foreach ($certs as $i => $cert) {
            Certification::updateOrCreate(
                ['name' => $cert['name']],
                [
                    'issuer' => $cert['issuer'],
                    'description' => $cert['description'],
                    'sort_order' => $i + 1,
                    'published' => true,
                ]
            );
        }
    }

    private function seedDocumentTypes(): void
    {
        $types = [
            ['name' => 'Commercial Invoice', 'description' => 'Itemized invoice for customs and payment.', 'required_for' => ['export', 'import']],
            ['name' => 'Packing List', 'description' => 'Container packing details by carton/bag.', 'required_for' => ['export']],
            ['name' => 'Bill of Lading', 'description' => 'Ocean transport title document.', 'required_for' => ['export', 'shipping']],
            ['name' => 'Certificate of Origin', 'description' => 'Proof of Pakistani origin.', 'required_for' => ['export']],
            ['name' => 'Phytosanitary Certificate', 'description' => 'Plant health certificate from DPP.', 'required_for' => ['fresh_produce', 'export']],
            ['name' => 'Certificate of Analysis (COA)', 'description' => 'Lab analysis from accredited lab.', 'required_for' => ['export', 'quality']],
            ['name' => 'Fumigation Certificate', 'description' => 'Confirms container/cargo fumigation.', 'required_for' => ['grains', 'export']],
            ['name' => 'Insurance Certificate', 'description' => 'Cargo insurance cover note.', 'required_for' => ['cif', 'investment']],
        ];

        foreach ($types as $i => $type) {
            DocumentType::updateOrCreate(
                ['name' => $type['name']],
                [
                    'description' => $type['description'],
                    'required_for' => $type['required_for'],
                    'sort_order' => $i + 1,
                    'published' => true,
                ]
            );
        }
    }

    private function seedTestimonials(): void
    {
        $items = [
            [
                'name' => 'James Whitfield',
                'role' => 'Head of Procurement — Kingsman Foods Ltd, UK',
                'content' => 'OG Exports has been our trusted Basmati supplier for three consecutive seasons. Their quality documentation is the most thorough we\'ve encountered from any Pakistani exporter — zero rejections at UK customs.',
            ],
            [
                'name' => 'Mohammed Al-Rashidi',
                'role' => 'Import Manager — Gulf Agro Trading, UAE',
                'content' => 'We source Yellow Corn and Sesame through OG Exports for our Karachi distribution hub. Consistent grade, reliable timelines, and a team that communicates proactively throughout the shipment.',
            ],
            [
                'name' => 'Farida Kasimova',
                'role' => 'Portfolio Manager — AgroCapital Partners, Singapore',
                'content' => 'Their containerised investment product delivered exactly as promised. The transparency throughout the voyage — from loading to buyer settlement — was exceptional.',
            ],
        ];

        foreach ($items as $i => $item) {
            Testimonial::updateOrCreate(
                ['name' => $item['name']],
                [
                    'role' => $item['role'],
                    'content' => $item['content'],
                    'sort_order' => $i + 1,
                    'published' => true,
                ]
            );
        }
    }

    private function seedNews(): void
    {
        $articles = [
            [
                'title' => "Pakistan's Basmati Rice Exports Hit Record \$1.2B in 2025",
                'slug' => 'pakistan-basmati-rice-exports-record-2025',
                'category' => 'Market Report',
                'content' => "Pakistan's Basmati rice exports have reached a historic milestone, crossing the \$1.2 billion mark in 2025. The surge is attributed to increased demand from Middle Eastern and European markets, improved grain quality standards, and favorable government export policies. OG Exports has been at the forefront of this growth, securing long-term supply agreements with distributors in the UAE, Saudi Arabia, and the UK.",
                'excerpt' => "Pakistan's Basmati rice exports crossed \$1.2B in 2025, driven by surging Middle Eastern demand and improved quality standards.",
                'image_url' => 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
                'author' => 'OG Exports Editorial',
                'published_at' => '2025-07-10 10:00:00',
                'tags' => ['Basmati', 'Rice', 'Exports', 'Market'],
                'featured' => true,
            ],
            [
                'title' => 'Mango Season 2025: Sindhri & Chaunsa Command Premium Prices',
                'slug' => 'mango-season-2025-sindhri-chaunsa-premium',
                'category' => 'Trade News',
                'content' => 'The 2025 mango season is underway, with Sindhri and Chaunsa varieties commanding premium prices in international markets. Early forecasts indicate a 15% increase in export volume compared to 2024. OG Exports has pre-booked shipments to 12 countries this season, including new markets in Central Asia and Scandinavia.',
                'excerpt' => 'Sindhri and Chaunsa mangoes are fetching top prices this season, with OG Exports shipping to 12 countries including new Central Asian markets.',
                'image_url' => 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80',
                'author' => 'Trade Desk',
                'published_at' => '2025-07-05 10:00:00',
                'tags' => ['Mangoes', 'Sindhri', 'Chaunsa', 'Season 2025'],
                'featured' => false,
            ],
            [
                'title' => 'New EU Phytosanitary Regulations Affecting Fresh Produce Exports',
                'slug' => 'eu-phytosanitary-regulations-fresh-produce',
                'category' => 'Regulation',
                'content' => 'The European Union has announced updated phytosanitary regulations effective September 2025, affecting imports of fresh fruits and vegetables from South Asia. Key changes include mandatory pre-shipment inspection certificates for all fresh produce, stricter pesticide residue thresholds, and enhanced traceability requirements. OG Exports has already obtained EU-compliant certifications.',
                'excerpt' => 'Updated EU phytosanitary rules effective September 2025 require enhanced documentation and lower pesticide thresholds for South Asian fresh produce.',
                'image_url' => 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
                'author' => 'Compliance Team',
                'published_at' => '2025-06-28 10:00:00',
                'tags' => ['EU', 'Regulations', 'Compliance', 'Fresh Produce'],
                'featured' => false,
            ],
        ];

        foreach ($articles as $article) {
            NewsArticle::updateOrCreate(
                ['slug' => $article['slug']],
                [
                    'title' => $article['title'],
                    'category' => $article['category'],
                    'content' => $article['content'],
                    'excerpt' => $article['excerpt'],
                    'image_url' => $article['image_url'],
                    'author' => $article['author'],
                    'type' => 'trade',
                    'published_at' => $article['published_at'],
                    'published' => true,
                    'featured' => $article['featured'],
                    'tags' => $article['tags'],
                ]
            );
        }
    }
}
