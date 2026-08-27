import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db.js';
import { paymentService } from './paymentService.js';
import { mikrotikService } from './mikrotikService.js';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CORS support for cross-origin or proxy calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ----------------------------------------------------
// 1. HEALTH CHECK (Minimal, production-safe, fast)
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'wifi-billing-api',
    environment: process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV || 'development'),
    time: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 2. AUTHENTICATION ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = await db.getAdminByUsername(username);
    if (!admin || !admin.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = bcrypt.compareSync(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const authSecret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'wifi-system-secret-key-2026';
    const timestamp = Date.now();
    const signature = crypto.createHmac('sha256', authSecret)
      .update(`${admin.id}:${admin.username}:${timestamp}`)
      .digest('hex');
    const token = `auth_${admin.id}_${timestamp}_${signature}`;

    res.json({
      success: true,
      user: { id: admin.id, username: admin.username },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const admin = await db.getAdminByUsername('admin');
    if (admin) {
      res.json({ success: true, user: { id: admin.id, username: admin.username } });
    } else {
      res.status(401).json({ error: 'Unauthenticated' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/update-credentials', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const admin = await db.getAdminByUsername('admin');
    if (!admin || !admin.passwordHash) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    if (currentPassword) {
      const isValid = bcrypt.compareSync(currentPassword, admin.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    let newHash = admin.passwordHash;
    if (newPassword && newPassword.length >= 6) {
      newHash = bcrypt.hashSync(newPassword, 10);
    }

    await db.updateAdminCredentials(username || admin.username, newHash);
    res.json({ success: true, message: 'Credentials updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. DASHBOARD STATS ENDPOINT
// ----------------------------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. PACKAGES ENDPOINTS
// ----------------------------------------------------
app.get('/api/packages', async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true';
    const pkgs = await db.getPackages(includeInactive);
    res.json(pkgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const { name, priceKes, durationMinutes, deviceLimit, isActive } = req.body;
    if (!name || !priceKes || !durationMinutes) {
      return res.status(400).json({ error: 'Name, price, and duration are required.' });
    }

    const created = await db.createPackage({
      name,
      priceKes: Number(priceKes),
      durationMinutes: Number(durationMinutes),
      deviceLimit: Number(deviceLimit || 1),
      isActive: isActive !== false
    });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    const updated = await db.updatePackage(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Package not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    const success = await db.deletePackage(req.params.id);
    if (!success) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PAYMENT & M-PESA ENDPOINTS
// ----------------------------------------------------
const handleInitiatePayment = async (req: express.Request, res: express.Response) => {
  try {
    const { packageId, phoneNumber, macAddress } = req.body;
    if (!packageId || !phoneNumber) {
      return res.status(400).json({ error: 'Package ID and Phone Number are required.' });
    }

    const result = await paymentService.initiatePayment({ packageId, phoneNumber, macAddress });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

app.post('/api/payments/initiate', handleInitiatePayment);
app.post('/api/payments/stk-push', handleInitiatePayment);

app.get('/api/payments/status/:reference', async (req, res) => {
  try {
    const payment = await paymentService.verifyPayment(req.params.reference);
    res.json(payment);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// PalPluss Webhook Callback Endpoint
app.all('/api/payments/callback', async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      endpoint: '/api/payments/callback',
      message: 'PalPluss webhook callback endpoint is active and listening for POST notifications.',
      productionUrl: `${(process.env.APP_URL || 'https://wifibilling.vercel.app').replace(/\/$/, '')}/api/payments/callback`,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const payload = req.body || {};
    const dataObj = payload.data || payload.transaction || payload;

    const merchantRef = dataObj.accountReference || 
                        dataObj.account_reference || 
                        dataObj.merchantReference || 
                        dataObj.merchant_reference || 
                        dataObj.reference || 
                        dataObj.BillRefNumber || 
                        payload.reference || 
                        payload.accountReference;

    const statusRaw = String(dataObj.status || payload.status || payload.event || '').toLowerCase();
    const resultCode = payload.ResultCode !== undefined ? payload.ResultCode : dataObj.ResultCode;

    let status: 'successful' | 'failed' | 'cancelled' = 'failed';
    if (statusRaw.includes('success') || statusRaw === 'paid' || statusRaw === 'completed' || resultCode === 0) {
      status = 'successful';
    } else if (statusRaw.includes('cancel')) {
      status = 'cancelled';
    }

    const mpesaReceipt = dataObj.mpesaReceiptNumber || 
                         dataObj.mpesa_receipt_number || 
                         dataObj.providerReference || 
                         dataObj.provider_reference || 
                         dataObj.MpesaReceiptNumber || 
                         dataObj.transaction_id || 
                         dataObj.transactionId;

    const providerTxnId = dataObj.transactionId || 
                          dataObj.transaction_id || 
                          dataObj.checkoutRequestId || 
                          dataObj.checkout_request_id || 
                          payload.id;

    console.log('[PalPluss Callback Diagnostic]', {
      timestamp: new Date().toISOString(),
      merchantReference: merchantRef || 'N/A',
      providerReference: mpesaReceipt || 'N/A',
      providerTransactionId: providerTxnId || 'N/A',
      status: status,
      resultCode: resultCode !== undefined ? resultCode : 'N/A'
    });

    if (!merchantRef) {
      const txnId = providerTxnId;
      if (txnId) {
        const allPayments = await db.getPayments(50);
        const matched = allPayments.find(p => p.providerTransactionId === String(txnId) || p.providerReference === String(txnId));
        if (matched) {
          const result = await paymentService.processCallback({
            merchantReference: matched.merchantReference,
            status,
            providerReference: mpesaReceipt ? String(mpesaReceipt) : undefined,
            providerTransactionId: String(txnId),
            rawPayload: payload
          });
          return res.status(200).json({
            status: 'success',
            message: 'Callback processed successfully via transaction ID match.',
            data: result
          });
        }
      }

      console.warn('Missing merchant reference in PalPluss callback');
      return res.status(400).json({ status: 'error', error: 'Missing merchant reference in callback.' });
    }

    const result = await paymentService.processCallback({
      merchantReference: merchantRef,
      status: status,
      providerReference: mpesaReceipt ? String(mpesaReceipt) : undefined,
      providerTransactionId: providerTxnId ? String(providerTxnId) : undefined,
      rawPayload: payload
    });

    console.log('[PalPluss Callback Processed]', {
      merchantReference: merchantRef,
      status: status,
      sessionCreated: Boolean(result.session),
      paymentUpdated: Boolean(result.payment)
    });

    return res.status(200).json({
      status: 'success',
      message: 'Callback processed successfully.',
      data: result
    });
  } catch (err: any) {
    console.error('PalPluss Callback processing error:', err.message);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// PalPluss API Gateway Connection & STK Push Verification Tester
app.post('/api/payments/test-gateway', async (req, res) => {
  try {
    const { apiKey, apiUrl, phoneNumber, merchantId } = req.body;
    const result = await paymentService.testPalplussGateway({
      apiKey,
      apiUrl,
      phoneNumber,
      merchantId
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Payment Simulation for local development & sandbox testing
app.post('/api/payments/simulate-success', async (req, res) => {
  try {
    const { merchantReference } = req.body;
    const result = await paymentService.processCallback({
      merchantReference,
      status: 'successful',
      providerReference: `SIM-MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerTransactionId: `SIM-TXN-${Date.now()}`
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const txns = await db.getPayments(limit);
    res.json(txns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/history', async (req, res) => {
  try {
    const txns = await db.getPayments(100);
    res.json(txns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. WIFI SESSIONS ENDPOINTS
// ----------------------------------------------------
app.get('/api/sessions', async (req, res) => {
  try {
    const status = req.query.status as any;
    const sessions = await db.getSessions(status);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleRevokeSession = async (req: express.Request, res: express.Response) => {
  try {
    const success = await db.revokeSession(req.params.id);
    if (!success) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, message: 'Session disconnected/revoked successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/sessions/:id/revoke', handleRevokeSession);
app.post('/api/sessions/:id/disconnect', handleRevokeSession);

// ----------------------------------------------------
// 7. PORTAL SETTINGS ENDPOINTS
// ----------------------------------------------------
app.get('/api/portal/settings', async (req, res) => {
  try {
    const settings = await db.getPortalSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/settings', async (req, res) => {
  try {
    const updated = await db.updatePortalSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/publish', async (req, res) => {
  try {
    const updated = await db.updatePortalSettings({ isPublished: true });
    res.json({ success: true, message: 'Portal configuration published successfully.', settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. MIKROTIK ROUTER ENDPOINTS
// ----------------------------------------------------
app.get('/api/router/settings', async (req, res) => {
  try {
    const settings = await db.getRouterSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/router/settings', async (req, res) => {
  try {
    const updated = await db.updateRouterSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleTestRouter = async (req: express.Request, res: express.Response) => {
  try {
    const { host, port, username, password } = req.body;
    const result = await mikrotikService.testConnection({ host, port, username, password });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

app.post('/api/router/test', handleTestRouter);
app.post('/api/router/test-connection', handleTestRouter);

app.post('/api/router/generate-script', async (req, res) => {
  try {
    const routerSettings = await db.getRouterSettings();
    const portalSettings = await db.getPortalSettings();
    const systemSettings = await db.getSystemSettings();

    const appUrl = (process.env.APP_URL || 'https://wifibilling.vercel.app').replace(/\/$/, '');
    const script = mikrotikService.generateSetupScript({
      hotspotInterface: 'wlan1',
      dnsName: 'wifi.login',
      gatewayIp: '10.0.0.1',
      portalUrl: `${appUrl}/portal`
    });

    res.json({
      success: true,
      script,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. SYSTEM SETTINGS ENDPOINTS
// ----------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSystemSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await db.updateSystemSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
