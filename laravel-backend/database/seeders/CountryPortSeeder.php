<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Port;
use Generator;
use Illuminate\Database\Seeder;
use RuntimeException;

class CountryPortSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->csvRows(database_path('data/country-codes.csv')) as $row) {
            Country::query()->updateOrCreate(
                ['code' => trim($row['CountryCode'])],
                ['name' => trim($row['CountryName'])],
            );
        }

        $countryIds = Country::query()->pluck('id', 'code');
        $now = now();
        $ports = [];

        foreach ($this->csvRows(database_path('data/unlocode.csv')) as $row) {
            $countryCode = trim($row['Country']);
            $locationCode = trim($row['Location']);
            $function = trim($row['Function']);
            $name = trim($row['Name']);

            if (! str_starts_with($function, '1')
                || $locationCode === ''
                || $name === ''
                || ! isset($countryIds[$countryCode])) {
                continue;
            }

            $ports[] = [
                'country_id' => $countryIds[$countryCode],
                'unlocode' => $countryCode.$locationCode,
                'name' => $name,
                'subdivision' => trim($row['Subdivision']) ?: null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($ports) >= 1000) {
                $this->upsertPorts($ports);
                $ports = [];
            }
        }

        $this->upsertPorts($ports);
    }

    /**
     * @return Generator<int, array<string, string|null>>
     */
    private function csvRows(string $path): Generator
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException("Unable to open location dataset: {$path}");
        }

        try {
            $headers = fgetcsv($handle);

            if ($headers === false) {
                return;
            }

            $headers[0] = ltrim($headers[0], "\xEF\xBB\xBF");

            while (($values = fgetcsv($handle)) !== false) {
                if (count($headers) !== count($values)) {
                    continue;
                }

                yield array_combine($headers, $values);
            }
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $ports
     */
    private function upsertPorts(array $ports): void
    {
        if ($ports === []) {
            return;
        }

        Port::query()->upsert(
            $ports,
            ['unlocode'],
            ['country_id', 'name', 'subdivision', 'updated_at'],
        );
    }
}
