<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'slug' => 'kyc_approved',
                'subject' => '{{app_name}} — KYC Verification Approved',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your identity verification (KYC) has been <strong>approved</strong>. You now have full access to investment and wallet features on {{app_name}}.</p><p>Log in to your portal to continue: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour identity verification (KYC) has been approved. You now have full access to investment and wallet features on {{app_name}}.\n\nPortal: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'app_name', 'portal_url'],
            ],
            [
                'slug' => 'kyc_rejected',
                'subject' => '{{app_name}} — KYC Verification Update',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your KYC submission requires attention. Status: <strong>Rejected</strong>.</p><p>{{notes}}</p><p>Please log in and resubmit the required documents: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour KYC submission was rejected.\n\n{{notes}}\n\nPlease log in and resubmit: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'app_name', 'portal_url', 'notes'],
            ],
            [
                'slug' => 'deposit_approved',
                'subject' => '{{app_name}} — Deposit Approved ({{amount}} {{currency}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your deposit of <strong>{{currency}} {{amount}}</strong> has been verified and credited to your wallet.</p><p>Reference: {{reference}}</p><p>View your wallet: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour deposit of {{currency}} {{amount}} has been approved.\nReference: {{reference}}\n\nWallet: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'reference', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'deposit_rejected',
                'subject' => '{{app_name}} — Deposit Not Approved',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your deposit of <strong>{{currency}} {{amount}}</strong> could not be approved at this time.</p><p>Reference: {{reference}}</p><p>{{notes}}</p><p>Contact support or submit a new deposit from your portal. <a href="{{portal_url}}">View this deposit</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour deposit of {{currency}} {{amount}} was not approved.\nReference: {{reference}}\n\n{{notes}}\n\nView this deposit: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'reference', 'notes', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'deposit_cancelled',
                'subject' => '{{app_name}} — Deposit Cancelled',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your pending deposit (Reference: {{reference}}) has been cancelled.</p><p>{{notes}}</p><p><a href="{{portal_url}}">View this deposit</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour deposit {{reference}} has been cancelled.\n\n{{notes}}\n\nView this deposit: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'reference', 'notes', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'withdraw_submitted',
                'subject' => '{{app_name}} — Withdrawal Request Received ({{withdraw_id}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>We received your withdrawal request.</p><ul><li><strong>Withdraw ID:</strong> {{withdraw_id}}</li><li><strong>Amount:</strong> {{currency}} {{amount}}</li><li><strong>Status:</strong> Pending review</li></ul><p>Track progress in your portal: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nWithdrawal request received.\nWithdraw ID: {{withdraw_id}}\nAmount: {{currency}} {{amount}}\nStatus: Pending\n\nTrack: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'withdraw_id', 'amount', 'currency', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'withdraw_approved',
                'subject' => '{{app_name}} — Withdrawal Approved ({{withdraw_id}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your withdrawal request <strong>{{withdraw_id}}</strong> for <strong>{{currency}} {{amount}}</strong> has been approved. Approval does not confirm that funds have reached your bank account. <a href="{{portal_url}}">View the current server status</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nWithdrawal request {{withdraw_id}} for {{currency}} {{amount}} has been approved. This does not confirm that funds have reached your bank account.\n\nView the current server status: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'withdraw_id', 'amount', 'currency', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'withdraw_rejected',
                'subject' => '{{app_name}} — Withdrawal Not Approved ({{withdraw_id}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your withdrawal <strong>{{withdraw_id}}</strong> for {{currency}} {{amount}} could not be approved.</p><p>{{notes}}</p><p>Check your wallet balance and transaction history for the current available funds. <a href="{{portal_url}}">View this withdrawal</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nWithdrawal {{withdraw_id}} was rejected.\nAmount: {{currency}} {{amount}}\n\n{{notes}}\n\nCheck your wallet balance and transaction history for the current available funds.\nView this withdrawal: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'withdraw_id', 'amount', 'currency', 'notes', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'withdraw_otp',
                'subject' => '{{app_name}} — Withdrawal Verification Code',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your withdrawal verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{otp_code}}</p><p>This code expires in {{expires_minutes}} minutes. Do not share it with anyone.</p><p>If you did not request a withdrawal, contact support immediately.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour withdrawal verification code is: {{otp_code}}\n\nExpires in {{expires_minutes}} minutes.\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'otp_code', 'expires_minutes', 'app_name'],
            ],
            [
                'slug' => 'registration_otp',
                'subject' => '{{app_name}} — Verify Your Email',
                'body_html' => '<p>Dear {{user_name}},</p><p>Welcome to {{app_name}}! Your email verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{otp_code}}</p><p>This code expires in {{expires_minutes}} minutes. Do not share it with anyone.</p><p>If you did not create an account, you can ignore this email.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nWelcome to {{app_name}}! Your email verification code is: {{otp_code}}\n\nExpires in {{expires_minutes}} minutes.\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'otp_code', 'expires_minutes', 'app_name'],
            ],
            [
                'slug' => 'password_reset_otp',
                'subject' => '{{app_name}} — Password Reset Code',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{otp_code}}</p><p>This code expires in {{expires_minutes}} minutes. Do not share it with anyone.</p><p>If you did not request a password reset, contact support immediately.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nYour password reset code is: {{otp_code}}\n\nExpires in {{expires_minutes}} minutes.\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'otp_code', 'expires_minutes', 'app_name'],
            ],
            [
                'slug' => 'container_status_update',
                'subject' => '{{app_name}} — Container Update: {{container_name}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>There is an update on export container <strong>{{container_name}}</strong> in which you have invested.</p><ul><li><strong>Status:</strong> {{status}}</li><li><strong>Stage:</strong> {{stage}}</li><li><strong>Details:</strong> {{details}}</li></ul><p>View details: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nContainer update: {{container_name}}\nStatus: {{status}}\nStage: {{stage}}\nDetails: {{details}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'container_name', 'status', 'stage', 'details', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_submitted',
                'subject' => '{{app_name}} — Investment Submitted ({{reference}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your investment of <strong>{{currency}} {{amount}}</strong> in <strong>{{project_name}}</strong> has been submitted and is pending admin approval.</p><p>Reference: {{reference}}</p><p>View your investments: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nInvestment submitted: {{currency}} {{amount}} in {{project_name}}\nReference: {{reference}}\nStatus: Pending approval\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'project_name', 'reference', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_approved',
                'subject' => '{{app_name}} — Investment Approved ({{reference}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your investment of <strong>{{currency}} {{amount}}</strong> in <strong>{{project_name}}</strong> has been approved.</p><p>Reference: {{reference}}</p><p>View your portfolio: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nInvestment approved: {{currency}} {{amount}} in {{project_name}}\nReference: {{reference}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'project_name', 'reference', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_rejected',
                'subject' => '{{app_name}} — Investment Not Approved ({{reference}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your investment of {{currency}} {{amount}} in <strong>{{project_name}}</strong> was not approved. Its server status is cancelled.</p><p>Reference: {{reference}}</p><p>{{notes}}</p><p>Check your wallet balance and transaction history for the current available funds. <a href="{{portal_url}}">View this investment</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nInvestment {{reference}} was not approved. Its server status is cancelled.\nProject: {{project_name}}\nAmount: {{currency}} {{amount}}\n\n{{notes}}\n\nCheck your wallet balance and transaction history for the current available funds.\nView this investment: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'project_name', 'reference', 'notes', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_confirmed',
                'subject' => '{{app_name}} — Investment Confirmed ({{reference}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your investment of <strong>{{currency}} {{amount}}</strong> in <strong>{{project_name}}</strong> has been confirmed. The amount was deducted from your wallet.</p><p>Reference: {{reference}}</p><p>View your portfolio: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nInvestment confirmed: {{currency}} {{amount}} in {{project_name}}\nReference: {{reference}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'amount', 'currency', 'project_name', 'reference', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_completed',
                'subject' => '{{app_name}} — Investment Completed ({{reference}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your investment in <strong>{{project_name}}</strong> has completed.</p><ul><li><strong>Invested:</strong> {{invested_amount}}</li><li><strong>Profit:</strong> {{profit_amount}}</li><li><strong>Total return:</strong> {{total_return}}</li></ul><p>Principal and profit have been credited to your wallet.</p><p>Reference: {{reference}}</p><p><a href="{{portal_url}}">View this investment</a>.</p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nInvestment completed: {{project_name}}\nReference: {{reference}}\nInvested: {{invested_amount}}\nProfit: {{profit_amount}}\nTotal return: {{total_return}}\n\nPrincipal and profit have been credited to your wallet.\nView this investment: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'reference', 'invested_amount', 'profit_amount', 'total_return', 'project_name', 'project_type', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'investment_payout_progress',
                'subject' => '{{app_name}} — Payout update for {{reference}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>The payout status for your investment <strong>{{reference}}</strong> in <strong>{{project_name}}</strong> is now <strong>{{status}}</strong>.</p><p>Planned date: {{planned_date}}</p><p>A planned date is not proof of payment. This notice does not confirm that your payout has been completed.</p><p>View investment details: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nThe payout status for your investment {{reference}} in {{project_name}} is now {{status}}.\nPlanned date: {{planned_date}}\n\nA planned date is not proof of payment. This notice does not confirm that your payout has been completed.\n\nView investment details: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'reference', 'project_name', 'status', 'planned_date', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'project_status_update',
                'subject' => '{{app_name}} — Project Update: {{project_name}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>There is an update on investment project <strong>{{project_name}}</strong> in which you have invested.</p><ul><li><strong>Status:</strong> {{status}}</li><li><strong>Stage:</strong> {{stage}}</li><li><strong>Details:</strong> {{details}}</li></ul><p>View details: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nProject update: {{project_name}}\nStatus: {{status}}\nStage: {{stage}}\nDetails: {{details}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'project_name', 'container_name', 'status', 'stage', 'details', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'quotation_sent',
                'subject' => '{{app_name}} — Quotation {{quotation_ref}} ({{status}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your quotation <strong>{{quotation_ref}}</strong> has been {{status}}.</p><ul><li><strong>Product:</strong> {{product_name}}</li><li><strong>Quantity:</strong> {{qty}}</li><li><strong>Incoterm:</strong> {{incoterm}}</li><li><strong>Estimated total:</strong> ${{total}}</li></ul><p>Review and respond in your portal: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nQuotation {{quotation_ref}} has been {{status}}.\nProduct: {{product_name}}\nQuantity: {{qty}}\nIncoterm: {{incoterm}}\nEstimated total: \${{total}}\n\nReview: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'quotation_ref', 'product_name', 'qty', 'incoterm', 'total', 'status', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'quotation_reply',
                'subject' => '{{app_name}} — Reply on Quotation {{quotation_ref}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>There is a new reply on your quotation <strong>{{quotation_ref}}</strong>.</p><blockquote>{{message_preview}}</blockquote><p>View and respond: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nNew reply on quotation {{quotation_ref}}:\n{{message_preview}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'quotation_ref', 'message_preview', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_order_status_update',
                'subject' => '{{app_name}} — Order {{order_number}} Update',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your order <strong>{{order_number}}</strong> has been updated.</p><ul><li><strong>Status:</strong> {{status}}</li><li><strong>Payment status:</strong> {{payment_status}}</li></ul><p>{{notes}}</p><p>View your orders: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nOrder {{order_number}} updated.\nStatus: {{status}}\nPayment status: {{payment_status}}\n{{notes}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'order_number', 'status', 'payment_status', 'notes', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_shipment_update',
                'subject' => '{{app_name}} — Shipment Update ({{container}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>There is an update on your shipment.</p><ul><li><strong>Container:</strong> {{container}}</li><li><strong>Milestone:</strong> {{milestone}}</li><li><strong>Vessel:</strong> {{vessel}}</li></ul><p>Track shipment: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nShipment update\nContainer: {{container}}\nMilestone: {{milestone}}\nVessel: {{vessel}}\n\nTrack: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'container', 'milestone', 'vessel', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_trade_document',
                'subject' => '{{app_name}} — Trade Document for Order {{order_number}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>A new trade document (<strong>{{document_type}}</strong>) has been uploaded for order <strong>{{order_number}}</strong>.</p><p>View documents: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nDocument {{document_type}} uploaded for order {{order_number}}.\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'order_number', 'document_type', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_payment_approved',
                'subject' => '{{app_name}} — Payment Approved ({{order_number}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your payment for order <strong>{{order_number}}</strong> has been verified and approved.</p><p>View payments: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nPayment approved for order {{order_number}}.\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'order_number', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_payment_rejected',
                'subject' => '{{app_name}} — Payment Not Approved ({{order_number}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your payment for order <strong>{{order_number}}</strong> was not approved. Please resubmit or contact support.</p><p>View payments: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nPayment rejected for order {{order_number}}. Please resubmit or contact support.\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'order_number', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'buyer_payment_cancelled',
                'subject' => '{{app_name}} — Payment Cancelled ({{order_number}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>Your pending payment for order <strong>{{order_number}}</strong> has been cancelled.</p><p>View payments: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nPayment cancelled for order {{order_number}}.\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'order_number', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'support_ticket_update',
                'subject' => '{{app_name}} — Support Ticket {{ticket_number}} ({{status}})',
                'body_html' => '<p>Dear {{user_name}},</p><p>There is an update on support ticket <strong>{{ticket_number}}</strong>.</p><p><strong>Status:</strong> {{status}}</p><p>{{message_preview}}</p><p>View ticket: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\nSupport ticket {{ticket_number}} update.\nStatus: {{status}}\n{{message_preview}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'ticket_number', 'status', 'message_preview', 'portal_url', 'app_name'],
            ],
            [
                'slug' => 'portal_announcement',
                'subject' => '{{app_name}} — {{title}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>{{body}}</p><p>View in portal: <a href="{{portal_url}}">{{portal_url}}</a></p><p>Thank you,<br>{{app_name}} Team</p>',
                'body_text' => "Dear {{user_name}},\n\n{{title}}\n\n{{body}}\n\nView: {{portal_url}}\n\nThank you,\n{{app_name}} Team",
                'placeholders' => ['user_name', 'title', 'body', 'portal_url', 'app_name'],
            ],
        ];

        foreach ($templates as $template) {
            EmailTemplate::query()->updateOrCreate(
                ['slug' => $template['slug']],
                $template
            );
        }
    }
}
