<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactFormAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactMessage $contactMessage) {}

    public function envelope(): Envelope
    {
        $subject = $this->emailSubject();

        return new Envelope(
            subject: $subject,
            replyTo: [
                new Address($this->contactMessage->email, $this->contactMessage->name),
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: nl2br(e($this->buildBody())),
        );
    }

    private function emailSubject(): string
    {
        if ($this->contactMessage->type === 'public_quote') {
            $product = $this->contactMessage->meta['product_name'] ?? null;

            return $product
                ? "Quotation Request: {$product}"
                : ($this->contactMessage->subject ?: 'Quotation Request');
        }

        return $this->contactMessage->subject ?: 'Website Contact Inquiry';
    }

    private function buildBody(): string
    {
        $message = $this->contactMessage;
        $lines = [
            'New submission from the OG Exports website.',
            '',
            'Name: '.$message->name,
            'Email: '.$message->email,
        ];

        if (filled($message->phone)) {
            $lines[] = 'Phone: '.$message->phone;
        }

        if (filled($message->subject)) {
            $lines[] = 'Subject: '.$message->subject;
        }

        $meta = is_array($message->meta) ? $message->meta : [];

        $metaLabels = [
            'product_name' => 'Product',
            'company' => 'Company',
            'country' => 'Destination Country',
            'quantity' => 'Quantity',
            'delivery_term' => 'Delivery Term',
            'inquiry_type' => 'Inquiry Type',
            'source' => 'Source',
        ];

        foreach ($metaLabels as $key => $label) {
            if (! empty($meta[$key])) {
                $lines[] = $label.': '.$meta[$key];
            }
        }

        $lines[] = '';
        $lines[] = 'Message:';
        $lines[] = $message->message;

        return implode("\n", $lines);
    }
}
