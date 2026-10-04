<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Quotation;
use App\Models\Shipment;
use App\Models\TradeDocument;
use App\Models\User;
use App\Support\DepositReviewStatuses;
use App\Support\NotifiesUsers;
use App\Support\OrderStatuses;
use App\Support\PortalNotificationTypes;
use Illuminate\Support\Str;

class BuyerTradeNotifier
{
    public static function orderStatusUpdated(Order $order, ?string $previousStatus = null, ?string $previousPaymentStatus = null): void
    {
        $buyer = self::buyerFromOrder($order);
        if (! $buyer) {
            return;
        }

        $orderNumber = $order->order_number ?: '#'.$order->id;
        $statusLabel = OrderStatuses::LABELS[$order->status]
            ?? ucfirst(str_replace('_', ' ', (string) $order->status));

        $parts = ["Order status is now {$statusLabel}."];
        if (
            $previousPaymentStatus !== null
            && (string) $order->payment_status !== (string) $previousPaymentStatus
            && filled($order->payment_status)
        ) {
            $parts[] = 'Payment status: '.DepositReviewStatuses::label($order->payment_status).'.';
        }
        if (filled($order->notes)) {
            $parts[] = 'Note: '.Str::limit((string) $order->notes, 120);
        }

        $href = '/buyer/orders';
        $portalUrl = self::portalUrl($href);

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::ORDER_STATUS,
            "Order update — {$orderNumber}",
            implode(' ', $parts),
            [
                'order_id' => $order->id,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'href' => $href,
            ],
            'buyer_order_status_update',
            [
                'order_number' => $orderNumber,
                'status' => $statusLabel,
                'payment_status' => DepositReviewStatuses::label($order->payment_status),
                'notes' => (string) ($order->notes ?? ''),
                'portal_url' => $portalUrl,
            ]
        );
    }

    public static function quotationReply(Quotation $quotation, string $messageBody): void
    {
        $buyer = $quotation->buyer;
        if (! $buyer) {
            $quotation->loadMissing('buyer');
            $buyer = $quotation->buyer;
        }
        if (! $buyer) {
            return;
        }

        $ref = 'QT-'.$quotation->id;
        $preview = Str::limit(strip_tags($messageBody), 200);
        $href = '/buyer/quotations';
        $portalUrl = self::portalUrl($href);

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::QUOTATION_REPLY,
            "Reply on quotation — {$ref}",
            $preview,
            [
                'quotation_id' => $quotation->id,
                'rfq_id' => $quotation->rfq_id,
                'href' => $href,
            ],
            'quotation_reply',
            [
                'quotation_ref' => $ref,
                'message_preview' => $preview,
                'portal_url' => $portalUrl,
            ]
        );
    }

    public static function shipmentCreated(Shipment $shipment): void
    {
        $buyer = self::buyerFromShipment($shipment);
        if (! $buyer) {
            return;
        }

        $label = $shipment->container ?: ($shipment->product_snapshot ?: 'Shipment #'.$shipment->id);
        $href = '/buyer/shipments';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::SHIPMENT_UPDATE,
            "Shipment created — {$label}",
            'A shipment has been created for your order. Track progress in your portal.',
            [
                'shipment_id' => $shipment->id,
                'order_id' => $shipment->order_id,
                'href' => $href,
            ],
            'buyer_shipment_update',
            [
                'container' => (string) ($shipment->container ?: $label),
                'milestone' => (string) ($shipment->current_milestone ?: 'Created'),
                'vessel' => (string) ($shipment->vessel ?: '—'),
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    public static function shipmentUpdated(Shipment $shipment, array $changes): void
    {
        if ($changes === []) {
            return;
        }

        $buyer = self::buyerFromShipment($shipment);
        if (! $buyer) {
            return;
        }

        $label = $shipment->container ?: ($shipment->product_snapshot ?: 'Shipment #'.$shipment->id);
        $parts = [];
        if (isset($changes['current_milestone'])) {
            $parts[] = 'Milestone: '.$changes['current_milestone'];
        }
        if (isset($changes['status'])) {
            $parts[] = 'Status: '.ucfirst(str_replace('_', ' ', (string) $changes['status']));
        }
        if (isset($changes['vessel'])) {
            $parts[] = 'Vessel: '.$changes['vessel'];
        }
        if (isset($changes['eta'])) {
            $parts[] = 'ETA: '.$changes['eta'];
        }
        if (isset($changes['etd'])) {
            $parts[] = 'ETD: '.$changes['etd'];
        }
        if ($parts === []) {
            $parts[] = 'Shipment details were updated.';
        }

        $href = '/buyer/shipments';
        $body = implode('. ', $parts).'.';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::SHIPMENT_UPDATE,
            "Shipment update — {$label}",
            $body,
            [
                'shipment_id' => $shipment->id,
                'order_id' => $shipment->order_id,
                'href' => $href,
            ],
            'buyer_shipment_update',
            [
                'container' => (string) ($shipment->container ?: $label),
                'milestone' => (string) ($shipment->current_milestone ?: ($changes['current_milestone'] ?? 'Updated')),
                'vessel' => (string) ($shipment->vessel ?: ($changes['vessel'] ?? '—')),
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    public static function tradeDocumentUploaded(Order $order, TradeDocument $doc): void
    {
        $buyer = self::buyerFromOrder($order);
        if (! $buyer) {
            return;
        }

        $orderNumber = $order->order_number ?: '#'.$order->id;
        $docType = $doc->title ?: $doc->type ?: 'Document';
        $href = '/buyer/documents';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::TRADE_DOCUMENT,
            "Document uploaded — {$orderNumber}",
            "{$docType} is available for order {$orderNumber}.",
            [
                'order_id' => $order->id,
                'document_id' => $doc->id,
                'href' => $href,
            ],
            'buyer_trade_document',
            [
                'order_number' => $orderNumber,
                'document_type' => $docType,
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    public static function paymentApproved(Order $order): void
    {
        $buyer = self::buyerFromOrder($order);
        if (! $buyer) {
            return;
        }

        $orderNumber = $order->order_number ?: '#'.$order->id;
        $href = '/buyer/payments';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::BUYER_PAYMENT_APPROVED,
            "Payment approved — {$orderNumber}",
            "Your payment for order {$orderNumber} has been verified.",
            ['order_id' => $order->id, 'href' => $href],
            'buyer_payment_approved',
            [
                'order_number' => $orderNumber,
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    public static function paymentRejected(Order $order): void
    {
        $buyer = self::buyerFromOrder($order);
        if (! $buyer) {
            return;
        }

        $orderNumber = $order->order_number ?: '#'.$order->id;
        $href = '/buyer/payments';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::BUYER_PAYMENT_REJECTED,
            "Payment rejected — {$orderNumber}",
            "Your payment for order {$orderNumber} was rejected. Please resubmit or contact support.",
            ['order_id' => $order->id, 'href' => $href],
            'buyer_payment_rejected',
            [
                'order_number' => $orderNumber,
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    public static function paymentCancelled(Order $order): void
    {
        $buyer = self::buyerFromOrder($order);
        if (! $buyer) {
            return;
        }

        $orderNumber = $order->order_number ?: '#'.$order->id;
        $href = '/buyer/payments';

        NotifiesUsers::notifyAndEmail(
            $buyer,
            PortalNotificationTypes::BUYER_PAYMENT_CANCELLED,
            "Payment cancelled — {$orderNumber}",
            "Your pending payment for order {$orderNumber} has been cancelled.",
            ['order_id' => $order->id, 'href' => $href],
            'buyer_payment_cancelled',
            [
                'order_number' => $orderNumber,
                'portal_url' => self::portalUrl($href),
            ]
        );
    }

    public static function supportReply(User $user, string $ticketNumber, int $ticketId, string $messageBody): void
    {
        $isBuyer = $user->hasRole('buyer');
        $href = $isBuyer ? '/buyer/messages' : '/invest/messages';
        $preview = Str::limit(strip_tags($messageBody), 200);

        // Buyers get email on every admin reply; investors get in-app only for replies.
        if ($isBuyer) {
            NotifiesUsers::notifyAndEmail(
                $user,
                PortalNotificationTypes::SUPPORT_TICKET,
                "Reply on ticket {$ticketNumber}",
                $preview,
                ['ticket_id' => $ticketId, 'ticket_number' => $ticketNumber, 'href' => $href],
                'support_ticket_update',
                [
                    'ticket_number' => $ticketNumber,
                    'status' => 'Answered',
                    'message_preview' => $preview,
                    'portal_url' => self::portalUrl($href),
                ]
            );

            return;
        }

        NotifiesUsers::notify(
            $user,
            PortalNotificationTypes::SUPPORT_TICKET,
            "Reply on ticket {$ticketNumber}",
            $preview,
            ['ticket_id' => $ticketId, 'ticket_number' => $ticketNumber, 'href' => $href]
        );
    }

    public static function supportStatusChanged(User $user, string $ticketNumber, int $ticketId, string $status): void
    {
        $isBuyer = $user->hasRole('buyer');
        $href = $isBuyer ? '/buyer/messages' : '/invest/messages';
        $statusLabel = ucfirst(str_replace('_', ' ', $status));
        $title = "Ticket {$ticketNumber} — {$statusLabel}";
        $body = "Your support ticket status is now {$statusLabel}.";
        $isMajor = in_array(strtolower($status), ['resolved', 'closed'], true);

        // Email for buyers always; for investors only on resolved/closed (major events).
        if ($isBuyer || $isMajor) {
            NotifiesUsers::notifyAndEmail(
                $user,
                PortalNotificationTypes::SUPPORT_TICKET,
                $title,
                $body,
                ['ticket_id' => $ticketId, 'ticket_number' => $ticketNumber, 'status' => $status, 'href' => $href],
                'support_ticket_update',
                [
                    'ticket_number' => $ticketNumber,
                    'status' => $statusLabel,
                    'message_preview' => $body,
                    'portal_url' => self::portalUrl($href),
                ]
            );

            return;
        }

        NotifiesUsers::notify(
            $user,
            PortalNotificationTypes::SUPPORT_TICKET,
            $title,
            $body,
            ['ticket_id' => $ticketId, 'ticket_number' => $ticketNumber, 'status' => $status, 'href' => $href]
        );
    }

    private static function buyerFromOrder(Order $order): ?User
    {
        $order->loadMissing('buyer');

        return $order->buyer;
    }

    private static function buyerFromShipment(Shipment $shipment): ?User
    {
        $shipment->loadMissing('buyer');

        return $shipment->buyer;
    }

    private static function portalUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/').$path;
    }
}
