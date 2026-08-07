// Call this on a schedule (Vercel Cron, e.g. every 5 minutes) to check
// current Diakite state against thresholds, persist alert state, and fire
// a debounced notification when a condition newly triggers or newly clears.
//
// vercel.json:
// { "crons": [{ "path": "/api/alerts/evaluate", "schedule": "*/5 * * * *" }] }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDiakiteToken, getDiakiteBaseUrl } from '@/lib/diakiteAuth';
import { sendAlertEmail, sendAlertSms } from '@/lib/notify';
import { THRESHOLDS } from '@/lib/thresholds';
import { classifyAction, extractAmount, describeAction } from '@/lib/adminRisk';
import type {
  ApiEnvelope,
  PaymentStats,
  DuoPayStats,
  ShieldStats,
  DashboardStats,
  ActivityLogEntry,
} from '@/types/diakite';

const NOTIFY_DEBOUNCE_MS = 30 * 60 * 1000; // don't re-notify the same alert more than every 30 min

async function fetchAdmin<T>(path: string): Promise<T> {
  const token = await getDiakiteToken();
  const res = await fetch(`${getDiakiteBaseUrl()}/api/admin/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  const json: ApiEnvelope<T> = await res.json();
  return json.data;
}

interface Check {
  key: string;
  triggered: boolean;
  severity: 'warning' | 'critical';
  message: string;
}

async function applyCheck(check: Check) {
  const existing = await prisma.alertState.findUnique({ where: { alertKey: check.key } });
  const wasActive = existing?.isActive ?? false;
  const now = new Date();

  const shouldNotify =
    check.triggered &&
    (!wasActive || !existing?.lastNotifiedAt || now.getTime() - existing.lastNotifiedAt.getTime() > NOTIFY_DEBOUNCE_MS);

  await prisma.alertState.upsert({
    where: { alertKey: check.key },
    update: {
      isActive: check.triggered,
      severity: check.severity,
      message: check.message,
      ...(check.triggered && !wasActive ? { lastTriggeredAt: now } : {}),
      ...(!check.triggered && wasActive ? { lastResolvedAt: now } : {}),
      ...(shouldNotify ? { lastNotifiedAt: now } : {}),
    },
    create: {
      alertKey: check.key,
      isActive: check.triggered,
      severity: check.severity,
      message: check.message,
      lastTriggeredAt: check.triggered ? now : null,
    },
  });

  if (shouldNotify) {
    await Promise.all([
      sendAlertEmail(`${check.severity.toUpperCase()}: ${check.key}`, check.message),
      check.severity === 'critical' ? sendAlertSms(check.message) : Promise.resolve(),
    ]);
  }

  // newly resolved — send a clear-notice once
  if (!check.triggered && wasActive) {
    await sendAlertEmail(`RESOLVED: ${check.key}`, `${check.key} is back to normal.`);
  }
}

export async function GET(req: NextRequest) {
  // This route bypasses the normal session middleware (Vercel Cron sends no
  // cookie), so it needs its own gate. Vercel automatically sends
  // `Authorization: Bearer $CRON_SECRET` on scheduled invocations when
  // CRON_SECRET is set as an env var — reject anything else.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const [payments, duopay, shield, dashboard] = await Promise.all([
      fetchAdmin<PaymentStats>('payments/stats'),
      fetchAdmin<DuoPayStats>('duopay/stats'),
      fetchAdmin<ShieldStats>('shield/stats'),
      fetchAdmin<DashboardStats>('dashboard/stats'),
    ]);

    const checks: Check[] = [
      {
        key: 'payments_pending_backlog',
        triggered: payments.pendingCount > THRESHOLDS.paymentsPendingCrit,
        severity: payments.pendingCount > THRESHOLDS.paymentsPendingCrit ? 'critical' : 'warning',
        message: `${payments.pendingCount} payments stuck in PENDING (threshold ${THRESHOLDS.paymentsPendingCrit}).`,
      },
      {
        key: 'duopay_overdue_exposure',
        triggered: duopay.totalOverdue > THRESHOLDS.duopayOverdueCritNGN,
        severity: 'critical',
        message: `₦${duopay.totalOverdue.toLocaleString('en-NG')} overdue across DuoPay accounts.`,
      },
      {
        key: 'shield_active_session',
        triggered: shield.activeSessions >= THRESHOLDS.shieldActiveSessionsWarn,
        severity: 'warning',
        message: `${shield.activeSessions} active SHIELD session(s) — safety feature in use, monitor closely.`,
      },
      {
        key: 'support_ticket_backlog',
        triggered: dashboard.support.openTickets > THRESHOLDS.openTicketsCrit,
        severity: 'critical',
        message: `${dashboard.support.openTickets} open support tickets (threshold ${THRESHOLDS.openTicketsCrit}).`,
      },
    ];

    await Promise.all(checks.map(applyCheck));

    // ── Admin activity scan ──────────────────────────────────────────────
    // Pull the most recent ActivityLog entries and flag any critical/high
    // risk admin action we haven't already notified on (dedup keyed by the
    // source log id, so re-running every 5 min never double-pages).
    const recentLogs = await fetchAdmin<{ logs: ActivityLogEntry[] }>('logs?page=1&limit=50');
    let flagged = 0;

    for (const entry of recentLogs.logs) {
      const tier = classifyAction(entry.action);
      if (tier !== 'critical' && tier !== 'high') continue;

      const already = await prisma.flaggedActivity.findUnique({ where: { diakiteLogId: entry.id } });
      if (already) continue;

      const amount = extractAmount(entry.details);
      const actorName = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : null;
      const message = `${actorName ?? entry.userId ?? 'unknown actor'} — ${describeAction(entry.action, entry.details)}`;

      await prisma.flaggedActivity.create({
        data: {
          diakiteLogId: entry.id,
          action: entry.action,
          severity: tier,
          actorEmail: entry.user?.email ?? null,
          actorName,
          message,
          amount,
          occurredAt: new Date(entry.createdAt),
        },
      });
      flagged++;

      // Only page for critical-tier actions, or high-tier ones involving
      // real money. "high" actions like suspensions/rejections show up in
      // the Admin Activity view but don't need a 2am SMS.
      const worthNotifying = tier === 'critical' || (amount != null && amount > 0);
      if (worthNotifying) {
        await Promise.all([
          sendAlertEmail(`Admin action: ${entry.action}`, message),
          tier === 'critical' ? sendAlertSms(message) : Promise.resolve(),
        ]);
      }
    }

    // ── Brute-force detection ────────────────────────────────────────────
    // 3+ failed admin logins for the same actor within this batch of recent
    // logs is worth an immediate page, distinct from the individual
    // admin_login_failed entries above (which are only "high", not paged
    // on their own — the pattern is the signal, not any single failure).
    const failedByActor = new Map<string, ActivityLogEntry[]>();
    for (const entry of recentLogs.logs) {
      if (entry.action !== 'admin_login_failed' || !entry.userId) continue;
      const list = failedByActor.get(entry.userId) ?? [];
      list.push(entry);
      failedByActor.set(entry.userId, list);
    }

    for (const [actorId, failures] of failedByActor) {
      if (failures.length < THRESHOLDS.adminLoginFailuresForBruteForce) continue;

      // Dedupe key buckets by hour so a sustained attack re-notifies
      // roughly hourly instead of once ever, but not on every 5-min run.
      const hourBucket = new Date().toISOString().slice(0, 13);
      const dedupeKey = `bruteforce-${actorId}-${hourBucket}`;

      const already = await prisma.flaggedActivity.findUnique({ where: { diakiteLogId: dedupeKey } });
      if (already) continue;

      const actorName = failures[0].user ? `${failures[0].user.firstName} ${failures[0].user.lastName}` : actorId;
      const message = `${failures.length} failed login attempts for ${actorName} in the last ~50 logged events — possible brute-force or locked-out admin.`;

      await prisma.flaggedActivity.create({
        data: {
          diakiteLogId: dedupeKey,
          action: 'admin_login_bruteforce_suspected',
          severity: 'critical',
          actorEmail: failures[0].user?.email ?? null,
          actorName,
          message,
          amount: null,
          occurredAt: new Date(),
        },
      });
      flagged++;

      await Promise.all([sendAlertEmail('Possible admin brute-force', message), sendAlertSms(message)]);
    }

    return NextResponse.json({ success: true, checked: checks.length, flaggedActivity: flagged });
  } catch (err) {
    console.error('[alerts/evaluate] failed:', err);
    return NextResponse.json({ success: false, message: String(err) }, { status: 500 });
  }
}
