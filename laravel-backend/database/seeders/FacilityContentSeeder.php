<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class FacilityContentSeeder extends Seeder
{
    /**
     * Seed investor facility page CMS content when empty (non-destructive).
     */
    public function run(): void
    {
        $settings = PlatformSetting::query()->firstOrCreate([]);
        $existing = $settings->facility_content ?? [];

        $defaults = [
            'plant' => $this->plantContent(),
            'feed' => $this->feedContent(),
            'ricemill' => $this->riceMillContent(),
        ];

        $merged = $existing;
        foreach ($defaults as $type => $content) {
            if (! is_array($existing[$type] ?? null) || $existing[$type] === []) {
                $merged[$type] = $content;
            }
        }

        if ($merged === $existing) {
            $this->command?->info('Facility content already present — skipped.');

            return;
        }

        $settings->update(['facility_content' => $merged]);
        $this->command?->info('Facility content seeded for empty facility types.');
    }

    /**
     * @return array<string, mixed>
     */
    private function plantContent(): array
    {
        return [
            'layoutTitle' => 'Potato Processing Plant',
            'layoutSubtitle' => 'Depalpur IQF Facility — Production, Expansion & Investment',
            'projectCode' => 'OG-PP-2026',
            'projectStatus' => 'Operational',
            'hero' => [
                'eyebrow' => 'Strategic investment opportunity · 2026',
                'title' => "Invest in Pakistan's modern potato processing industry.",
                'description' => 'A high-capacity IQF potato processing plant with washing, peeling, blanching, freezing and export-grade packaging — transparent milestones and long-term returns.',
                'investCta' => 'Invest now',
                'downloadCta' => 'Download memorandum',
                'meetingCta' => 'Schedule meeting',
            ],
            'stats' => [
                ['label' => 'Plant capacity', 'value' => '120 MT/day', 'change' => 'full capacity target', 'color' => 'text-emerald-500'],
                ['label' => 'Current output', 'value' => '72 MT/day', 'change' => '60% utilization', 'color' => 'text-blue-500'],
                ['label' => 'Total investment', 'value' => '$1.20M', 'change' => '+8.4% target', 'color' => 'text-accent'],
                ['label' => 'Revenue this quarter', 'value' => '$284.0K', 'change' => '+22.4% YoY', 'color' => 'text-emerald-500'],
            ],
            'utilizationBadge' => 'Operational',
            'utilizationTitle' => 'Plant Utilization',
            'utilizationRows' => [
                ['label' => 'Overall output', 'value' => '72 / 120 MT/day', 'pct' => 60],
                ['label' => 'IQF freezing', 'value' => '60 / 120 MT/day', 'pct' => 50],
                ['label' => 'Blanching line', 'value' => '85 / 120 MT/day', 'pct' => 71],
                ['label' => 'Cold storage', 'value' => '480 / 600 MT', 'pct' => 80],
            ],
            'overviewTitle' => 'The essential terms of the OG Potato Processing Plant',
            'overviewDetails' => [
                ['label' => 'Industry', 'value' => 'Food Processing & IQF Export'],
                ['label' => 'Location', 'value' => 'Depalpur, District Okara, Punjab, Pakistan'],
                ['label' => 'Investment model', 'value' => 'Private Equity Investment'],
                ['label' => 'Target investment', 'value' => 'USD 1.20 Million'],
                ['label' => 'Minimum investment', 'value' => 'USD 2,000'],
            ],
            'processingStages' => [
                ['id' => 1, 'label' => 'Raw potato intake', 'desc' => 'Procurement from contracted farmers — Punjab & KPK', 'capacity' => '120 MT/day', 'status' => 'operational'],
                ['id' => 2, 'label' => 'Washing & sorting', 'desc' => 'Industrial washing lines, automated weight sorting', 'capacity' => '110 MT/day', 'status' => 'operational'],
                ['id' => 3, 'label' => 'Peeling & slicing', 'desc' => 'Kiremko BV continuous peeling and slicing lines', 'capacity' => '100 MT/day', 'status' => 'operational'],
                ['id' => 4, 'label' => 'Blanching & dehydration', 'desc' => 'Steam blanching and hot-air dehydration tunnels', 'capacity' => '85 MT/day', 'status' => 'partial'],
                ['id' => 5, 'label' => 'IQF freezing', 'desc' => 'Individual Quick Freeze tunnel — Kiremko IQF system', 'capacity' => '60 MT/day', 'status' => 'partial'],
                ['id' => 6, 'label' => 'Packaging & cold storage', 'desc' => 'Automated 10 kg / 25 kg export-grade packaging', 'capacity' => '72 MT/day', 'status' => 'operational'],
            ],
            'timelineTitle' => 'Depalpur IQF Plant — development milestones',
            'timelineSubtitle' => 'Project timeline',
            'timeline' => [
                ['year' => '2023', 'q' => 'Q1', 'label' => 'Land & infrastructure', 'desc' => '3-acre facility acquired in Depalpur. Civil works begun.', 'done' => true],
                ['year' => '2023', 'q' => 'Q3', 'label' => 'Machinery import', 'desc' => 'Kiremko BV processing lines imported from Netherlands.', 'done' => true],
                ['year' => '2024', 'q' => 'Q1', 'label' => 'Phase 1 commissioning', 'desc' => 'Washing, sorting and peeling lines operational.', 'done' => true],
                ['year' => '2024', 'q' => 'Q3', 'label' => 'First export contract', 'desc' => 'Signed contract with Saudi Arabian importer.', 'done' => true],
                ['year' => '2025', 'q' => 'Q2', 'label' => 'IQF line 1 installed', 'desc' => 'Individual Quick Freeze tunnel 1 commissioned.', 'done' => true],
                ['year' => '2026', 'q' => 'Q1', 'label' => 'Solar energy online', 'desc' => '250 kW solar installation completed.', 'done' => true],
                ['year' => '2026', 'q' => 'Q3', 'label' => 'IQF line 2 (planned)', 'desc' => 'Second IQF tunnel to double freezing capacity.', 'done' => false],
                ['year' => '2027', 'q' => 'Q1', 'label' => 'Full capacity target', 'desc' => '120 MT/day full plant utilization achieved.', 'done' => false],
            ],
            'productionData' => [
                ['month' => 'Jan', 'output' => 48, 'revenue' => 144000, 'profit' => 22000],
                ['month' => 'Feb', 'output' => 52, 'revenue' => 156000, 'profit' => 25000],
                ['month' => 'Mar', 'output' => 58, 'revenue' => 174000, 'profit' => 31000],
                ['month' => 'Apr', 'output' => 63, 'revenue' => 189000, 'profit' => 36000],
                ['month' => 'May', 'output' => 68, 'revenue' => 204000, 'profit' => 41000],
                ['month' => 'Jun', 'output' => 71, 'revenue' => 213000, 'profit' => 45000],
                ['month' => 'Jul', 'output' => 72, 'revenue' => 216000, 'profit' => 48000],
            ],
            'operationalUpdates' => [
                ['date' => 'Jul 10, 2026', 'title' => 'IQF Line 1 — full operations', 'desc' => 'Primary IQF freezing line reached full operational capacity at 60 MT/day.'],
                ['date' => 'Jul 05, 2026', 'title' => 'Q2 2026 audit report released', 'desc' => 'Independent audit confirms 99.2% food safety compliance. Full report available.'],
                ['date' => 'Jun 28, 2026', 'title' => 'IQF Phase 2 funding — 72%', 'desc' => '$273,600 of $380,000 target raised. Expansion on track for Q3 start.'],
                ['date' => 'Jun 15, 2026', 'title' => 'June production target met', 'desc' => 'Monthly production target of 70 MT/day achieved. Revenue: $213,000.'],
            ],
            'allocation' => [
                ['label' => 'IQF expansion', 'pct' => 32, 'value' => '$384K'],
                ['label' => 'Dehydrated powder line', 'pct' => 15, 'value' => '$180K'],
                ['label' => 'Solar installation', 'pct' => 8, 'value' => '$95K'],
                ['label' => 'Cold storage upgrade', 'pct' => 18, 'value' => '$216K'],
                ['label' => 'Working capital', 'pct' => 12, 'value' => '$144K'],
                ['label' => 'Quality & certification', 'pct' => 5, 'value' => '$60K'],
                ['label' => 'Contingency reserve', 'pct' => 10, 'value' => '$121K'],
            ],
            'allocationTitle' => 'How expansion capital is planned',
            'whyThisProject' => [
                ['title' => 'Export demand', 'desc' => 'Growing GCC and regional frozen food markets'],
                ['title' => 'Proven operations', 'desc' => 'Existing plant with active export contracts'],
                ['title' => 'Energy efficiency', 'desc' => 'Solar reducing operating costs by 32%'],
                ['title' => 'Scalable IQF capacity', 'desc' => 'Phase 2 doubles freezing output'],
            ],
            'faqs' => [
                ['question' => 'Why invest in the OG Potato Processing Plant?', 'answer' => "Pakistan's potato processing and IQF export sector continues to grow. The Depalpur facility has proven operations, active export contracts and expansion projects with transparent funding milestones."],
                ['question' => 'How are profits distributed?', 'answer' => 'Projected returns are distributed quarterly once expansion milestones are met, subject to the final investment agreement and audited project performance.'],
                ['question' => 'What is the minimum investment?', 'answer' => 'Minimum participation varies by expansion project, starting from USD 2,000.'],
            ],
            'footerCta' => [
                'title' => "Become a strategic investor in Pakistan's growing food processing industry.",
                'description' => 'Review the memorandum, then speak with the OG Capital investment team.',
                'investLabel' => 'Invest now',
                'contactLabel' => 'Contact team',
            ],
            'downloadFilename' => 'og-potato-plant-investment-memorandum.txt',
            'downloadContents' => "OG POTATO PROCESSING PLANT\nInvestment Memorandum\nTarget: USD 1.20 Million\nMinimum: USD 2,000\nProjected ROI: 12%–22% annually\n",
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function feedContent(): array
    {
        return [
            'layoutTitle' => 'OG Feed Mill Project',
            'layoutSubtitle' => 'Depalpur, Okara · Planning & Development · Agriculture & Animal Nutrition',
            'projectCode' => 'OG-FM-2026',
            'projectStatus' => 'Planning & Development',
            'hero' => [
                'eyebrow' => 'Strategic investment opportunity · 2026',
                'title' => "Invest in Pakistan's modern feed manufacturing industry.",
                'description' => 'A high-capacity animal feed mill designed for poultry, dairy, livestock and aquaculture sectors — with transparent milestones and sustainable long-term returns.',
                'investCta' => 'Invest now',
                'downloadCta' => 'Download memorandum',
                'meetingCta' => 'Schedule meeting',
            ],
            'stats' => [
                ['label' => 'Installed capacity', 'value' => '150 T/day', 'change' => 'full capacity target', 'color' => 'text-emerald-500'],
                ['label' => 'Current readiness', 'value' => '78 T/day', 'change' => '52% utilization', 'color' => 'text-blue-500'],
                ['label' => 'Target investment', 'value' => '$1.50M', 'change' => 'USD target', 'color' => 'text-accent'],
                ['label' => 'Projected annual revenue', 'value' => '$412.0K', 'change' => '+18.4% scenario', 'color' => 'text-emerald-500'],
            ],
            'utilizationBadge' => 'Development ready',
            'utilizationRows' => [
                ['label' => 'Overall output', 'value' => '78 / 150 T/day', 'pct' => 52],
                ['label' => 'Poultry feed line', 'value' => '62 / 100 T/day', 'pct' => 62],
                ['label' => 'Dairy & cattle line', 'value' => '38 / 75 T/day', 'pct' => 51],
                ['label' => 'Fish feed line', 'value' => '14 / 25 T/day', 'pct' => 56],
            ],
            'overviewTitle' => 'The essential terms of the OG Feed Mill Project',
            'overviewDetails' => [
                ['label' => 'Industry', 'value' => 'Agriculture & Animal Nutrition'],
                ['label' => 'Location', 'value' => 'Depalpur, District Okara, Punjab, Pakistan'],
                ['label' => 'Investment model', 'value' => 'Private Equity Investment'],
                ['label' => 'Target investment', 'value' => 'USD 1.50 Million'],
                ['label' => 'Minimum investment', 'value' => 'USD 100'],
            ],
            'processingStages' => [
                ['id' => 1, 'label' => 'Raw material intake', 'desc' => 'Corn, soybean meal & bran procurement from Punjab supply partners', 'capacity' => '120 T/day', 'status' => 'partial'],
                ['id' => 2, 'label' => 'Batching & dosing', 'desc' => 'Automated weighing for consistent formulation accuracy', 'capacity' => '100 T/day', 'status' => 'partial'],
                ['id' => 3, 'label' => 'Grinding & mixing', 'desc' => 'Hammer mill and twin-shaft mixing for uniform nutrition', 'capacity' => '100 T/day', 'status' => 'planned'],
                ['id' => 4, 'label' => 'Pelleting & cooling', 'desc' => 'Steam conditioning, pelleting and counterflow cooling', 'capacity' => '100 T/day', 'status' => 'planned'],
                ['id' => 5, 'label' => 'Quality assurance', 'desc' => 'Moisture, protein and aflatoxin testing in the onsite laboratory', 'capacity' => 'All batches', 'status' => 'planned'],
                ['id' => 6, 'label' => 'Bagging & dispatch', 'desc' => '25 / 50 kg packaging for regional distributors and farms', 'capacity' => '150 T/day', 'status' => 'planned'],
            ],
            'timelineTitle' => 'Depalpur Feed Mill — development milestones',
            'timelineSubtitle' => 'Project timeline',
            'timeline' => [
                ['year' => '2026', 'q' => 'Q3', 'label' => 'Land & infrastructure', 'desc' => 'Site due diligence and land acquisition documentation.', 'done' => false],
                ['year' => '2026', 'q' => 'Q4', 'label' => 'Engineering & design', 'desc' => 'Final process design, vendor selection and civil drawings.', 'done' => false],
                ['year' => '2027', 'q' => 'Q1', 'label' => 'Construction', 'desc' => 'Civil works, silos and utility infrastructure on the Depalpur site.', 'done' => false],
                ['year' => '2027', 'q' => 'Q2', 'label' => 'Machinery installation', 'desc' => 'Grinding, batching, pelleting and packing equipment commissioned.', 'done' => false],
                ['year' => '2027', 'q' => 'Q3', 'label' => 'Trial production', 'desc' => 'Pilot batches tested and quality systems validated.', 'done' => false],
                ['year' => '2027', 'q' => 'Q4', 'label' => 'Commercial operations', 'desc' => 'First commercial dispatches to contracted distributors.', 'done' => false],
            ],
            'productionData' => [
                ['month' => 'Jan', 'output' => 42, 'revenue' => 88000, 'profit' => 12000],
                ['month' => 'Feb', 'output' => 48, 'revenue' => 102000, 'profit' => 15000],
                ['month' => 'Mar', 'output' => 55, 'revenue' => 118000, 'profit' => 18000],
                ['month' => 'Apr', 'output' => 62, 'revenue' => 135000, 'profit' => 22000],
                ['month' => 'May', 'output' => 68, 'revenue' => 152000, 'profit' => 28000],
                ['month' => 'Jun', 'output' => 74, 'revenue' => 168000, 'profit' => 32000],
                ['month' => 'Jul', 'output' => 78, 'revenue' => 185000, 'profit' => 36000],
            ],
            'operationalUpdates' => [
                ['date' => 'Jul 18, 2026', 'title' => 'Capacity study approved', 'desc' => 'Feasibility review confirmed a 100–150 T/day modular line.'],
                ['date' => 'Jul 12, 2026', 'title' => 'Feed formulation lab scoped', 'desc' => 'Quality lab specification added for poultry, dairy and aqua formulations.'],
                ['date' => 'Jul 04, 2026', 'title' => 'Funding window opened', 'desc' => 'First close is now accepting strategic investor commitments.'],
            ],
            'allocation' => [
                ['label' => 'Land acquisition', 'pct' => 11, 'value' => '$165K'],
                ['label' => 'Civil construction', 'pct' => 22, 'value' => '$330K'],
                ['label' => 'Plant & machinery', 'pct' => 31, 'value' => '$465K'],
                ['label' => 'Storage silos', 'pct' => 12, 'value' => '$180K'],
                ['label' => 'Working capital', 'pct' => 6, 'value' => '$90K'],
            ],
            'allocationTitle' => 'How the USD 1.50M target is planned',
            'whyThisProject' => [
                ['title' => 'Strong market demand', 'desc' => 'Growing feed demand across Pakistan'],
                ['title' => 'Strategic location', 'desc' => "Close to Punjab's agriculture belt"],
                ['title' => 'Multiple revenue streams', 'desc' => 'Poultry, dairy, cattle and fish feed'],
            ],
            'faqs' => [
                ['question' => 'Why invest in the OG Feed Mill Project?', 'answer' => "Pakistan's poultry, dairy, livestock and aquaculture sectors continue to expand."],
                ['question' => 'What is the minimum investment?', 'answer' => 'The minimum participation is USD 100.'],
            ],
            'footerCta' => [
                'title' => "Become a strategic investor in Pakistan's growing animal feed industry.",
                'description' => 'Review the memorandum, then speak with the OG Capital investment team.',
                'investLabel' => 'Invest now',
                'contactLabel' => 'Contact team',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function riceMillContent(): array
    {
        return [
            'layoutTitle' => 'OG Rice Mill Project',
            'layoutSubtitle' => 'Depalpur, Okara · Processing & Milling · Agriculture & Rice Export',
            'projectCode' => 'OG-RM-2026',
            'projectStatus' => 'Planning & Development',
            'hero' => [
                'eyebrow' => 'Strategic investment opportunity · 2026',
                'title' => "Invest in Pakistan's modern rice milling industry.",
                'description' => 'A high-capacity rice processing mill designed for basmati export, white rice production and value-added by-products — with transparent milestones and sustainable long-term returns.',
                'investCta' => 'Invest now',
                'downloadCta' => 'Download memorandum',
                'meetingCta' => 'Schedule meeting',
            ],
            'stats' => [
                ['label' => 'Installed capacity', 'value' => '120 T/day', 'change' => 'full paddy processing', 'color' => 'text-emerald-500'],
                ['label' => 'Current readiness', 'value' => '58 T/day', 'change' => '48% utilization', 'color' => 'text-blue-500'],
                ['label' => 'Target investment', 'value' => '$1.50M', 'change' => 'USD target', 'color' => 'text-accent'],
                ['label' => 'Projected annual revenue', 'value' => '$480.0K', 'change' => '+18.4% scenario', 'color' => 'text-emerald-500'],
            ],
            'utilizationBadge' => 'Development ready',
            'utilizationRows' => [
                ['label' => 'Overall milling output', 'value' => '58 / 120 T/day', 'pct' => 48],
                ['label' => 'Basmati rice line', 'value' => '32 / 60 T/day', 'pct' => 53],
                ['label' => 'Long-grain white rice', 'value' => '18 / 40 T/day', 'pct' => 45],
                ['label' => 'Rice bran & by-products', 'value' => '8 / 20 T/day', 'pct' => 40],
            ],
            'overviewTitle' => 'The essential terms of the OG Rice Mill Project',
            'overviewDetails' => [
                ['label' => 'Industry', 'value' => 'Agriculture & Rice Processing'],
                ['label' => 'Location', 'value' => 'Depalpur, District Okara, Punjab, Pakistan'],
                ['label' => 'Investment model', 'value' => 'Private Equity Investment'],
                ['label' => 'Target investment', 'value' => 'USD 1.50 Million'],
                ['label' => 'Minimum investment', 'value' => 'USD 100'],
            ],
            'processingStages' => [
                ['id' => 1, 'label' => 'Stage 1: Paddy reception & weighing', 'desc' => 'Incoming paddy weighed, sampled and graded at the intake point from supplier trucks.', 'capacity' => '120 T/day', 'status' => 'partial'],
                ['id' => 2, 'label' => 'Stage 2: Pre-cleaning & stone removal', 'desc' => 'Destoner and pre-cleaner remove stones, dust and foreign matter from raw paddy.', 'capacity' => '110 T/day', 'status' => 'partial'],
                ['id' => 3, 'label' => 'Stage 3: De-husking / hulling', 'desc' => 'Rubber-roll husker separates the husk to produce brown rice ready for milling.', 'capacity' => '100 T/day', 'status' => 'planned'],
                ['id' => 4, 'label' => 'Stage 4: Whitening & milling', 'desc' => 'Abrasive whitener removes bran layers to produce polished white rice.', 'capacity' => '100 T/day', 'status' => 'planned'],
                ['id' => 5, 'label' => 'Stage 5: Optical sorting & grading', 'desc' => 'CCD optical sorter removes discoloured, chalky and broken grains automatically.', 'capacity' => '100 T/day', 'status' => 'planned'],
                ['id' => 6, 'label' => 'Stage 6: Polishing, bagging & dispatch', 'desc' => '25 / 50 kg vacuum-sealed packaging for domestic and export distribution.', 'capacity' => '120 T/day', 'status' => 'planned'],
            ],
            'timelineTitle' => 'Depalpur Rice Mill — development milestones',
            'timelineSubtitle' => 'Project timeline',
            'timeline' => [
                ['year' => '2026', 'q' => 'Q3', 'label' => 'Land & infrastructure', 'desc' => 'Site due diligence and land acquisition documentation in Depalpur.', 'done' => false],
                ['year' => '2026', 'q' => 'Q4', 'label' => 'Engineering & design', 'desc' => 'Final mill layout, machinery specifications and civil drawings.', 'done' => false],
                ['year' => '2027', 'q' => 'Q1', 'label' => 'Construction', 'desc' => 'Civil works, storage structures and utility infrastructure on site.', 'done' => false],
                ['year' => '2027', 'q' => 'Q2', 'label' => 'Machinery installation', 'desc' => 'Huskers, whiteners, optical sorters and bagging lines commissioned.', 'done' => false],
                ['year' => '2027', 'q' => 'Q3', 'label' => 'Trial milling', 'desc' => 'Pilot batches processed and quality grading systems validated.', 'done' => false],
                ['year' => '2027', 'q' => 'Q4', 'label' => 'Commercial operations', 'desc' => 'First commercial rice dispatches to domestic and export buyers.', 'done' => false],
            ],
            'productionData' => [
                ['month' => 'Jan', 'output' => 32, 'revenue' => 68000, 'profit' => 9000],
                ['month' => 'Feb', 'output' => 38, 'revenue' => 82000, 'profit' => 12000],
                ['month' => 'Mar', 'output' => 44, 'revenue' => 96000, 'profit' => 15000],
                ['month' => 'Apr', 'output' => 48, 'revenue' => 108000, 'profit' => 18000],
                ['month' => 'May', 'output' => 52, 'revenue' => 120000, 'profit' => 22000],
                ['month' => 'Jun', 'output' => 55, 'revenue' => 132000, 'profit' => 28000],
                ['month' => 'Jul', 'output' => 58, 'revenue' => 145000, 'profit' => 32000],
            ],
            'operationalUpdates' => [
                ['date' => 'Jul 18, 2026', 'title' => 'Capacity study approved', 'desc' => 'Feasibility review confirmed a 100–120 T/day modular milling line.'],
                ['date' => 'Jul 10, 2026', 'title' => 'Paddy procurement network established', 'desc' => 'Agreements with paddy traders in Okara and Sahiwal districts.'],
                ['date' => 'Jul 04, 2026', 'title' => 'Funding window opened', 'desc' => 'First close is now accepting strategic investor commitments.'],
            ],
            'allocation' => [
                ['label' => 'Land acquisition', 'pct' => 10, 'value' => '$150K'],
                ['label' => 'Civil construction', 'pct' => 20, 'value' => '$300K'],
                ['label' => 'Plant & machinery', 'pct' => 33, 'value' => '$495K'],
                ['label' => 'Storage & silos', 'pct' => 13, 'value' => '$195K'],
                ['label' => 'Working capital', 'pct' => 6, 'value' => '$90K'],
            ],
            'allocationTitle' => 'How the USD 1.50M target is planned',
            'whyThisProject' => [
                ['title' => '4th largest rice exporter', 'desc' => 'Pakistan exports millions of tonnes of rice annually'],
                ['title' => 'Punjab paddy belt location', 'desc' => 'Direct access to Okara and Sahiwal paddy corridors'],
                ['title' => 'Multiple revenue streams', 'desc' => 'Basmati, white rice, broken rice and rice bran oil'],
            ],
            'faqs' => [
                ['question' => 'Why invest in the OG Rice Mill Project?', 'answer' => "Pakistan is the world's 4th largest rice exporter and Punjab's paddy belt produces abundant raw material."],
                ['question' => 'What is the minimum investment?', 'answer' => 'The minimum participation is USD 100.'],
            ],
            'footerCta' => [
                'title' => "Become a strategic investor in Pakistan's growing rice milling industry.",
                'description' => 'Review the memorandum, then speak with the OG Capital investment team.',
                'investLabel' => 'Invest now',
                'contactLabel' => 'Contact team',
            ],
        ];
    }
}
