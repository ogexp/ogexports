<?php

namespace App\Services;

use App\Models\Order;
use Dompdf\Dompdf;
use Dompdf\Options;

class OrderPdfGenerator
{
    public function download(Order $order): \Symfony\Component\HttpFoundation\Response
    {
        $order->loadMissing(['buyer:id,name,email', 'items', 'quotation', 'country', 'port']);

        $html = view('pdf.order', [
            'order' => $order,
            'generatedAt' => now()->format('d M Y H:i'),
        ])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'Order-'.preg_replace('/[^A-Za-z0-9_\-]/', '_', (string) ($order->order_number ?: $order->id)).'.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
