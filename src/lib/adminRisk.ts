// Classifies ActivityLog `action` values by how much damage a misused or
// compromised admin account could do with them. Tune freely as your
// controller adds new logActivity() call sites.

export type RiskTier = 'critical' | 'high' | 'medium' | 'low';

// Actions that move money, create privileged accounts, or change platform-
// wide config. These get flagged + notified individually by the evaluator.
const CRITICAL_ACTIONS = new Set([
  'admin_user_created', // new privileged account — always worth a look
  'user_deleted',
  'wallet_credit',
  'wallet_debit',
  'admin_refund_issued',
  'duopay_balance_waived',
  'duopay_transaction_waived',
  'onboarding_bonus_disbursed',
  'custom_bonus_disbursed',
  'settings_batch_updated',
  'setting_updated',
  '2fa_disabled', // classic account-takeover precursor — treated as critical regardless of role
  'profile_critical_field_changed_post_approval', // approved vehicle/license swapped after the fact — safety/compliance risk
  'admin_payout_approved', // triggers a REAL, irreversible external bank transfer — had zero audit coverage before this patch
  'admin_transfer_approved', // admin moves money from one user's wallet to another's
]);

// Actions with real but bounded impact — surfaced in the Admin Activity
// view, not individually paged.
const HIGH_ACTIONS = new Set([
  'user_suspended',
  'driver_rejected',
  'partner_rejected',
  'company_suspended',
  'company_activated',
  'shield_session_closed',
  'ride_cancelled',
  'delivery_cancelled',
  'authorization_denied', // a role trying something it shouldn't
  'admin_login_failed',   // wrong password against an admin-tier account — brute-force signal
  'password_reset_completed', // could mean the account owner's email was compromised too
  'account_deleted_self', // self-service deletion — distinct from admin-initiated user_deleted
  'payout_requested', // money leaving the platform to a bank account, self-initiated
  'refund_requested_self', // self-service refund — distinct from admin-issued admin_refund_issued
  'wallet_transfer_requested_self', // self-initiated user-to-user transfer, pending admin approval
  'admin_payout_rejected', // funds returned internally — lower risk than approval, still worth visibility
  'admin_transfer_rejected',
]);

const MEDIUM_ACTIONS = new Set([
  'driver_approved',
  'partner_approved',
  'ticket_updated',
  'broadcast_notification',
  'duopay_overdue_check_manual',
  'admin_login', // routine, but worth surfacing in the per-actor breakdown
  'password_changed', // routine self-service, but worth visibility for support/ATO investigations
]);

export function classifyAction(action: string): RiskTier {
  if (CRITICAL_ACTIONS.has(action)) return 'critical';
  if (HIGH_ACTIONS.has(action)) return 'high';
  if (MEDIUM_ACTIONS.has(action)) return 'medium';
  return 'low';
}

// Pulls a monetary figure out of the `details` JSON blob when present, for
// display and for amount-based sub-thresholds (e.g. only page for refunds
// over a certain size, even though the action itself is always "critical").
export function extractAmount(details: Record<string, unknown> | null | undefined): number | null {
  if (!details) return null;
  const candidates = ['amount', 'refundAmount', 'totalDisbursed', 'bonusCredited', 'overdueAmount'];
  for (const key of candidates) {
    const val = details[key];
    if (typeof val === 'number') return val;
  }
  return null;
}

export function describeAction(action: string, details: Record<string, unknown> | null | undefined): string {
  const amount = extractAmount(details);
  const amountStr = amount != null ? ` — ₦${amount.toLocaleString('en-NG')}` : '';
  return `${action.replace(/_/g, ' ')}${amountStr}`;
}
