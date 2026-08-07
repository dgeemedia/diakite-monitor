// Independent health check — deliberately does NOT depend on the monitor
// app being up. Run this from an external scheduler (GitHub Actions cron,
// a cheap secondary VM, cron-job.org hitting a webhook, etc.) so you still
// get paged if diakite-monitor.vercel.app itself goes down.
//
// Usage: pnpm check-health
// Or in CI:  npx tsx scripts/check-diakite-health.ts

const BASE_URL = process.env.DIAKITE_API_BASE_URL ?? 'https://diakite.onrender.com';

const CHECKS: { name: string; url: string }[] = [
  { name: 'health', url: `${BASE_URL}/health` },
  { name: 'api index', url: `${BASE_URL}/api` },
  { name: 'go-online deep link', url: `${BASE_URL}/go-online` },
];

async function run() {
  let anyFailed = false;

  for (const check of CHECKS) {
    const start = Date.now();
    try {
      const res = await fetch(check.url, { method: 'GET' });
      const ms = Date.now() - start;
      const ok = res.status < 500;
      console.log(`[${ok ? 'OK  ' : 'FAIL'}] ${check.name} — ${res.status} in ${ms}ms`);
      if (!ok) anyFailed = true;
    } catch (err) {
      console.log(`[FAIL] ${check.name} — ${err instanceof Error ? err.message : err}`);
      anyFailed = true;
    }
  }

  if (anyFailed) {
    // Non-zero exit so a CI cron job step shows red / triggers its own notification.
    process.exit(1);
  }
}

run();
