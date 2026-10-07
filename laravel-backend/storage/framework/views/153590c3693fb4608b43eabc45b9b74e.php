<?php
  $currency = $withdrawalBreakdown['currency'] ?? null;
  $showPayout = $showPayout ?? true;
  $formatAmount = static function ($amount, $amountUsd = null) use ($currency): string {
    if ($amount === null) {
      return $amountUsd !== null ? 'USD '.number_format((float) $amountUsd, 2) : 'Not recorded';
    }

    $formatted = ($currency ? $currency.' ' : '').number_format((float) $amount, 2);
    if ($currency !== 'USD' && $amountUsd !== null) {
      $formatted .= ' (USD '.number_format((float) $amountUsd, 2).')';
    }

    return $formatted;
  };
  $exchangeRate = $withdrawalBreakdown['exchange_rate'] ?? null;
?>
<tr>
  <td colspan="2">
    <div class="label">Withdrawal breakdown</div>
  </td>
</tr>
<tr>
  <?php if($showPayout): ?>
  <td width="50%">
    <div class="label">Requested bank payout</div>
    <div class="value"><?php echo e($formatAmount($withdrawalBreakdown['payout_amount'] ?? null, $withdrawalBreakdown['payout_amount_usd'] ?? null)); ?></div>
  </td>
  <?php endif; ?>
  <td width="<?php echo e($showPayout ? '50%' : '100%'); ?>" <?php if (! ($showPayout)): ?> colspan="2" <?php endif; ?>>
    <div class="label">Withdrawal fee</div>
    <div class="value"><?php echo e($formatAmount($withdrawalBreakdown['fee'] ?? null, $withdrawalBreakdown['fee_usd'] ?? null)); ?></div>
  </td>
</tr>
<tr>
  <td>
    <div class="label">Total wallet debit</div>
    <div class="value"><?php echo e($formatAmount($withdrawalBreakdown['total_debit'] ?? null, $withdrawalBreakdown['total_debit_usd'] ?? null)); ?></div>
  </td>
  <td>
    <div class="label">Currency</div>
    <div class="value"><?php echo e($currency ?: 'Not recorded'); ?></div>
  </td>
</tr>
<tr>
  <td colspan="2">
    <div class="label">Saved exchange rate</div>
    <div class="value">
      <?php echo e($exchangeRate !== null ? '1 USD = '.number_format((float) $exchangeRate, 8).' '.($currency ?: 'PKR') : 'Not recorded'); ?>

    </div>
  </td>
</tr>
<?php /**PATH /home/runner/workspace/laravel-backend/resources/views/pdf/partials/withdrawal-breakdown.blade.php ENDPATH**/ ?>