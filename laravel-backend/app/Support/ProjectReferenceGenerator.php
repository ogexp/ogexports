<?php

namespace App\Support;

use App\Models\InvestmentProject;
use Illuminate\Support\Str;

class ProjectReferenceGenerator
{
    /** @var array<string, string> */
    private const PREFIXES = [
        'container' => 'CNTR',
        'ricemill' => 'RICE',
        'feed' => 'FEED',
        'plant' => 'PLNT',
        'produce' => 'PROD',
    ];

    public static function generate(InvestmentProject $project): string
    {
        $prefix = self::PREFIXES[strtolower((string) $project->type)] ?? 'PROJ';
        $id = (int) $project->id;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $suffix = strtoupper(Str::random(8));
            $reference = "{$prefix}-{$id}-{$suffix}";

            if (! InvestmentProject::query()->where('reference', $reference)->exists()) {
                return $reference;
            }
        }

        return "{$prefix}-{$id}-".strtoupper(Str::random(12));
    }

    public static function assign(InvestmentProject $project): InvestmentProject
    {
        if (filled($project->reference)) {
            return $project;
        }

        $project->forceFill(['reference' => self::generate($project)])->saveQuietly();

        return $project->refresh();
    }
}
