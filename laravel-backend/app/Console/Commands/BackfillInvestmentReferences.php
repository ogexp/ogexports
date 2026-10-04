<?php

namespace App\Console\Commands;

use App\Models\Investment;
use App\Support\InvestmentReferenceGenerator;
use Illuminate\Console\Command;

class BackfillInvestmentReferences extends Command
{
    protected $signature = 'investments:backfill-references {--dry-run : Report without writing references}';

    protected $description = 'Generate canonical unique reference numbers for investments missing one or using legacy INV-{id} format';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        Investment::query()
            ->with('project')
            ->orderBy('id')
            ->chunkById(100, function ($investments) use ($dryRun, &$updated): void {
                foreach ($investments as $investment) {
                    $current = $investment->reference;

                    if (InvestmentReferenceGenerator::isCanonicalFormat($current)) {
                        continue;
                    }

                    if (filled($current) && ! InvestmentReferenceGenerator::isLegacyFormat($current)) {
                        continue;
                    }

                    $reference = InvestmentReferenceGenerator::generate($investment);

                    if ($dryRun) {
                        $this->line("Investment {$investment->id}: ".($current ?: '(empty)')." → {$reference}");
                        $updated++;

                        continue;
                    }

                    $investment->forceFill(['reference' => $reference])->saveQuietly();
                    $updated++;
                }
            });

        $this->info($dryRun
            ? "Would assign {$updated} investment reference(s)."
            : "Assigned {$updated} investment reference(s).");

        return self::SUCCESS;
    }
}
