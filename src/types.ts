export interface AdminUser {
  id: string;
  username: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  priceKes: number;
  durationMinutes: number;
  deviceLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'cancelled' | 'expired';

export interface Payment {
  id: string;
  packageId: string;
  packageName?: string;
  phoneNumber: string;
  amountKes: number;
  status: PaymentStatus;
  provider: string;
  providerReference?: string;
  merchantReference: string;
  providerTransactionId?: string;
  callbackPayload?: any;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface WifiSession {
  id: string;
  paymentId: string;
  packageId: string;
  packageName?: string;
  phoneNumber: string;
  mikrotikUsername: string;
  deviceMac?: string;
  startedAt: string;
  expiresAt: string;
  status: SessionStatus;
  timeRemainingSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortalSettings {
  id: string;
  businessName: string;
  logoUrl?: string;
  faviconUrl?: string;
  welcomeTitle: string;
  welcomeMessage: string;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
  successColor: string;
  portalTemplate: 'clean' | 'modern' | 'minimal';
  backgroundImageUrl?: string;
  footerText?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouterSettings {
  id: string;
  routerName: string;
  host: string;
  apiPort: number;
  username: string;
  encryptedPassword?: string;
  isEnabled: boolean;
  lastConnectionStatus: 'connected' | 'disconnected' | 'checking' | 'unknown';
  lastConnectedAt?: string;
  hotspotName?: string;
  routerIdentity?: string;
  uptime?: string;
  activeUsersCount?: number;
  totalUsersToday?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  currency: string;
  timezone: string;
  paymentProvider: string;
  palplussApiKey?: string;
  palplussApiUrl?: string;
  palplussCallbackUrl?: string;
  palplussMerchantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todayRevenue: number;
  revenueTrendPercent: number;
  activeUsers: number;
  activeUsersTrendPercent: number;
  successfulPayments: number;
  successfulPaymentsTrendPercent: number;
  expiredSessions: number;
  expiredSessionsTrendPercent: number;
  maxSessionsCapacity: number;
  routerStatus: 'connected' | 'disconnected' | 'checking';
  routerUptime: string;
  totalUsersToday: number;
  recentTransactions: Payment[];
  packages: Package[];
  portalSettings: PortalSettings;
}
