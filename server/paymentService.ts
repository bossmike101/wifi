import { db } from './db.js';
import { mikrotikService } from './mikrotikService.js';

export function extractErrorMessage(data: any, fallback = 'Unable to initiate payment. Please try again.'): string {
  if (!data) return fallback;
  if (typeof data === 'string' && data.trim().length > 0) return data.trim();
  
  if (typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim().length > 0) return data.message.trim();
    if (typeof data.error === 'string' && data.error.trim().length > 0) return data.error.trim();
    if (typeof data.detail === 'string' && data.detail.trim().length > 0) return data.detail.trim();
    if (typeof data.description === 'string' && data.description.trim().length > 0) return data.description.trim();
    if (typeof data.ResponseDescription === 'string' && data.ResponseDescription.trim().length > 0) return data.ResponseDescription.trim();
    if (typeof data.CustomerMessage === 'string' && data.CustomerMessage.trim().length > 0) return data.CustomerMessage.trim();
    if (typeof data.errorMessage === 'string' && data.errorMessage.trim().length > 0) return data.errorMessage.trim();
    if (typeof data.msg === 'string' && data.msg.trim().length > 0) return data.msg.trim();
    if (typeof data.error_description === 'string' && data.error_description.trim().length > 0) return data.error_description.trim();

    // Check nested objects
    if (data.error && typeof data.error === 'object') {
      return extractErrorMessage(data.error, fallback);
    }
    if (data.message && typeof data.message === 'object') {
      return extractErrorMessage(data.message, fallback);
    }
    if (data.data && typeof data.data === 'object') {
      return extractErrorMessage(data.data, fallback);
    }
    if (data.errors && typeof data.errors === 'object') {
      const first = Array.isArray(data.errors) ? data.errors[0] : Object.values(data.errors)[0];
      return extractErrorMessage(first, fallback);
    }
    
    // Check if error has status or code description
    if (data.code && typeof data.code === 'string') {
      return `Payment Gateway Error (${data.code})`;
    }
  }

  return fallback;
}

export function normalizeKenyanPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  // Remove all non-digits
  let cleaned = phone.replace(/[^0-9]/g, '');

  // 07XXXXXXXX (10 digits) -> 2547XXXXXXXX
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  // 01XXXXXXXX (10 digits) -> 2541XXXXXXXX
  if (cleaned.startsWith('01') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  // 2547XXXXXXXX (12 digits)
  if (cleaned.startsWith('2547') && cleaned.length === 12) {
    return cleaned;
  }
  // 2541XXXXXXXX (12 digits)
  if (cleaned.startsWith('2541') && cleaned.length === 12) {
    return cleaned;
  }
  // 7XXXXXXXX (9 digits) -> 2547XXXXXXXX
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return '254' + cleaned;
  }
  // 1XXXXXXXX (9 digits) -> 2541XXXXXXXX
  if (cleaned.startsWith('1') && cleaned.length === 9) {
    return '254' + cleaned;
  }

  return null;
}

function resolvePalplussStkUrl(baseUrl: string): string {
  let url = (baseUrl || 'https://api.palpluss.com/v1').trim();
  // Remove trailing slash
  if (url.endsWith('/')) url = url.slice(0, -1);
  
  if (url.endsWith('/payments/stk') || url.endsWith('/mpesa/stkpush')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/payments/stk`;
  }
  return `${url}/v1/payments/stk`;
}

function resolvePalplussStatusUrl(baseUrl: string, transactionId: string): string {
  let url = (baseUrl || 'https://api.palpluss.com/v1').trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/payments/stk')) {
    url = url.replace('/payments/stk', '');
  }
  if (!url.endsWith('/v1')) {
    url = `${url}/v1`;
  }
  return `${url}/payments/${transactionId}`;
}

export const paymentService = {
  /**
   * Initiates real M-Pesa STK Push via PalPluss API
   */
  async initiatePayment(params: {
    packageId: string;
    phoneNumber: string;
    macAddress?: string;
  }) {
    const { packageId, phoneNumber, macAddress } = params;

    // Validate and normalize phone to standard Kenyan format (2547XXXXXXXX / 2541XXXXXXXX)
    const normalizedPhone = normalizeKenyanPhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      const err: any = new Error('Invalid Kenyan phone number format. Use 07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX.');
      err.code = 'INVALID_PHONE';
      throw err;
    }

    // Retrieve package from database to ensure genuine price
    const pkg = await db.getPackageById(packageId);
    if (!pkg || !pkg.isActive) {
      const err: any = new Error(`Package with ID "${packageId}" not found or is currently inactive.`);
      err.code = 'PACKAGE_NOT_FOUND';
      throw err;
    }

    const sysSettings = await db.getSystemSettings();
    const apiKey = (sysSettings.palplussApiKey || process.env.PALPLUS_API_KEY || '').trim();
    const rawApiUrl = sysSettings.palplussApiUrl || process.env.PALPLUS_API_URL || 'https://api.palpluss.com/v1';
    const appUrl = (process.env.APP_URL || 'https://wifisystem.vercel.app').replace(/\/$/, '');
    const defaultCallbackUrl = `${appUrl}/api/payments/callback`;
    let callbackUrl = (sysSettings.palplussCallbackUrl || process.env.PALPLUS_CALLBACK_URL || defaultCallbackUrl).trim();
    if (!callbackUrl || callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
      callbackUrl = defaultCallbackUrl;
    }
    const merchantId = sysSettings.palplussMerchantId?.trim();

    // Verify PalPluss API credentials exist
    if (!apiKey || apiKey.includes('your_api_key') || apiKey.length < 5) {
      const err: any = new Error('PalPluss API credentials are not configured. Please add your valid PalPluss API Key in Admin Settings before initiating STK push.');
      err.code = 'PALPLUS_CONFIG_MISSING';
      throw err;
    }

    // Generate unique merchant reference
    const merchantReference = `WIFI-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create pending payment in database (Never marks successful prematurely)
    const payment = await db.createPayment({
      packageId: pkg.id,
      packageName: pkg.name,
      phoneNumber: normalizedPhone,
      amountKes: Number(pkg.priceKes),
      status: 'pending',
      provider: 'palpluss',
      merchantReference: merchantReference,
    });

    const endpointUrl = resolvePalplussStkUrl(rawApiUrl);
    const maskedPhone = normalizedPhone.length >= 7 
      ? `${normalizedPhone.slice(0, 6)}****${normalizedPhone.slice(-3)}`
      : '****';

    console.log(`[PalPluss] Initiating STK Push to ${endpointUrl} for ${maskedPhone}, amount: ${pkg.priceKes}`);

    // PalPluss uses HTTP Basic Auth with API Key as the username and empty password
    const basicAuthHeader = apiKey.startsWith('Basic ')
      ? apiKey
      : `Basic ${Buffer.from(apiKey.includes(':') ? apiKey : `${apiKey}:`).toString('base64')}`;

    // Build standard PalPluss STK Push payload with exact DB package price
    const payload: Record<string, any> = {
      amount: Math.round(Number(pkg.priceKes)),
      phone: normalizedPhone,
      phone_number: normalizedPhone,
      accountReference: merchantReference,
      account_reference: merchantReference,
      reference: merchantReference,
      callbackUrl: callbackUrl,
      callback_url: callbackUrl,
      transactionDesc: `WiFi ${pkg.name.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 13) || 'WiFi Access',
      transaction_desc: `WiFi ${pkg.name.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 13) || 'WiFi Access',
      description: `WiFi ${pkg.name.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 13) || 'WiFi Access',
    };

    if (merchantId && merchantId.trim()) {
      payload.channelId = merchantId.trim();
      payload.channel_id = merchantId.trim();
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuthHeader,
        'X-API-Key': apiKey,
      };
      if (merchantId && merchantId.trim()) {
        headers['X-Merchant-Id'] = merchantId.trim();
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resData: any = null;
      try {
        resData = JSON.parse(resText);
      } catch {
        resData = { raw: resText };
      }

      let safeExtractedError = extractErrorMessage(resData, `Gateway error (HTTP ${response.status})`);
      if (response.status === 401) {
        safeExtractedError = 'PalPluss authentication failed. Check your API key in Settings.';
      } else if (response.status === 402 || (typeof safeExtractedError === 'string' && safeExtractedError.toLowerCase().includes('wallet') && safeExtractedError.toLowerCase().includes('balance'))) {
        safeExtractedError = 'PalPluss Service Wallet balance is insufficient to cover transaction fees. Please fund your wallet in PalPluss.';
      }

      if (response.ok) {
        const providerTxnId = resData.transactionId || 
                              resData.transaction_id || 
                              resData.id || 
                              resData.data?.transactionId || 
                              resData.checkoutRequestId || 
                              resData.checkout_request_id || 
                              resData.data?.id;

        const providerRef = resData.providerCheckoutId || 
                            resData.provider_checkout_id || 
                            resData.checkoutRequestId || 
                            resData.reference || 
                            'PALPLUS-STK-SENT';

        await db.updatePayment(merchantReference, {
          providerReference: providerRef,
          providerTransactionId: providerTxnId ? String(providerTxnId) : undefined
        });

        return {
          success: true,
          merchantReference,
          message: 'STK push prompt sent to your phone. Please enter your M-Pesa PIN to complete payment.',
          payment: {
            ...payment,
            providerReference: providerRef,
            providerTransactionId: providerTxnId ? String(providerTxnId) : undefined
          }
        };
      } else {
        // Safe server diagnostic logging
        console.log('[STK PUSH ERROR]', {
          timestamp: new Date().toISOString(),
          packageId: pkg.id,
          amount: pkg.priceKes,
          phone: maskedPhone,
          merchantReference,
          callbackUrl,
          providerStatus: response.status,
          providerResponse: safeExtractedError
        });

        const err: any = new Error(`PalPluss Gateway Error: ${safeExtractedError}`);
        err.code = 'STK_PUSH_FAILED';
        err.details = {
          providerStatus: response.status,
          merchantReference
        };
        throw err;
      }
    } catch (err: any) {
      if (err.code) throw err;
      const finalErrorMsg = extractErrorMessage(err, 'Failed to communicate with PalPluss payment gateway.');
      console.log('[STK PUSH ERROR]', {
        timestamp: new Date().toISOString(),
        packageId: pkg.id,
        amount: pkg.priceKes,
        phone: maskedPhone,
        merchantReference,
        callbackUrl,
        internalError: finalErrorMsg
      });
      const customErr: any = new Error(finalErrorMsg);
      customErr.code = 'STK_PUSH_FAILED';
      throw customErr;
    }
  },

  /**
   * Verifies status of a payment by merchantReference.
   * If still pending, actively queries PalPluss API to confirm real-time status.
   */
  async verifyPayment(merchantReference: string) {
    const payment = await db.getPaymentByMerchantRef(merchantReference);
    if (!payment) {
      throw new Error('Payment reference not found.');
    }

    // If already finalized, return immediately
    if (payment.status === 'successful' || payment.status === 'failed' || payment.status === 'cancelled') {
      return payment;
    }

    // If payment is pending and we have an API key and PalPluss transaction ID, query PalPluss status
    const sysSettings = await db.getSystemSettings();
    const apiKey = (sysSettings.palplussApiKey || process.env.PALPLUS_API_KEY || '').trim();
    const rawApiUrl = sysSettings.palplussApiUrl || process.env.PALPLUS_API_URL || 'https://api.palpluss.com/v1';

    if (apiKey && apiKey.length > 5 && payment.providerTransactionId) {
      try {
        const statusUrl = resolvePalplussStatusUrl(rawApiUrl, payment.providerTransactionId);
        const basicAuthHeader = apiKey.startsWith('Basic ')
          ? apiKey
          : `Basic ${Buffer.from(apiKey.includes(':') ? apiKey : `${apiKey}:`).toString('base64')}`;

        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': basicAuthHeader,
            'X-API-Key': apiKey,
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[PalPluss Status Query] ${payment.providerTransactionId}:`, data);

          const statusStr = (data.status || data.data?.status || data.transaction?.status || '').toUpperCase();
          
          if (statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || statusStr === 'SUCCESSFUL' || statusStr === 'PAID') {
            const mpesaReceipt = data.providerReference || 
                                 data.mpesaReceiptNumber || 
                                 data.data?.mpesaReceiptNumber || 
                                 data.transaction?.mpesaReceiptNumber || 
                                 'MPESA-VERIFIED';

            const processResult = await this.processCallback({
              merchantReference: payment.merchantReference,
              status: 'successful',
              providerReference: mpesaReceipt,
              providerTransactionId: payment.providerTransactionId,
              rawPayload: data
            });

            return processResult.payment || payment;
          } else if (statusStr === 'FAILED' || statusStr === 'CANCELLED' || statusStr === 'REJECTED' || statusStr === 'TIMEOUT') {
            const updated = await db.updatePayment(payment.merchantReference, {
              status: 'failed',
              callbackPayload: data
            });
            return updated || payment;
          }
        }
      } catch (err: any) {
        console.warn('[PalPluss Status Polling Error]:', err.message);
      }
    }

    return payment;
  },

  /**
   * Processes payment callback / webhook with strict idempotency and instant WiFi activation
   */
  async processCallback(payload: {
    merchantReference: string;
    status: 'successful' | 'failed' | 'cancelled';
    providerReference?: string;
    providerTransactionId?: string;
    amount?: number;
    rawPayload?: any;
  }) {
    const { merchantReference, status, providerReference, providerTransactionId, rawPayload } = payload;

    const existingPayment = await db.getPaymentByMerchantRef(merchantReference);
    if (!existingPayment) {
      throw new Error(`Payment with reference ${merchantReference} not found.`);
    }

    // Idempotency check: if already completed, do not re-process
    if (existingPayment.status === 'successful') {
      const activeSessions = await db.getSessions('active');
      const matchedSession = activeSessions.find(s => s.paymentId === existingPayment.id);
      return { success: true, message: 'Payment already processed.', payment: existingPayment, session: matchedSession };
    }

    // Update payment record
    const updatedPayment = await db.updatePayment(merchantReference, {
      status: status,
      providerReference: providerReference || existingPayment.providerReference,
      providerTransactionId: providerTransactionId || existingPayment.providerTransactionId,
      callbackPayload: rawPayload,
      paidAt: status === 'successful' ? new Date().toISOString() : undefined
    });

    // If payment was successful, grant WiFi access
    if (status === 'successful' && updatedPayment) {
      const pkg = await db.getPackageById(updatedPayment.packageId);
      const durationMinutes = pkg ? pkg.durationMinutes : 60;

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);
      const mikrotikUsername = `usr_${updatedPayment.phoneNumber}`;

      // Create session in Database
      const session = await db.createSession({
        paymentId: updatedPayment.id,
        packageId: updatedPayment.packageId,
        packageName: pkg ? pkg.name : 'WiFi Access',
        phoneNumber: updatedPayment.phoneNumber,
        mikrotikUsername: mikrotikUsername,
        deviceMac: rawPayload?.macAddress || rawPayload?.deviceMac || undefined,
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'active'
      });

      // Synchronize with MikroTik HotSpot Router
      try {
        await mikrotikService.createHotspotUser({
          username: mikrotikUsername,
          password: updatedPayment.phoneNumber.slice(-4), // Simple 4-digit pin from phone
          profile: 'default',
          limitUptimeMinutes: durationMinutes,
          macAddress: session.deviceMac
        });
      } catch (err: any) {
        console.error('Failed to sync user with MikroTik router:', err.message);
      }

      return {
        success: true,
        message: 'Payment verified and WiFi access activated.',
        payment: updatedPayment,
        session
      };
    }

    return {
      success: true,
      message: `Payment updated to ${status}.`,
      payment: updatedPayment
    };
  },

  /**
   * Tests gateway connection and sends a test STK prompt to verify PalPluss credentials
   */
  async testPalplussGateway(params: {
    apiKey: string;
    apiUrl?: string;
    phoneNumber: string;
    merchantId?: string;
  }) {
    const { apiKey, apiUrl, phoneNumber, merchantId } = params;
    if (!apiKey || apiKey.length < 5) {
      throw new Error('Please enter a valid PalPluss API Key (starts with pk_live_ or pk_test_).');
    }

    const normalizedPhone = normalizeKenyanPhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Please enter a valid Kenyan phone number (e.g. 0712345678) to send the test STK prompt.');
    }

    const endpointUrl = resolvePalplussStkUrl(apiUrl || 'https://api.palpluss.com/v1');
    const testReference = `TEST-${Date.now().toString().slice(-4)}`;

    const basicAuthHeader = apiKey.startsWith('Basic ')
      ? apiKey
      : `Basic ${Buffer.from(apiKey.includes(':') ? apiKey : `${apiKey}:`).toString('base64')}`;

    const payload = {
      amount: 1, // KSh 1 test charge
      phone: normalizedPhone,
      phone_number: normalizedPhone,
      accountReference: testReference,
      account_reference: testReference,
      reference: testReference,
      transactionDesc: 'PalPluss Test',
      transaction_desc: 'PalPluss Test',
      description: 'PalPluss Test',
      ...(merchantId ? { channelId: merchantId, channel_id: merchantId } : {})
    };

    console.log(`[PalPluss Test] Sending test STK Push to ${endpointUrl} for ${normalizedPhone}`);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuthHeader,
        'X-API-Key': apiKey,
        ...(merchantId ? { 'X-Merchant-Id': merchantId } : {})
      },
      body: JSON.stringify(payload)
    });

    const resText = await response.text();
    let resData: any = null;
    try {
      resData = JSON.parse(resText);
    } catch {
      resData = { raw: resText };
    }

    if (response.ok) {
      return {
        success: true,
        message: `STK Push successfully triggered on phone ${normalizedPhone}! PalPluss API responded OK.`,
        data: resData
      };
    } else {
      const errMsg = extractErrorMessage(resData, `Gateway returned HTTP ${response.status}`);
      throw new Error(errMsg);
    }
  }
};


