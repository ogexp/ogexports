<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wallet Transaction <?php echo e($transaction->reference ?? $transaction->id); ?></title>
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
  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>Wallet Transaction Receipt</h1>
    <div class="muted">Generated <?php echo e($generatedAt); ?></div>
  </div>

  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Transaction ID</div>
        <div class="value"><?php echo e($transaction->id); ?></div>
      </td>
      <td width="50%">
        <div class="label">Reference</div>
        <div class="value"><?php echo e($transaction->reference ?: ('TXN-'.$transaction->id)); ?></div>
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
        <div class="value"><?php echo e(optional($transaction->created_at)->format('d M Y H:i') ?? '—'); ?></div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Type</div>
        <div class="value"><?php echo e(ucwords(str_replace('_', ' ', (string) $transaction->type))); ?></div>
      </td>
      <td>
        <div class="label">Direction</div>
        <div class="value"><?php echo e(ucfirst((string) $transaction->direction)); ?></div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label"><?php echo e($withdrawalBreakdown ? 'Ledger amount' : 'Amount'); ?></div>
        <div class="value"><?php echo e(number_format((float) $transaction->amount, 2)); ?> <?php echo e($transaction->wallet->currency ?? ''); ?></div>
      </td>
      <td>
        <div class="label">Status</div>
        <div class="value"><?php echo e(ucfirst((string) $transaction->status)); ?></div>
      </td>
    </tr>
    <?php if($withdrawalBreakdown): ?>
      <?php echo $__env->make('pdf.partials.withdrawal-breakdown', ['withdrawalBreakdown' => $withdrawalBreakdown], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <?php endif; ?>
    <?php $meta = is_array($transaction->meta) ? $transaction->meta : []; ?>
    <?php if(!empty($meta['original_currency']) || !empty($meta['original_amount'])): ?>
    <tr>
      <td colspan="2">
        <div class="label">Original Amount</div>
        <div class="value">
          <?php echo e($meta['original_currency'] ?? ''); ?>

          <?php echo e(isset($meta['original_amount']) ? number_format((float) $meta['original_amount'], 2) : '—'); ?>

        </div>
      </td>
    </tr>
    <?php endif; ?>
    <?php if(!empty($meta['note']) || !empty($meta['remark'])): ?>
    <tr>
      <td colspan="2">
        <div class="label">Note</div>
        <div class="value"><?php echo e($meta['note'] ?? $meta['remark'] ?? ''); ?></div>
      </td>
    </tr>
    <?php endif; ?>
  </table>

  <div class="footer">
    OG Exports (Pvt) Ltd · Investor wallet transaction receipt · This document was generated from the investor portal.
  </div>
</body>
</html>
<?php /**PATH /home/runner/workspace/laravel-backend/resources/views/pdf/wallet-transaction.blade.php ENDPATH**/ ?>