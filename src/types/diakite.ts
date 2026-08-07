// Shapes mirrored directly from backend/src/controllers/admin.controller.js
// Keep these in sync if the controller's response shape changes.

export interface DashboardStats {
  users: { total: number; drivers: number; partners: number; newToday: number };
  rides: { total: number; active: number };
  deliveries: { total: number; active: number };
  revenue: {
    today: number;
    yesterday: number;
    month: number;
    week: number;
    year: number;
    currency: string;
    revenueDelta: number | null;
  };
  wallet: { totalBalance: number };
  pending: { drivers: number; partners: number };
  support: { openTickets: number };
  deltas: { revenue: number | null; users: number | null };
  suspended: {
    driversCount: number;
    partnersCount: number;
    driversList: SuspendedUser[];
    partnersList: SuspendedUser[];
  };
}

export interface SuspendedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  suspendedAt: string;
  suspensionReason: string | null;
}

export interface PaymentStats {
  totalRevenue: number;
  todayRevenue: number;
  totalCommission: number;
  todayCommission: number;
  pendingCount: number;
  refundedTotal: number;
  byMethod: { method: string; count: number; total: number }[];
}

export interface RevenueAnalytics {
  totalRevenue: number;
  platformFee: number;
  netRevenue: number;
  transactionCount: number;
  dailyRevenue: { date: string; total: number; rides: number; deliveries: number; count: number }[];
  byMethod: Record<string, number>;
  period: string;
  currency: string;
}

export interface PerformanceAnalytics {
  period: string;
  metrics: {
    averageRideTime: number | null;
    averageDeliveryTime: number | null;
    driverRating: number | null;
    partnerRating: number | null;
    completionRate: number;
    rideCompletionRate: number;
    deliveryCompletionRate: number;
    cancellationRate: number;
    totalRides: number;
    totalDeliveries: number;
    completedRides: number;
    completedDeliveries: number;
    cancelledRides: number;
    cancelledDeliveries: number;
  };
  weeklyActivity: { day: string; rides: number; deliveries: number }[];
  completionData: { name: string; value: number }[];
}

export interface ShieldStats {
  activeSessions: number;
  sessionsToday: number;
  alertsTriggered: number;
  autoTriggered: number;
  arrivedSafe: number;
}

export interface DuoPayStats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  defaultedAccounts: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export interface AppFeedbackStats {
  total: number;
  averageRating: number;
  distribution: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface ActivityLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export interface Paginated<T> {
  pagination: { total: number; page: number; pages: number };
  [key: string]: T[] | { total: number; page: number; pages: number };
}

export interface Company {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  commissionRate: number;
  monthlyMinimum: number;
  wallet: { balance: number; lowBalanceThreshold: number } | null;
  _count: { employees: number; trips: number };
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}
