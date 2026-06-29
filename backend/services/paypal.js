/**
 * PayPal REST API v2 — Orders API
 * Price: $2.99 USD one-time for unlimited terrible advice
 */
const https = require('https');

const PRICE = '2.99';

function getBaseURL() {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const baseURL = getBaseURL();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(baseURL).hostname,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.access_token) resolve(j.access_token);
          else reject(new Error(`PayPal auth failed: ${data}`));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

/**
 * Create a PayPal order
 * @param {string} fingerprint - user fingerprint (stored in custom_id)
 * @returns {Promise<{orderID: string, status: string, approvalUrl: string}>}
 */
async function createOrder(fingerprint) {
  const token = await getAccessToken();
  const baseURL = getBaseURL();
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5174';

  const body = JSON.stringify({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: PRICE },
      description: 'Terrible Life Advice — Unlimited Questions',
      custom_id: fingerprint,
      soft_descriptor: 'TERRIBLEADVICE',
    }],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
          brand_name: 'Terrible Life Advice',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: frontendURL,
          cancel_url: frontendURL,
        },
      },
    },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseURL}/v2/checkout/orders`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.id) {
            const approvalUrl = j.links?.find((l) => l.rel === 'payer-action')?.href || '';
            resolve({ orderID: j.id, status: j.status, approvalUrl });
          } else {
            reject(new Error(j.message || `PayPal create order failed: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Capture a PayPal order
 * @param {string} orderID
 * @returns {Promise<{status: string, payerEmail: string, amount: string, customId: string}>}
 */
async function captureOrder(orderID) {
  const token = await getAccessToken();
  const baseURL = getBaseURL();

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseURL}/v2/checkout/orders/${orderID}/capture`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.status === 'COMPLETED') {
            const unit = j.purchase_units?.[0];
            const capture = unit?.payments?.captures?.[0];
            resolve({
              status: 'COMPLETED',
              payerEmail: j.payer?.email_address || '',
              amount: capture?.amount?.value || '',
              customId: unit?.custom_id || '',
            });
          } else {
            reject(new Error(`Payment not completed: ${j.status}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = { createOrder, captureOrder, PRICE };
