<?php

namespace App\Support;

use App\Models\Deposit;
use App\Models\InvestmentProject;

class DepositReferenceGenerator
{
    /** @var array<string, string> */
    private const TYPE_PREFIXES = [
        'container' => 'CNTR',
        'ricemill' => 'RICE',
        'feed' => 'FEED',
        'plant' => 'PLNT',
        'produce' => 'PROD',
    ];

    public static function typeCode(?InvestmentProject $project): string
    {
        if (! $project) {
            return 'INV';
        }

        return self::TYPE_PREFIXES[strtolower((string) $project->type)] ?? 'PROJ';
    }

    public static function generate(Deposit $deposit): string
    {
        $project = $deposit->relationLoaded('project')
            ? $deposit->project
            : ($deposit->project_id
                ? InvestmentProject::query()->find($deposit->project_id)
                : null);

        $typeCode = self::typeCode($project);

        return sprintf('OGDEP-%s-%03d', $typeCode, (int) $deposit->id);
    }

    public static function assign(Deposit $deposit): Deposit
    {
        if (filled($deposit->reference) && str_starts_with((string) $deposit->reference, 'OGDEP-')) {
            return $deposit;
        }

        $deposit->forceFill(['reference' => self::generate($deposit)])->saveQuietly();

        return $deposit->refresh();
    }
}
