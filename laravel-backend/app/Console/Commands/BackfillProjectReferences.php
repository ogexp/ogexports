<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Support\ProjectReferenceGenerator;
use Illuminate\Console\Command;

class BackfillProjectReferences extends Command
{
    protected $signature = 'projects:backfill-references {--dry-run : Report without writing references}';

    protected $description = 'Generate unique reference numbers for investment projects missing one';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        InvestmentProject::query()
            ->whereNull('reference')
            ->orWhere('reference', '')
            ->orderBy('id')
            ->chunkById(100, function ($projects) use ($dryRun, &$updated): void {
                foreach ($projects as $project) {
                    $reference = ProjectReferenceGenerator::generate($project);

                    if ($dryRun) {
                        $this->line("Project {$project->id} ({$project->type}): {$reference}");
                        $updated++;

                        continue;
                    }

                    $project->forceFill(['reference' => $reference])->saveQuietly();
                    $updated++;
                }
            });

        $this->info($dryRun
            ? "Would assign {$updated} project reference(s)."
            : "Assigned {$updated} project reference(s).");

        return self::SUCCESS;
    }
}
