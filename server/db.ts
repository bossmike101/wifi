import pg from 'pg';
import bcrypt from 'bcryptjs';
import {
  AdminUser,
  Package,
  Payment,
  WifiSession,
  PortalSettings,
  RouterSettings,
  SystemSettings,
  DashboardStats
} from '../src/types.js';

const { Pool } = pg;

// Check for DATABASE_URL (Neon PostgreSQL)
const DATABASE_URL = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
if (DATABASE_URL && DATABASE_URL.startsWith('postgres')) {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    });
    console.log('Connected to Neon / PostgreSQL database pool.');
  } catch (err) {
    console.warn('Failed to initialize PostgreSQL pool, using in-memory store:', err);
    pool = null;
  }
}

// In-Memory Database Store (Clean state with ZERO demo records)
const initialAdminHash = bcrypt.hashSync('admin123', 10);

let adminUsers: AdminUser[] = [
  {
    id: '1',
    username: 'admin',
    passwordHash: initialAdminHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Start completely empty - no fake packages, payments, or sessions
let packages: Package[] = [];
let payments: Payment[] = [];
let wifiSessions: WifiSession[] = [];

let portalSettings: PortalSettings = {
  id: 'portal-1',
  businessName: 'WiFi HotSpot',
  welcomeTitle: 'Welcome to Our WiFi',
  welcomeMessage: 'Choose a package to get started',
  primaryColor: '#c5a37f',
  buttonColor: '#c5a37f',
  backgroundColor: '#0a0a0a',
  textColor: '#e0e0e0',
  cardColor: '#141414',
  successColor: '#8fa876',
  portalTemplate: 'clean',
  footerText: 'Powered by MikroTik WiFi Billing System • Fast & Reliable High Speed Internet',
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let routerSettings: RouterSettings = {
  id: 'router-1',
  routerName: 'MikroTik Router',
  host: process.env.MIKROTIK_HOST || '192.168.88.1',
  apiPort: Number(process.env.MIKROTIK_PORT) || 8728,
  username: process.env.MIKROTIK_USER || 'admin',
  encryptedPassword: process.env.MIKROTIK_PASSWORD || '',
  isEnabled: false,
  lastConnectionStatus: 'disconnected',
  hotspotName: 'hotspot1',
  routerIdentity: 'MikroTik',
  uptime: '0m',
  activeUsersCount: 0,
  totalUsersToday: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let systemSettings: SystemSettings = {
  id: 'sys-1',
  businessName: 'WiFi Billing',
  businessPhone: '',
  businessEmail: '',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
  paymentProvider: 'palpluss',
  palplussApiKey: process.env.PALPLUS_API_KEY || '',
  palplussApiUrl: process.env.PALPLUS_API_URL || 'https://api.palpluss.com/v1',
  palplussCallbackUrl: process.env.PALPLUS_CALLBACK_URL || '',
  palplussMerchantId: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let dbInitPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (!pool) return;
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase().catch(err => {
      console.warn('Lazy DB initialization notice:', err.message);
      dbInitPromise = null;
    });
  }
  return dbInitPromise;
}

// Database Initialization & Migration Helper for PostgreSQL/Neon
export async function initializeDatabase() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          price_kes NUMERIC(12,2) NOT NULL CHECK (price_kes > 0),
          duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
          device_limit INTEGER NOT NULL DEFAULT 1 CHECK (device_limit > 0),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          phone_number VARCHAR(20) NOT NULL,
          amount_kes NUMERIC(12,2) NOT NULL CHECK (amount_kes > 0),
          status VARCHAR(20) NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'successful', 'failed', 'cancelled', 'expired')),
          provider VARCHAR(50) NOT NULL DEFAULT 'palpluss',
          provider_reference TEXT,
          merchant_reference TEXT NOT NULL UNIQUE,
          provider_transaction_id TEXT,
          callback_payload JSONB,
          paid_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS wifi_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
          package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          phone_number VARCHAR(20) NOT NULL,
          mikrotik_username VARCHAR(150),
          device_mac VARCHAR(50),
          started_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          status VARCHAR(20) NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'expired', 'revoked')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS portal_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_name VARCHAR(150) NOT NULL DEFAULT 'WiFi HotSpot',
          logo_url TEXT,
          favicon_url TEXT,
          welcome_title TEXT DEFAULT 'Welcome to Our WiFi',
          welcome_message TEXT DEFAULT 'Choose a package to get started',
          primary_color VARCHAR(20) DEFAULT '#c5a37f',
          button_color VARCHAR(20) DEFAULT '#c5a37f',
          background_color VARCHAR(20) DEFAULT '#0a0a0a',
          text_color VARCHAR(20) DEFAULT '#e0e0e0',
          card_color VARCHAR(20) DEFAULT '#141414',
          success_color VARCHAR(20) DEFAULT '#8fa876',
          portal_template VARCHAR(50) DEFAULT 'clean',
          background_image_url TEXT,
          footer_text TEXT,
          is_published BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS router_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          router_name VARCHAR(100) DEFAULT 'MikroTik Router',
          host TEXT NOT NULL DEFAULT '192.168.88.1',
          api_port INTEGER NOT NULL DEFAULT 8728,
          username VARCHAR(100) NOT NULL DEFAULT 'admin',
          encrypted_password TEXT NOT NULL DEFAULT '',
          is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          last_connection_status VARCHAR(30) DEFAULT 'disconnected',
          last_connected_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_name VARCHAR(150) DEFAULT 'WiFi Billing',
          business_phone VARCHAR(30) DEFAULT '',
          business_email VARCHAR(150) DEFAULT '',
          currency VARCHAR(10) NOT NULL DEFAULT 'KES',
          timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Nairobi',
          payment_provider VARCHAR(50) DEFAULT 'palpluss',
          palpluss_api_key TEXT DEFAULT '',
          palpluss_api_url TEXT DEFAULT 'https://api.palpluss.com/v1',
          palpluss_callback_url TEXT DEFAULT '',
          palpluss_merchant_id TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Safe Migration: Ensure all columns exist even on pre-existing database tables
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_name VARCHAR(150) DEFAULT 'WiFi Billing';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_phone VARCHAR(30) DEFAULT '';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_email VARCHAR(150) DEFAULT '';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'KES';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Nairobi';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'palpluss';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_api_key TEXT DEFAULT '';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_api_url TEXT DEFAULT 'https://api.palpluss.com/v1';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_callback_url TEXT DEFAULT '';
        ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_merchant_id TEXT DEFAULT '';

        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS business_name VARCHAR(150) DEFAULT 'WiFi HotSpot';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS welcome_title TEXT DEFAULT 'Welcome to Our WiFi';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Choose a package to get started';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#c5a37f';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS button_color VARCHAR(20) DEFAULT '#c5a37f';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#0a0a0a';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#e0e0e0';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS card_color VARCHAR(20) DEFAULT '#141414';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS success_color VARCHAR(20) DEFAULT '#8fa876';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS portal_template VARCHAR(50) DEFAULT 'clean';
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS background_image_url TEXT;
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS footer_text TEXT;
        ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS router_name VARCHAR(100) DEFAULT 'MikroTik Router';
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS host TEXT NOT NULL DEFAULT '192.168.88.1';
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS api_port INTEGER NOT NULL DEFAULT 8728;
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS username VARCHAR(100) NOT NULL DEFAULT 'admin';
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS encrypted_password TEXT NOT NULL DEFAULT '';
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS last_connection_status VARCHAR(30) DEFAULT 'disconnected';
        ALTER TABLE router_settings ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;

        ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_reference TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant_reference TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS callback_payload JSONB;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

        ALTER TABLE wifi_sessions ADD COLUMN IF NOT EXISTS mikrotik_username VARCHAR(150);
        ALTER TABLE wifi_sessions ADD COLUMN IF NOT EXISTS device_mac VARCHAR(50);
        ALTER TABLE wifi_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
        ALTER TABLE wifi_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
        ALTER TABLE wifi_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

        -- Ensure initial rows exist
        INSERT INTO portal_settings (business_name) 
        SELECT 'WiFi HotSpot' WHERE NOT EXISTS (SELECT 1 FROM portal_settings);

        INSERT INTO router_settings (router_name) 
        SELECT 'MikroTik Router' WHERE NOT EXISTS (SELECT 1 FROM router_settings);

        INSERT INTO system_settings (business_name) 
        SELECT 'WiFi Billing' WHERE NOT EXISTS (SELECT 1 FROM system_settings);
      `);

      // Seed initial admin if missing
      const adminCheck = await client.query('SELECT id FROM admin_users LIMIT 1');
      if (adminCheck.rowCount === 0) {
        await client.query(
          'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
          ['admin', initialAdminHash]
        );
      }

      console.log('PostgreSQL / Neon schema initialized (clean install).');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error during PostgreSQL migration:', err);
  }
}

// Data Access Layer Object
export const db = {
  // Admin Authentication
  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT id, username, password_hash AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt" FROM admin_users WHERE LOWER(username) = LOWER($1)',
          [username]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('DB getAdminByUsername error:', err);
      }
    }
    const user = adminUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user || null;
  },

  async updateAdminCredentials(username: string, newPasswordHash: string): Promise<boolean> {
    if (pool) {
      try {
        await pool.query(
          'UPDATE admin_users SET username = $1, password_hash = $2, updated_at = NOW() WHERE id = (SELECT id FROM admin_users LIMIT 1)',
          [username, newPasswordHash]
        );
        return true;
      } catch (err) {
        console.error('DB updateAdminCredentials error:', err);
      }
    }
    const user = adminUsers[0];
    if (user) {
      user.username = username;
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  },

  // Packages CRUD
  async getPackages(includeInactive = false): Promise<Package[]> {
    if (pool) {
      try {
        const query = includeInactive
          ? 'SELECT id, name, price_kes AS "priceKes", duration_minutes AS "durationMinutes", device_limit AS "deviceLimit", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM packages ORDER BY price_kes ASC'
          : 'SELECT id, name, price_kes AS "priceKes", duration_minutes AS "durationMinutes", device_limit AS "deviceLimit", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM packages WHERE is_active = TRUE ORDER BY price_kes ASC';
        const res = await pool.query(query);
        return res.rows.map(r => ({
          ...r,
          priceKes: Number(r.priceKes),
          durationMinutes: Number(r.durationMinutes),
          deviceLimit: Number(r.deviceLimit),
        }));
      } catch (err) {
        console.error('DB getPackages error:', err);
      }
    }
    if (includeInactive) return [...packages];
    return packages.filter(p => p.isActive);
  },

  async getPackageById(id: string): Promise<Package | null> {
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT id, name, price_kes AS "priceKes", duration_minutes AS "durationMinutes", device_limit AS "deviceLimit", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM packages WHERE id::text = $1',
          [id]
        );
        if (res.rows[0]) {
          const r = res.rows[0];
          return {
            ...r,
            priceKes: Number(r.priceKes),
            durationMinutes: Number(r.durationMinutes),
            deviceLimit: Number(r.deviceLimit),
          };
        }
      } catch (err) {
        console.error('DB getPackageById error:', err);
      }
    }
    const pkg = packages.find(p => p.id === id);
    return pkg || null;
  },

  async createPackage(data: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>): Promise<Package> {
    if (pool) {
      try {
        const res = await pool.query(
          'INSERT INTO packages (name, price_kes, duration_minutes, device_limit, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, price_kes AS "priceKes", duration_minutes AS "durationMinutes", device_limit AS "deviceLimit", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
          [data.name, Number(data.priceKes), Number(data.durationMinutes), Number(data.deviceLimit || 1), data.isActive !== undefined ? data.isActive : true]
        );
        const r = res.rows[0];
        const newPkg: Package = {
          ...r,
          priceKes: Number(r.priceKes),
          durationMinutes: Number(r.durationMinutes),
          deviceLimit: Number(r.deviceLimit),
        };
        packages.unshift(newPkg);
        return newPkg;
      } catch (err) {
        console.error('DB createPackage error:', err);
      }
    }
    const newPkg: Package = {
      id: `pkg-${Date.now()}`,
      name: data.name,
      priceKes: Number(data.priceKes),
      durationMinutes: Number(data.durationMinutes),
      deviceLimit: Number(data.deviceLimit || 1),
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    packages.unshift(newPkg);
    return newPkg;
  },

  async updatePackage(id: string, data: Partial<Package>): Promise<Package | null> {
    if (pool) {
      try {
        const current = await this.getPackageById(id);
        if (!current) return null;
        const name = data.name !== undefined ? data.name : current.name;
        const priceKes = data.priceKes !== undefined ? Number(data.priceKes) : current.priceKes;
        const durationMinutes = data.durationMinutes !== undefined ? Number(data.durationMinutes) : current.durationMinutes;
        const deviceLimit = data.deviceLimit !== undefined ? Number(data.deviceLimit) : current.deviceLimit;
        const isActive = data.isActive !== undefined ? data.isActive : current.isActive;

        const res = await pool.query(
          'UPDATE packages SET name = $1, price_kes = $2, duration_minutes = $3, device_limit = $4, is_active = $5, updated_at = NOW() WHERE id::text = $6 RETURNING id, name, price_kes AS "priceKes", duration_minutes AS "durationMinutes", device_limit AS "deviceLimit", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
          [name, priceKes, durationMinutes, deviceLimit, isActive, id]
        );
        if (res.rows[0]) {
          const r = res.rows[0];
          const updated: Package = {
            ...r,
            priceKes: Number(r.priceKes),
            durationMinutes: Number(r.durationMinutes),
            deviceLimit: Number(r.deviceLimit),
          };
          const memIdx = packages.findIndex(p => p.id === id);
          if (memIdx !== -1) packages[memIdx] = updated;
          return updated;
        }
      } catch (err) {
        console.error('DB updatePackage error:', err);
      }
    }
    const index = packages.findIndex(p => p.id === id);
    if (index === -1) return null;
    packages[index] = {
      ...packages[index],
      ...data,
      priceKes: data.priceKes !== undefined ? Number(data.priceKes) : packages[index].priceKes,
      durationMinutes: data.durationMinutes !== undefined ? Number(data.durationMinutes) : packages[index].durationMinutes,
      deviceLimit: data.deviceLimit !== undefined ? Number(data.deviceLimit) : packages[index].deviceLimit,
      updatedAt: new Date().toISOString()
    };
    return packages[index];
  },

  async deletePackage(id: string): Promise<boolean> {
    if (pool) {
      try {
        await pool.query('DELETE FROM packages WHERE id::text = $1', [id]);
      } catch (err) {
        console.error('DB deletePackage error:', err);
      }
    }
    const index = packages.findIndex(p => p.id === id);
    if (index !== -1) {
      packages.splice(index, 1);
    }
    return true;
  },

  // Payments
  async getPayments(limit = 100): Promise<Payment[]> {
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT 
            p.id, 
            p.package_id AS "packageId", 
            COALESCE(pkg.name, 'WiFi Package') AS "packageName", 
            p.phone_number AS "phoneNumber", 
            p.amount_kes AS "amountKes", 
            p.status, 
            p.provider, 
            p.provider_reference AS "providerReference", 
            p.merchant_reference AS "merchantReference", 
            p.provider_transaction_id AS "providerTransactionId", 
            p.callback_payload AS "callbackPayload", 
            p.paid_at AS "paidAt", 
            p.created_at AS "createdAt", 
            p.updated_at AS "updatedAt" 
          FROM payments p 
          LEFT JOIN packages pkg ON p.package_id = pkg.id 
          ORDER BY p.created_at DESC 
          LIMIT $1`,
          [limit]
        );
        return res.rows.map(r => ({
          ...r,
          amountKes: Number(r.amountKes)
        }));
      } catch (err) {
        console.error('DB getPayments error:', err);
      }
    }
    return [...payments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async getPaymentByMerchantRef(ref: string): Promise<Payment | null> {
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT 
            p.id, 
            p.package_id AS "packageId", 
            COALESCE(pkg.name, 'WiFi Package') AS "packageName", 
            p.phone_number AS "phoneNumber", 
            p.amount_kes AS "amountKes", 
            p.status, 
            p.provider, 
            p.provider_reference AS "providerReference", 
            p.merchant_reference AS "merchantReference", 
            p.provider_transaction_id AS "providerTransactionId", 
            p.callback_payload AS "callbackPayload", 
            p.paid_at AS "paidAt", 
            p.created_at AS "createdAt", 
            p.updated_at AS "updatedAt" 
          FROM payments p 
          LEFT JOIN packages pkg ON p.package_id = pkg.id 
          WHERE p.merchant_reference = $1`,
          [ref]
        );
        if (res.rows[0]) {
          return {
            ...res.rows[0],
            amountKes: Number(res.rows[0].amountKes)
          };
        }
      } catch (err) {
        console.error('DB getPaymentByMerchantRef error:', err);
      }
    }
    const pay = payments.find(p => p.merchantReference === ref);
    return pay || null;
  },

  async createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const pkg = await this.getPackageById(data.packageId);
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO payments (
            package_id, phone_number, amount_kes, status, provider, 
            provider_reference, merchant_reference, provider_transaction_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING 
            id, package_id AS "packageId", phone_number AS "phoneNumber", 
            amount_kes AS "amountKes", status, provider, 
            provider_reference AS "providerReference", 
            merchant_reference AS "merchantReference", 
            provider_transaction_id AS "providerTransactionId", 
            paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            data.packageId,
            data.phoneNumber,
            Number(data.amountKes),
            data.status || 'pending',
            data.provider || 'palpluss',
            data.providerReference || null,
            data.merchantReference,
            data.providerTransactionId || null
          ]
        );
        const r = res.rows[0];
        const newPayment: Payment = {
          ...r,
          amountKes: Number(r.amountKes),
          packageName: pkg ? pkg.name : data.packageName || 'WiFi Package'
        };
        payments.unshift(newPayment);
        return newPayment;
      } catch (err) {
        console.error('DB createPayment error:', err);
      }
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      ...data,
      packageName: pkg ? pkg.name : data.packageName || 'WiFi Package',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    payments.unshift(newPayment);
    return newPayment;
  },

  async updatePayment(merchantRef: string, data: Partial<Payment>): Promise<Payment | null> {
    if (pool) {
      try {
        const current = await this.getPaymentByMerchantRef(merchantRef);
        if (!current) return null;

        const status = data.status || current.status;
        const providerRef = data.providerReference !== undefined ? data.providerReference : current.providerReference;
        const providerTxnId = data.providerTransactionId !== undefined ? data.providerTransactionId : current.providerTransactionId;
        const paidAt = status === 'successful' && !current.paidAt ? 'NOW()' : (data.paidAt ? `'${data.paidAt}'` : (current.paidAt ? `'${current.paidAt}'` : 'NULL'));
        const callbackPayload = data.callbackPayload ? JSON.stringify(data.callbackPayload) : (current.callbackPayload ? JSON.stringify(current.callbackPayload) : null);

        const res = await pool.query(
          `UPDATE payments SET 
            status = $1, 
            provider_reference = $2, 
            provider_transaction_id = $3, 
            callback_payload = $4,
            paid_at = ${paidAt === 'NOW()' ? 'NOW()' : (paidAt === 'NULL' ? 'NULL' : '$5')},
            updated_at = NOW() 
          WHERE merchant_reference = $6 
          RETURNING 
            id, package_id AS "packageId", phone_number AS "phoneNumber", 
            amount_kes AS "amountKes", status, provider, 
            provider_reference AS "providerReference", 
            merchant_reference AS "merchantReference", 
            provider_transaction_id AS "providerTransactionId", 
            callback_payload AS "callbackPayload",
            paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
          paidAt !== 'NOW()' && paidAt !== 'NULL'
            ? [status, providerRef, providerTxnId, callbackPayload, current.paidAt, merchantRef]
            : [status, providerRef, providerTxnId, callbackPayload, merchantRef]
        );

        if (res.rows[0]) {
          const r = res.rows[0];
          const updated: Payment = {
            ...r,
            amountKes: Number(r.amountKes),
            packageName: current.packageName
          };
          const memIdx = payments.findIndex(p => p.merchantReference === merchantRef);
          if (memIdx !== -1) payments[memIdx] = updated;
          return updated;
        }
      } catch (err) {
        console.error('DB updatePayment error:', err);
      }
    }

    const pay = payments.find(p => p.merchantReference === merchantRef);
    if (!pay) return null;
    Object.assign(pay, data, { updatedAt: new Date().toISOString() });
    return pay;
  },

  // WiFi Sessions
  async getSessions(statusFilter?: 'active' | 'expired' | 'revoked'): Promise<WifiSession[]> {
    if (pool) {
      try {
        // Auto-expire sessions
        await pool.query("UPDATE wifi_sessions SET status = 'expired', updated_at = NOW() WHERE status = 'active' AND expires_at <= NOW()");

        const query = statusFilter
          ? `SELECT 
              s.id, s.payment_id AS "paymentId", s.package_id AS "packageId", 
              COALESCE(pkg.name, 'WiFi Access') AS "packageName", 
              s.phone_number AS "phoneNumber", s.mikrotik_username AS "mikrotikUsername", 
              s.device_mac AS "deviceMac", s.started_at AS "startedAt", 
              s.expires_at AS "expiresAt", s.status, 
              s.created_at AS "createdAt", s.updated_at AS "updatedAt" 
            FROM wifi_sessions s 
            LEFT JOIN packages pkg ON s.package_id = pkg.id 
            WHERE s.status = $1 
            ORDER BY s.started_at DESC`
          : `SELECT 
              s.id, s.payment_id AS "paymentId", s.package_id AS "packageId", 
              COALESCE(pkg.name, 'WiFi Access') AS "packageName", 
              s.phone_number AS "phoneNumber", s.mikrotik_username AS "mikrotikUsername", 
              s.device_mac AS "deviceMac", s.started_at AS "startedAt", 
              s.expires_at AS "expiresAt", s.status, 
              s.created_at AS "createdAt", s.updated_at AS "updatedAt" 
            FROM wifi_sessions s 
            LEFT JOIN packages pkg ON s.package_id = pkg.id 
            ORDER BY s.started_at DESC`;

        const res = await pool.query(query, statusFilter ? [statusFilter] : []);
        return res.rows;
      } catch (err) {
        console.error('DB getSessions error:', err);
      }
    }

    const now = Date.now();
    wifiSessions.forEach(s => {
      if (s.status === 'active' && new Date(s.expiresAt).getTime() <= now) {
        s.status = 'expired';
        s.updatedAt = new Date().toISOString();
      }
    });

    let list = [...wifiSessions];
    if (statusFilter) {
      list = list.filter(s => s.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  },

  async createSession(data: Omit<WifiSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<WifiSession> {
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO wifi_sessions (
            payment_id, package_id, phone_number, mikrotik_username, 
            device_mac, started_at, expires_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING 
            id, payment_id AS "paymentId", package_id AS "packageId", 
            phone_number AS "phoneNumber", mikrotik_username AS "mikrotikUsername", 
            device_mac AS "deviceMac", started_at AS "startedAt", 
            expires_at AS "expiresAt", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
          [
            data.paymentId,
            data.packageId,
            data.phoneNumber,
            data.mikrotikUsername || `usr_${data.phoneNumber}`,
            data.deviceMac || null,
            data.startedAt || new Date().toISOString(),
            data.expiresAt,
            data.status || 'active'
          ]
        );
        const r = res.rows[0];
        const newSession: WifiSession = {
          ...r,
          packageName: data.packageName || 'WiFi Access'
        };
        wifiSessions.unshift(newSession);
        return newSession;
      } catch (err) {
        console.error('DB createSession error:', err);
      }
    }

    const newSession: WifiSession = {
      id: `sess-${Date.now()}`,
      ...data,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    wifiSessions.unshift(newSession);
    return newSession;
  },

  async revokeSession(id: string): Promise<boolean> {
    if (pool) {
      try {
        await pool.query("UPDATE wifi_sessions SET status = 'revoked', updated_at = NOW() WHERE id::text = $1", [id]);
      } catch (err) {
        console.error('DB revokeSession error:', err);
      }
    }
    const session = wifiSessions.find(s => s.id === id);
    if (!session) return false;
    session.status = 'revoked';
    session.updatedAt = new Date().toISOString();
    return true;
  },

  // Portal Settings
  async getPortalSettings(): Promise<PortalSettings> {
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT 
            id, business_name AS "businessName", logo_url AS "logoUrl", 
            welcome_title AS "welcomeTitle", welcome_message AS "welcomeMessage", 
            primary_color AS "primaryColor", button_color AS "buttonColor", 
            background_color AS "backgroundColor", text_color AS "textColor", 
            card_color AS "cardColor", success_color AS "successColor", 
            portal_template AS "portalTemplate", footer_text AS "footerText", 
            is_published AS "isPublished", created_at AS "createdAt", updated_at AS "updatedAt" 
          FROM portal_settings LIMIT 1`
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.error('DB getPortalSettings error:', err);
      }
    }
    return { ...portalSettings };
  },

  async updatePortalSettings(data: Partial<PortalSettings>): Promise<PortalSettings> {
    if (pool) {
      try {
        const current = await this.getPortalSettings();
        const merged = { ...current, ...data };
        await pool.query(
          `UPDATE portal_settings SET 
            business_name = $1, welcome_title = $2, welcome_message = $3, 
            primary_color = $4, button_color = $5, background_color = $6, 
            text_color = $7, card_color = $8, success_color = $9, 
            footer_text = $10, is_published = $11, updated_at = NOW() 
          WHERE id = $12`,
          [
            merged.businessName, merged.welcomeTitle, merged.welcomeMessage,
            merged.primaryColor, merged.buttonColor, merged.backgroundColor,
            merged.textColor, merged.cardColor, merged.successColor,
            merged.footerText, merged.isPublished, merged.id
          ]
        );
      } catch (err) {
        console.error('DB updatePortalSettings error:', err);
      }
    }
    portalSettings = {
      ...portalSettings,
      ...data,
      updatedAt: new Date().toISOString()
    };
    return { ...portalSettings };
  },

  // Router Settings
  async getRouterSettings(): Promise<RouterSettings> {
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT 
            id, router_name AS "routerName", host, api_port AS "apiPort", 
            username, encrypted_password AS "encryptedPassword", 
            is_enabled AS "isEnabled", last_connection_status AS "lastConnectionStatus", 
            last_connected_at AS "lastConnectedAt", created_at AS "createdAt", updated_at AS "updatedAt" 
          FROM router_settings LIMIT 1`
        );
        if (res.rows[0]) {
          return {
            ...res.rows[0],
            apiPort: Number(res.rows[0].apiPort)
          };
        }
      } catch (err) {
        console.error('DB getRouterSettings error:', err);
      }
    }
    return { ...routerSettings };
  },

  async updateRouterSettings(data: Partial<RouterSettings>): Promise<RouterSettings> {
    if (pool) {
      try {
        const current = await this.getRouterSettings();
        const merged = { ...current, ...data };
        await pool.query(
          `UPDATE router_settings SET 
            router_name = $1, host = $2, api_port = $3, username = $4, 
            encrypted_password = $5, is_enabled = $6, last_connection_status = $7, 
            last_connected_at = $8, updated_at = NOW() 
          WHERE id = $9`,
          [
            merged.routerName, merged.host, merged.apiPort, merged.username,
            merged.encryptedPassword, merged.isEnabled, merged.lastConnectionStatus,
            merged.lastConnectedAt ? new Date(merged.lastConnectedAt) : null, merged.id
          ]
        );
      } catch (err) {
        console.error('DB updateRouterSettings error:', err);
      }
    }
    routerSettings = {
      ...routerSettings,
      ...data,
      updatedAt: new Date().toISOString()
    };
    return { ...routerSettings };
  },

  // System Settings
  async getSystemSettings(): Promise<SystemSettings> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM system_settings LIMIT 1');
        if (res.rows[0]) {
          const row = res.rows[0];
          return {
            id: row.id || 'sys-1',
            businessName: row.business_name || systemSettings.businessName,
            businessPhone: row.business_phone || systemSettings.businessPhone,
            businessEmail: row.business_email || systemSettings.businessEmail,
            currency: row.currency || systemSettings.currency,
            timezone: row.timezone || systemSettings.timezone,
            paymentProvider: row.payment_provider || systemSettings.paymentProvider,
            palplussApiKey: row.palpluss_api_key || systemSettings.palplussApiKey,
            palplussApiUrl: row.palpluss_api_url || systemSettings.palplussApiUrl,
            palplussCallbackUrl: row.palpluss_callback_url || systemSettings.palplussCallbackUrl,
            palplussMerchantId: row.palpluss_merchant_id || systemSettings.palplussMerchantId,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : systemSettings.createdAt,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : systemSettings.updatedAt
          };
        }
      } catch (err: any) {
        console.error('DB getSystemSettings error, attempting self-healing migration:', err.message);
        try {
          await pool.query(`
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_name VARCHAR(150) DEFAULT 'WiFi Billing';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_phone VARCHAR(30) DEFAULT '';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS business_email VARCHAR(150) DEFAULT '';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'KES';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Nairobi';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'palpluss';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_api_key TEXT DEFAULT '';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_api_url TEXT DEFAULT 'https://api.palpluss.com/v1';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_callback_url TEXT DEFAULT '';
            ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS palpluss_merchant_id TEXT DEFAULT '';
          `);
          const retryRes = await pool.query('SELECT * FROM system_settings LIMIT 1');
          if (retryRes.rows[0]) {
            const row = retryRes.rows[0];
            return {
              id: row.id || 'sys-1',
              businessName: row.business_name || systemSettings.businessName,
              businessPhone: row.business_phone || systemSettings.businessPhone,
              businessEmail: row.business_email || systemSettings.businessEmail,
              currency: row.currency || systemSettings.currency,
              timezone: row.timezone || systemSettings.timezone,
              paymentProvider: row.payment_provider || systemSettings.paymentProvider,
              palplussApiKey: row.palpluss_api_key || systemSettings.palplussApiKey,
              palplussApiUrl: row.palpluss_api_url || systemSettings.palplussApiUrl,
              palplussCallbackUrl: row.palpluss_callback_url || systemSettings.palplussCallbackUrl,
              palplussMerchantId: row.palpluss_merchant_id || systemSettings.palplussMerchantId,
              createdAt: row.created_at ? new Date(row.created_at).toISOString() : systemSettings.createdAt,
              updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : systemSettings.updatedAt
            };
          }
        } catch (migrationErr) {
          console.error('Self-healing migration failed:', migrationErr);
        }
      }
    }
    return { ...systemSettings };
  },

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    if (pool) {
      try {
        const current = await this.getSystemSettings();
        const merged = { ...current, ...data };
        const check = await pool.query('SELECT id FROM system_settings LIMIT 1');
        if (check.rowCount === 0) {
          await pool.query(
            `INSERT INTO system_settings (
              business_name, business_phone, business_email, currency, timezone, 
              payment_provider, palpluss_api_key, palpluss_api_url, 
              palpluss_callback_url, palpluss_merchant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              merged.businessName || 'WiFi Billing',
              merged.businessPhone || '',
              merged.businessEmail || '',
              merged.currency || 'KES',
              merged.timezone || 'Africa/Nairobi',
              merged.paymentProvider || 'palpluss',
              merged.palplussApiKey || '',
              merged.palplussApiUrl || 'https://api.palpluss.com/v1',
              merged.palplussCallbackUrl || '',
              merged.palplussMerchantId || ''
            ]
          );
        } else {
          await pool.query(
            `UPDATE system_settings SET 
              business_name = $1, business_phone = $2, business_email = $3, 
              currency = $4, timezone = $5, payment_provider = $6, 
              palpluss_api_key = $7, palpluss_api_url = $8, 
              palpluss_callback_url = $9, palpluss_merchant_id = $10, 
              updated_at = NOW() 
            WHERE id = $11`,
            [
              merged.businessName, merged.businessPhone, merged.businessEmail,
              merged.currency, merged.timezone, merged.paymentProvider,
              merged.palplussApiKey, merged.palplussApiUrl,
              merged.palplussCallbackUrl, merged.palplussMerchantId,
              check.rows[0].id
            ]
          );
        }
      } catch (err) {
        console.error('DB updateSystemSettings error:', err);
      }
    }
    systemSettings = {
      ...systemSettings,
      ...data,
      updatedAt: new Date().toISOString()
    };
    return { ...systemSettings };
  },

  // Dashboard Stats Aggregator (Purely Genuine Database Calculations)
  async getDashboardStats(): Promise<DashboardStats> {
    const allPayments = await this.getPayments(100);
    const activeSessionsList = await this.getSessions('active');
    const expiredSessionsList = await this.getSessions('expired');
    const activePkgs = await this.getPackages(false);
    const portal = await this.getPortalSettings();
    const router = await this.getRouterSettings();

    // 1. Calculate genuine successful payments count
    const successfulPaymentsList = allPayments.filter(p => p.status === 'successful');
    const successfulPaymentsCount = successfulPaymentsList.length;

    // 2. Calculate genuine revenue from actual successful payments
    const todayRevenue = successfulPaymentsList.reduce((sum, p) => sum + Number(p.amountKes || 0), 0);

    // 3. Genuine active & expired session counts
    const activeUsers = activeSessionsList.length;
    const expiredSessions = expiredSessionsList.length;

    // 4. Recent transactions list
    const recentTxns = allPayments.slice(0, 10);

    return {
      todayRevenue: todayRevenue,
      revenueTrendPercent: 0,
      activeUsers: activeUsers,
      activeUsersTrendPercent: 0,
      successfulPayments: successfulPaymentsCount,
      successfulPaymentsTrendPercent: 0,
      expiredSessions: expiredSessions,
      expiredSessionsTrendPercent: 0,
      maxSessionsCapacity: 10,
      routerStatus: router.lastConnectionStatus === 'connected' ? 'connected' : 'disconnected',
      routerUptime: router.uptime || '0m',
      totalUsersToday: activeUsers + expiredSessions,
      recentTransactions: recentTxns,
      packages: activePkgs,
      portalSettings: portal
    };
  }
};

