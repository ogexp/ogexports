<?php

namespace App\Console\Commands;

use App\Services\GoogleNewsIngestService;
use Illuminate\Console\Command;

class SyncGoogleNews extends Command
{
    protected $signature = 'news:sync-google {--query=* : Optional query overrides}';

    protected $description = 'Fetch trade news from Google Cloud / Gemini and store pending articles';

    public function handle(GoogleNewsIngestService $ingest): int
    {
        $queries = $this->option('query');
        $queries = is_array($queries) && count($queries) > 0 ? $queries : null;

        $this->info('Syncing Google trade news…');
        $result = $ingest->sync($queries);

        $this->line("Provider: {$result['provider']}");
        $this->line("Imported: {$result['imported']}");
        $this->line("Skipped:  {$result['skipped']}");

        foreach ($result['errors'] as $error) {
            $this->error($error);
        }

        return count($result['errors']) > 0 && $result['imported'] === 0
            ? self::FAILURE
            : self::SUCCESS;
    }
}
