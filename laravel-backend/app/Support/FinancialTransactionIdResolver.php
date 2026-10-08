<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class FinancialTransactionIdResolver
{
    private const LEGACY_ID_OFFSET = 10_000_000;

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return TModel
     */
    public static function findOrFail(Builder $query, int $requestedId): Model
    {
        $resolvedId = self::resolveId($query, $requestedId);

        return (clone $query)
            ->whereKey($resolvedId)
            ->firstOrFail();
    }

    public static function resolveId(Builder $query, int $requestedId): int
    {
        $model = $query->getModel();

        if (
            $requestedId > 0
            && $requestedId < self::LEGACY_ID_OFFSET
            && ! $model->newQuery()->whereKey($requestedId)->exists()
        ) {
            return $requestedId + self::LEGACY_ID_OFFSET;
        }

        return $requestedId;
    }
}
