<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ID_OFFSET = 10_000_000;

    private const STATE_TABLE = 'financial_transaction_id_migrations';

    private const STATE_KEY = 'financial_transaction_primary_ids_v1';

    private const TRANSACTION_TABLES = [
        'investments',
        'wallet_transactions',
        'deposits',
        'withdrawals',
        'investment_profit_distributions',
        'platform_wallet_transactions',
    ];

    private const FOREIGN_KEY_COLUMNS = [
        [
            'table' => 'investment_profit_distributions',
            'column' => 'investment_id',
            'parent' => 'investments',
            'constraint' => 'investment_profit_distributions_investment_id_foreign',
        ],
        [
            'table' => 'investment_profit_distributions',
            'column' => 'wallet_transaction_id',
            'parent' => 'wallet_transactions',
            'constraint' => 'investment_profit_distributions_wallet_transaction_id_foreign',
        ],
        [
            'table' => 'investment_payout_progress',
            'column' => 'investment_id',
            'parent' => 'investments',
            'constraint' => 'investment_payout_progress_investment_id_foreign',
        ],
    ];

    private const JSON_REFERENCE_COLUMNS = [
        ['table' => 'wallet_transactions', 'column' => 'meta'],
        ['table' => 'platform_wallet_transactions', 'column' => 'meta'],
        ['table' => 'audit_logs', 'column' => 'meta'],
        ['table' => 'notifications', 'column' => 'data'],
    ];

    private const JSON_REFERENCE_KEYS = [
        'investment_id',
        'deposit_id',
        'withdrawal_id',
        'wallet_transaction_id',
        'platform_wallet_transaction_id',
    ];

    public function up(): void
    {
        $this->assertSupportedDriver();
        $this->createStateTable();

        $storedOffset = DB::table(self::STATE_TABLE)
            ->where('migration_key', self::STATE_KEY)
            ->value('id_offset');

        if ($storedOffset === null) {
            $this->assertLegacyIdsCanBeShifted();

            $this->withForeignKeyUpdates(function (): void {
                $this->shiftForeignKeyColumns(self::ID_OFFSET);
                $this->shiftJsonReferences(self::ID_OFFSET);
                $this->shiftPrimaryIds(self::ID_OFFSET);
                $this->assertKnownForeignKeysAreValid();

                DB::table(self::STATE_TABLE)->insert([
                    'migration_key' => self::STATE_KEY,
                    'id_offset' => self::ID_OFFSET,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        } elseif ((int) $storedOffset !== self::ID_OFFSET) {
            throw new RuntimeException('The stored financial transaction ID offset is unexpected; no IDs were changed.');
        } else {
            $this->assertMigratedIdsAreEightDigits();
        }

        $this->syncSequences(true);
        $this->createRangeGuards();
    }

    public function down(): void
    {
        $this->assertSupportedDriver();

        if (! Schema::hasTable(self::STATE_TABLE)) {
            return;
        }

        $storedOffset = DB::table(self::STATE_TABLE)
            ->where('migration_key', self::STATE_KEY)
            ->value('id_offset');

        if ($storedOffset === null) {
            throw new RuntimeException('Cannot roll back financial transaction IDs because the migration state is missing.');
        }

        $offset = (int) $storedOffset;
        if ($offset !== self::ID_OFFSET) {
            throw new RuntimeException('Cannot roll back financial transaction IDs because the stored offset is unexpected.');
        }

        $this->assertMigratedIdsAreEightDigits();
        $this->dropRangeGuards();

        $this->withForeignKeyUpdates(function () use ($offset): void {
            $this->shiftForeignKeyColumns(-$offset);
            $this->shiftJsonReferences(-$offset);
            $this->shiftPrimaryIds(-$offset);
            $this->assertKnownForeignKeysAreValid();

            DB::table(self::STATE_TABLE)
                ->where('migration_key', self::STATE_KEY)
                ->delete();
        });

        $this->syncSequences(false);
        Schema::dropIfExists(self::STATE_TABLE);
    }

    private function createStateTable(): void
    {
        if (Schema::hasTable(self::STATE_TABLE)) {
            return;
        }

        Schema::create(self::STATE_TABLE, function (Blueprint $table): void {
            $table->string('migration_key', 80)->primary();
            $table->unsignedInteger('id_offset');
            $table->timestamps();
        });
    }

    private function assertSupportedDriver(): void
    {
        $driver = DB::connection()->getDriverName();

        if (! in_array($driver, ['sqlite', 'mysql', 'mariadb', 'pgsql'], true)) {
            throw new RuntimeException("Financial transaction ID migration does not support the [{$driver}] database driver.");
        }
    }

    private function assertLegacyIdsCanBeShifted(): void
    {
        foreach (self::TRANSACTION_TABLES as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException("Cannot migrate financial transaction IDs: table [{$table}] is missing.");
            }

            $minimum = DB::table($table)->min('id');
            $maximum = DB::table($table)->max('id');

            if ($maximum === null) {
                continue;
            }

            if ((int) $minimum < 1 || (int) $maximum >= self::ID_OFFSET) {
                throw new RuntimeException(
                    "Cannot safely migrate [{$table}]: its existing IDs are not all below ".self::ID_OFFSET.'. No IDs were changed.'
                );
            }
        }
    }

    private function assertMigratedIdsAreEightDigits(): void
    {
        foreach (self::TRANSACTION_TABLES as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException("Cannot verify financial transaction IDs: table [{$table}] is missing.");
            }

            $minimum = DB::table($table)->min('id');
            $maximum = DB::table($table)->max('id');

            if ($maximum === null) {
                continue;
            }

            if ((int) $minimum < self::ID_OFFSET || (int) $maximum > 99_999_999) {
                throw new RuntimeException("Cannot safely roll back: IDs in [{$table}] are outside the eight-digit range.");
            }
        }
    }

    private function withForeignKeyUpdates(callable $callback): void
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $connection->statement('SET FOREIGN_KEY_CHECKS=0');

            try {
                $connection->transaction($callback);
            } finally {
                $connection->statement('SET FOREIGN_KEY_CHECKS=1');
            }

            return;
        }

        if ($driver === 'sqlite') {
            $connection->transaction(function () use ($connection, $callback): void {
                $connection->statement('PRAGMA defer_foreign_keys = ON');
                $callback();
            });

            return;
        }

        if ($driver === 'pgsql') {
            $connection->transaction(function () use ($connection, $callback): void {
                foreach (self::FOREIGN_KEY_COLUMNS as $foreignKey) {
                    $connection->statement(
                        'ALTER TABLE '.$connection->getQueryGrammar()->wrapTable($foreignKey['table'])
                        .' ALTER CONSTRAINT '.$connection->getQueryGrammar()->wrap($foreignKey['constraint'])
                        .' DEFERRABLE INITIALLY DEFERRED'
                    );
                }

                $connection->statement('SET CONSTRAINTS ALL DEFERRED');
                $callback();
                $connection->statement('SET CONSTRAINTS ALL IMMEDIATE');

                foreach (self::FOREIGN_KEY_COLUMNS as $foreignKey) {
                    $connection->statement(
                        'ALTER TABLE '.$connection->getQueryGrammar()->wrapTable($foreignKey['table'])
                        .' ALTER CONSTRAINT '.$connection->getQueryGrammar()->wrap($foreignKey['constraint'])
                        .' NOT DEFERRABLE'
                    );
                }
            });
        }
    }

    private function shiftForeignKeyColumns(int $offset): void
    {
        foreach (self::FOREIGN_KEY_COLUMNS as $foreignKey) {
            $table = $foreignKey['table'];
            $column = $foreignKey['column'];

            $query = DB::table($table)->whereNotNull($column);
            $query = $offset > 0
                ? $query->where($column, '>', 0)
                : $query->where($column, '>=', self::ID_OFFSET);

            $operator = $offset > 0 ? '+' : '-';
            $amount = abs($offset);
            $wrappedColumn = DB::connection()->getQueryGrammar()->wrap($column);

            $query->update([
                $column => DB::raw("{$wrappedColumn} {$operator} {$amount}"),
            ]);
        }
    }

    private function shiftPrimaryIds(int $offset): void
    {
        foreach (self::TRANSACTION_TABLES as $table) {
            $query = DB::table($table);
            $query = $offset > 0
                ? $query->where('id', '>', 0)
                : $query->where('id', '>=', self::ID_OFFSET);

            $operator = $offset > 0 ? '+' : '-';
            $amount = abs($offset);
            $wrappedId = DB::connection()->getQueryGrammar()->wrap('id');

            $query->update([
                'id' => DB::raw("{$wrappedId} {$operator} {$amount}"),
            ]);
        }
    }

    private function shiftJsonReferences(int $offset): void
    {
        foreach (self::JSON_REFERENCE_COLUMNS as $jsonColumn) {
            $table = $jsonColumn['table'];
            $column = $jsonColumn['column'];

            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }

            DB::table($table)
                ->select(['id', $column])
                ->whereNotNull($column)
                ->chunkById(500, function ($rows) use ($table, $column, $offset): void {
                    foreach ($rows as $row) {
                        $decoded = is_array($row->{$column})
                            ? $row->{$column}
                            : json_decode((string) $row->{$column}, true);

                        if (! is_array($decoded)) {
                            continue;
                        }

                        $shifted = $this->shiftNestedJsonReferences($decoded, $offset);
                        if ($shifted === $decoded) {
                            continue;
                        }

                        DB::table($table)
                            ->where('id', $row->id)
                            ->update([
                                $column => json_encode(
                                    $shifted,
                                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
                                ),
                            ]);
                    }
                });
        }
    }

    private function shiftNestedJsonReferences(array $value, int $offset): array
    {
        foreach ($value as $key => $nested) {
            if (is_string($key) && in_array($key, self::JSON_REFERENCE_KEYS, true)) {
                $value[$key] = $this->shiftJsonIdValue($nested, $offset);
            } elseif (is_array($nested)) {
                $value[$key] = $this->shiftNestedJsonReferences($nested, $offset);
            }
        }

        return $value;
    }

    private function shiftJsonIdValue(mixed $value, int $offset): mixed
    {
        $wasString = is_string($value);
        if (! is_int($value) && ! ($wasString && ctype_digit($value))) {
            return $value;
        }

        $id = (int) $value;
        if ($offset > 0 && $id > 0 && $id < self::ID_OFFSET) {
            $id += $offset;
        } elseif ($offset < 0 && $id >= self::ID_OFFSET && $id <= 99_999_999) {
            $id += $offset;
        } else {
            return $value;
        }

        return $wasString ? (string) $id : $id;
    }

    private function assertKnownForeignKeysAreValid(): void
    {
        foreach (self::FOREIGN_KEY_COLUMNS as $foreignKey) {
            $childAlias = 'child_row';
            $parentAlias = 'parent_row';
            $column = $foreignKey['column'];

            $orphanCount = DB::table($foreignKey['table'].' as '.$childAlias)
                ->leftJoin(
                    $foreignKey['parent'].' as '.$parentAlias,
                    $childAlias.'.'.$column,
                    '=',
                    $parentAlias.'.id'
                )
                ->whereNotNull($childAlias.'.'.$column)
                ->whereNull($parentAlias.'.id')
                ->count();

            if ($orphanCount > 0) {
                throw new RuntimeException(
                    "Financial transaction ID migration found {$orphanCount} broken [{$foreignKey['table']}.{$column}] references."
                );
            }
        }
    }

    private function syncSequences(bool $useEightDigitRange): void
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        foreach (self::TRANSACTION_TABLES as $table) {
            $maximum = DB::table($table)->max('id');
            $lastId = $maximum === null ? 0 : (int) $maximum;

            if ($driver === 'sqlite') {
                $sequenceValue = $lastId > 0
                    ? $lastId
                    : ($useEightDigitRange ? self::ID_OFFSET - 1 : 0);
                $exists = DB::table('sqlite_sequence')->where('name', $table)->exists();

                if ($exists) {
                    DB::table('sqlite_sequence')->where('name', $table)->update(['seq' => $sequenceValue]);
                } elseif ($sequenceValue > 0) {
                    DB::table('sqlite_sequence')->insert(['name' => $table, 'seq' => $sequenceValue]);
                }

                continue;
            }

            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                $nextId = max($lastId + 1, $useEightDigitRange ? self::ID_OFFSET : 1);
                $connection->statement(
                    'ALTER TABLE '.$connection->getQueryGrammar()->wrapTable($table).' AUTO_INCREMENT = '.$nextId
                );

                continue;
            }

            $sequence = $connection->selectOne(
                "SELECT pg_get_serial_sequence(?, 'id') AS sequence_name",
                [$table]
            )?->sequence_name;

            if (! $sequence) {
                throw new RuntimeException("Could not locate the PostgreSQL ID sequence for [{$table}].");
            }

            $sequenceValue = $lastId > 0
                ? $lastId
                : ($useEightDigitRange ? self::ID_OFFSET - 1 : 1);
            $isCalled = $lastId > 0 || $useEightDigitRange;

            $connection->selectOne(
                'SELECT setval(CAST(? AS regclass), ?, ?)',
                [$sequence, $sequenceValue, $isCalled]
            );
        }
    }

    private function createRangeGuards(): void
    {
        $driver = DB::connection()->getDriverName();
        $grammar = DB::connection()->getQueryGrammar();

        if ($driver === 'pgsql') {
            $function = $grammar->wrap('og_financial_transaction_id_guard');
            DB::unprepared(
                'CREATE OR REPLACE FUNCTION '.$function.'() RETURNS trigger AS $guard$ '
                .'BEGIN IF NEW.id < '.self::ID_OFFSET.' OR NEW.id > 99999999 THEN '
                ."RAISE EXCEPTION 'Financial transaction IDs must be exactly eight digits'; "
                .'END IF; RETURN NEW; END; $guard$ LANGUAGE plpgsql'
            );
        }

        foreach (self::TRANSACTION_TABLES as $table) {
            $insertTrigger = $this->triggerName($table, 'insert');
            $updateTrigger = $this->triggerName($table, 'update');
            $wrappedTable = $grammar->wrapTable($table);

            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::unprepared('DROP TRIGGER IF EXISTS '.$grammar->wrap($insertTrigger));
                DB::unprepared('DROP TRIGGER IF EXISTS '.$grammar->wrap($updateTrigger));
                DB::unprepared(
                    'CREATE TRIGGER '.$grammar->wrap($insertTrigger)
                    .' AFTER INSERT ON '.$wrappedTable.' FOR EACH ROW BEGIN '
                    .'IF NEW.id < '.self::ID_OFFSET.' OR NEW.id > 99999999 THEN '
                    ."SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Financial transaction IDs must be exactly eight digits'; "
                    .'END IF; END'
                );
                DB::unprepared(
                    'CREATE TRIGGER '.$grammar->wrap($updateTrigger)
                    .' AFTER UPDATE ON '.$wrappedTable.' FOR EACH ROW BEGIN '
                    .'IF NEW.id < '.self::ID_OFFSET.' OR NEW.id > 99999999 THEN '
                    ."SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Financial transaction IDs must be exactly eight digits'; "
                    .'END IF; END'
                );

                continue;
            }

            if ($driver === 'sqlite') {
                DB::unprepared('DROP TRIGGER IF EXISTS '.$grammar->wrap($insertTrigger));
                DB::unprepared('DROP TRIGGER IF EXISTS '.$grammar->wrap($updateTrigger));
                DB::unprepared(
                    'CREATE TRIGGER '.$grammar->wrap($insertTrigger)
                    .' AFTER INSERT ON '.$wrappedTable
                    .' WHEN NEW.id < '.self::ID_OFFSET.' OR NEW.id > 99999999 '
                    ."BEGIN SELECT RAISE(ABORT, 'Financial transaction IDs must be exactly eight digits'); END"
                );
                DB::unprepared(
                    'CREATE TRIGGER '.$grammar->wrap($updateTrigger)
                    .' AFTER UPDATE OF id ON '.$wrappedTable
                    .' WHEN NEW.id < '.self::ID_OFFSET.' OR NEW.id > 99999999 '
                    ."BEGIN SELECT RAISE(ABORT, 'Financial transaction IDs must be exactly eight digits'); END"
                );

                continue;
            }

            DB::unprepared(
                'DROP TRIGGER IF EXISTS '.$grammar->wrap($insertTrigger).' ON '.$wrappedTable
            );
            DB::unprepared(
                'DROP TRIGGER IF EXISTS '.$grammar->wrap($updateTrigger).' ON '.$wrappedTable
            );
            DB::unprepared(
                'CREATE TRIGGER '.$grammar->wrap($insertTrigger)
                .' BEFORE INSERT ON '.$wrappedTable
                .' FOR EACH ROW EXECUTE FUNCTION '.$grammar->wrap('og_financial_transaction_id_guard').'()'
            );
            DB::unprepared(
                'CREATE TRIGGER '.$grammar->wrap($updateTrigger)
                .' BEFORE UPDATE OF id ON '.$wrappedTable
                .' FOR EACH ROW EXECUTE FUNCTION '.$grammar->wrap('og_financial_transaction_id_guard').'()'
            );
        }
    }

    private function dropRangeGuards(): void
    {
        $driver = DB::connection()->getDriverName();
        $grammar = DB::connection()->getQueryGrammar();

        foreach (self::TRANSACTION_TABLES as $table) {
            $wrappedTable = $grammar->wrapTable($table);
            foreach (['insert', 'update'] as $operation) {
                $trigger = $grammar->wrap($this->triggerName($table, $operation));

                if ($driver === 'pgsql') {
                    DB::unprepared("DROP TRIGGER IF EXISTS {$trigger} ON {$wrappedTable}");
                } else {
                    DB::unprepared("DROP TRIGGER IF EXISTS {$trigger}");
                }
            }
        }

        if ($driver === 'pgsql') {
            DB::unprepared('DROP FUNCTION IF EXISTS '.$grammar->wrap('og_financial_transaction_id_guard').'()');
        }
    }

    private function triggerName(string $table, string $operation): string
    {
        return "og_financial_id_{$table}_{$operation}_guard";
    }
};
