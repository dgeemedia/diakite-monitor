// Browser-safe. Calls THIS app's own /api/diakite/* proxy — never talks to
// diakite.onrender.com directly, and never sees the monitoring bot's JWT.

import type {
  ApiEnvelope,
  DashboardStats,
  PaymentStats,
  RevenueAnalytics,
  PerformanceAnalytics,
  ShieldStats,
  DuoPayStats,
  AppFeedbackStats,
  ActivityLogEntry,
  Company,
} from '@/types/diakite';

async function proxyGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/diakite/${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Diakite request failed (${res.status}) for ${path}: ${body}`);
  }
  const json: ApiEnvelope<T> = await res.json();
  return json.data;
}

export const diakite = {
  getDashboardStats: () => proxyGet<DashboardStats>('dashboard/stats'),
  getPaymentStats: () => proxyGet<PaymentStats>('payments/stats'),
  getRevenueAnalytics: (period: 'week' | 'month' | 'year' = 'month') =>
    proxyGet<RevenueAnalytics>(`analytics/revenue?period=${period}`),
  getPerformanceAnalytics: (period: 'week' | 'month' | 'year' = 'week') =>
    proxyGet<PerformanceAnalytics>(`analytics/performance?period=${period}`),
  getShieldStats: () => proxyGet<ShieldStats>('shield/stats'),
  getDuoPayStats: () => proxyGet<DuoPayStats>('duopay/stats'),
  getFeedbackStats: () => proxyGet<AppFeedbackStats>('feedback/stats'),
  getActivityLogs: (page = 1, limit = 50) =>
    proxyGet<{ logs: ActivityLogEntry[]; pagination: { total: number; page: number; pages: number } }>(
      `logs?page=${page}&limit=${limit}`
    ),
  getCompanies: (page = 1, limit = 15) =>
    proxyGet<{ companies: Company[]; pagination: { total: number; page: number; pages: number } }>(
      `corporate/companies?page=${page}&limit=${limit}`
    ),
};
