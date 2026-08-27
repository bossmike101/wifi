import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, initializeDatabase } from './server/db.js';
import { paymentService } from './server/paymentService.js';
import { mikrotikService } from './server/mikrotikService.js';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB tables if PostgreSQL is available
  await initializeDatabase();

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Auth Endpoints ---
  app.post('/api/auth/login', async (req, res) => {
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

    res.json({
      success: true,
      user: { id: admin.id, username: admin.username },
      token: 'session_token_authenticated'
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  app.get('/api/auth/me', async (req, res) => {
    const admin = await db.getAdminByUsername('admin');
    if (admin) {
      res.json({ success: true, user: { id: admin.id, username: admin.username } });
    } else {
      res.status(401).json({ error: 'Unauthenticated' });
    }
  });

  app.put('/api/auth/update-credentials', async (req, res) => {
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
  });

  // --- Dashboard Stats Endpoint ---
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await db.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Packages Endpoints ---
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

  // --- Payment Endpoints ---
  app.post('/api/payments/initiate', async (req, res) => {
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
  });

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
      // Diagnostic check endpoint for verification
      return res.status(200).json({
        status: 'active',
        endpoint: '/api/payments/callback',
        message: 'PalPluss webhook callback endpoint is active and listening for POST notifications.',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const payload = req.body || {};
      const dataObj = payload.data || payload.transaction || payload;

      // Extract merchant reference across multiple standard formats
      const merchantRef = dataObj.accountReference || 
                          dataObj.account_reference || 
                          dataObj.merchantReference || 
                          dataObj.merchant_reference || 
                          dataObj.reference || 
                          dataObj.BillRefNumber || 
                          payload.reference || 
                          payload.accountReference;

      // Determine status
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

      // Safe Diagnostic Log (Never logs passwords, API keys, or PINs)
      console.log('[PalPluss Callback Diagnostic]', {
        timestamp: new Date().toISOString(),
        merchantReference: merchantRef || 'N/A',
        providerReference: mpesaReceipt || 'N/A',
        providerTransactionId: providerTxnId || 'N/A',
        status: status,
        resultCode: resultCode !== undefined ? resultCode : 'N/A'
      });

      if (!merchantRef) {
        // If not found by reference, try matching by providerTransactionId
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

  // Payment Simulation (For Dev Sandbox & Testing without active PalPluss SIM)
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

  app.get('/api/payments/history', async (req, res) => {
    try {
      const txns = await db.getPayments(100);
      res.json(txns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- WiFi Sessions Endpoints ---
  app.get('/api/sessions', async (req, res) => {
    try {
      const status = req.query.status as any;
      const sessions = await db.getSessions(status);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sessions/:id/revoke', async (req, res) => {
    try {
      const success = await db.revokeSession(req.params.id);
      if (!success) return res.status(404).json({ error: 'Session not found' });
      res.json({ success: true, message: 'Session revoked successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Portal Settings Endpoints ---
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

  // --- MikroTik Router Endpoints ---
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

  app.post('/api/router/test', async (req, res) => {
    try {
      const result = await mikrotikService.testConnection(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/router/generate-script', async (req, res) => {
    try {
      const script = mikrotikService.generateSetupScript(req.body || {});
      res.json({ success: true, script });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- System Settings Endpoints ---
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

  // ----------------------------------------------------
  // VITE MIDDLEWARE / STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WiFi Billing System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Error:', err);
});
