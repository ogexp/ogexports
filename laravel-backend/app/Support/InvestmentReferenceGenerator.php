<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProject;
use Illuminate\Support\Str;

class InvestmentReferenceGenerator
{
    /** @var array<string, string> */
    private const PREFIXES = [
        'ricemill' => 'OGRICE',
        'feed' => 'OGFEED',
        'plant' => 'OGPLNT',
        'produce' => 'OGPROD',
    ];

    public static function isLegacyFormat(?string $reference): bool
    {
        if ($reference === null || $reference === '') {
            return true;
        }

        // Old simple INV-{id}
        if (preg_match('/^INV-\d+$/i', $reference)) {
            return true;
        }

        // Previous INV-CTRN-{id}-{suffix} style
        if (preg_match('/^INV-[A-Z]+-\d+-[A-Z0-9]+$/i', $reference)) {
            return true;
        }

        return false;
    }

    public static function isCanonicalFormat(?string $reference): bool
    {
        if ($reference === null || $reference === '') {
            return false;
        }

        return (bool) preg_match('/^OG[A-Z]+-\d+[A-Z0-9]{8,}$/i', $reference);
    }

    public static function prefixForType(?string $type, ?InvestmentProject $project = null): string
    {
        $normalized = strtolower((string) $type);

        if ($normalized === 'container') {
            return self::prefixForContainer($project);
        }

        return self::PREFIXES[$normalized] ?? 'OGPROJ';
    }

    public static function prefixForProject(?InvestmentProject $project): string
    {
        return self::prefixForType($project?->type, $project);
    }

    private static function prefixForContainer(?InvestmentProject $project): string
    {
        $direction = strtolower((string) ($project?->trade_direction ?: 'export'));

        return $direction === 'import' ? 'OGIMP' : 'OGEXP';
    }

    public static function generate(Investment $investment): string
    {
        $project = $investment->relationLoaded('project')
            ? $investment->project
            : InvestmentProject::query()->find($investment->project_id);

        $prefix = self::prefixForProject($project);
        $id = (int) $investment->id;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $suffix = strtoupper(Str::random(8));
            $reference = "{$prefix}-{$id}{$suffix}";

            if (! Investment::query()->where('reference', $reference)->exists()) {
                return $reference;
            }
        }

        return "{$prefix}-{$id}".strtoupper(Str::random(12));
    }

    public static function assign(Investment $investment, bool $force = false): Investment
    {
        if (! $force && self::isCanonicalFormat($investment->reference)) {
            return $investment;
        }

        if (! $force && filled($investment->reference) && ! self::isLegacyFormat($investment->reference)) {
            return $investment;
        }

        $investment->forceFill(['reference' => self::generate($investment)])->saveQuietly();

        return $investment->refresh();
    }

    public static function display(Investment $investment): string
    {
        if (filled($investment->reference) && ! self::isLegacyFormat($investment->reference)) {
            return (string) $investment->reference;
        }

        if (filled($investment->reference)) {
            return (string) $investment->reference;
        }

        $project = $investment->relationLoaded('project')
            ? $investment->project
            : InvestmentProject::query()->find($investment->project_id);

        return self::prefixForProject($project).'-'.$investment->id;
    }
}
