<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Withdrawal <?php echo e($withdrawal->reference ?? $withdrawal->id); ?></title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #0F3D2E; }
    .muted { color: #6b7280; font-size: 11px; }
    .header { border-bottom: 2px solid #0F3D2E; padding-bottom: 12px; margin-bottom: 20px; }
    .brand { font-size: 14px; font-weight: bold; color: #D4A012; letter-spacing: 0.5px; }
    .grid { width: 100%; margin-bottom: 18px; }
    .grid td { vertical-align: top; padding: 8px 8px 8px 0; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
    .value { font-weight: bold; font-size: 12px; }
    .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; }
  </style>
</head>
<body>
  <?php
    $bank = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];
    $bankName = $bank['bank_name'] ?? $bank['bank'] ?? '—';
    $accountHolder = $bank['account_holder'] ?? '—';
    $iban = $bank['iban'] ?? $bank['account_number'] ?? '—';
  ?>

  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>Withdrawal Receipt</h1>
    <div class="muted">Generated <?php echo e($generatedAt); ?></div>
  </div>

  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Withdrawal ID</div>
        <div class="value"><?php echo e($withdrawal->id); ?></div>
      </td>
      <td width="50%">
        <div class="label">Reference</div>
        <div class="value"><?php echo e($withdrawal->reference ?: ('WDR-'.$withdrawal->id)); ?></div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Investor</div>
        <div class="value"><?php echo e($user->name ?? '—'); ?></div>
        <div class="muted"><?php echo e($user->email ?? ''); ?></div>
      </td>
      <td>
        <div class="label">Date</div>
        <div class="value"><?php echo e(optional($withdrawal->created_at)->format('d M Y H:i') ?? '—'); ?></div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Requested bank payout</div>
        <div class="value"><?php echo e($withdrawalBreakdown['currency'] ? $withdrawalBreakdown['currency'].' ' : ''); ?><?php echo e(number_format((float) $withdrawalBreakdown['payout_amount'], 2)); ?></div>
        <?php if($withdrawalBreakdown['currency'] !== 'USD' && $withdrawalBreakdown['payout_amount_usd'] !== null): ?>
          <div class="muted">USD <?php echo e(number_format((float) $withdrawalBreakdown['payout_amount_usd'], 2)); ?></div>
        <?php endif; ?>
      </td>
      <td>
        <div class="label">Status</div>
        <div class="value"><?php echo e(ucfirst((string) $withdrawal->status)); ?></div>
      </td>
    </tr>
    <?php echo $__env->make('pdf.partials.withdrawal-breakdown', ['withdrawalBreakdown' => $withdrawalBreakdown, 'showPayout' => false], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <tr>
      <td>
        <div class="label">Bank</div>
        <div class="value"><?php echo e($bankName); ?></div>
      </td>
      <td>
        <div class="label">Account Holder</div>
        <div class="value"><?php echo e($accountHolder); ?></div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div class="label">Account / IBAN</div>
        <div class="value"><?php echo e($iban); ?></div>
      </td>
    </tr>
    <?php if($withdrawal->note): ?>
    <tr>
      <td colspan="2">
        <div class="label">Note</div>
        <div class="value"><?php echo e($withdrawal->note); ?></div>
      </td>
    </tr>
    <?php endif; ?>
  </table>

  <div class="footer">
    OG Exports (Pvt) Ltd · Investor withdrawal receipt · This document was generated from the investor portal.
  </div>
</body>
</html>
<?php /**PATH /home/runner/workspace/laravel-backend/resources/views/pdf/withdrawal-receipt.blade.php ENDPATH**/ ?>