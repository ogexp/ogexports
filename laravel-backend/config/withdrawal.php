<?php

return [
    'fee_usd' => (float) env('WITHDRAWAL_FEE_USD', 2),
    'minimum_usd' => (float) env('WITHDRAWAL_MINIMUM_USD', 100),
    'estimated_processing_time' => '1 to 2 working days',
];
