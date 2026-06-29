/**
 * Terrible Life Advice — API Routes
 *
 * POST /api/ask              — Ask a question, get terrible advice
 * GET  /api/paypal/config    — Get PayPal client ID + price
 * POST /api/paypal/create-order   — Create PayPal order
 * POST /api/paypal/capture-order  — Capture payment, unlock unlimited
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAdvice } = require('../services/claude');
const { createOrder, captureOrder, PRICE } = require('../services/paypal');

const FREE_LIMIT = 3;

// ── JSON file persistence ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (_) { /* corrupted file, start fresh */ }
  return {};
}

function saveUsers(users) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Periodic cleanup: remove unpaid users older than 7 days
function cleanupUsers() {
  const users = loadUsers();
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [fp, data] of Object.entries(users)) {
    if (!data.paid && now - new Date(data.createdAt).getTime() > SEVEN_DAYS) {
      delete users[fp];
      changed = true;
    }
  }
  if (changed) saveUsers(users);
}
setInterval(cleanupUsers, 60 * 60 * 1000); // hourly
cleanupUsers(); // run on startup

// ── Order → fingerprint mapping (in-memory, session only) ──────────────
const orderMap = new Map();
// Cleanup stale orders every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [oid, { ts }] of orderMap) {
    if (now - ts > 30 * 60 * 1000) orderMap.delete(oid);
  }
}, 30 * 60 * 1000);

// ── Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/ask
 * Body: { question: string, fingerprint: string }
 * Returns: { advice: string, remaining: number, isPaid: boolean }
 * Returns 402 if free limit reached and not paid.
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, fingerprint } = req.body;

    if (!question || !fingerprint) {
      return res.status(400).json({ error: 'question and fingerprint are required' });
    }

    if (question.trim().length < 5) {
      return res.status(400).json({ error: 'Question is too short. Give me something to work with!' });
    }

    // Load or create user
    const users = loadUsers();
    let user = users[fingerprint];
    if (!user) {
      user = { count: 0, paid: false, createdAt: new Date().toISOString() };
      users[fingerprint] = user;
    }

    // Check limits
    if (!user.paid && user.count >= FREE_LIMIT) {
      // Don't save here — user hasn't consumed anything
      return res.status(402).json({
        error: 'Free limit reached',
        remaining: 0,
        isPaid: false,
        message: 'You\'ve used all 3 free questions. Pay $2.99 for unlimited terrible advice!',
      });
    }

    // Get advice from Claude
    const result = await getAdvice(question);

    // Update user
    user.count++;
    saveUsers(users);

    const remaining = user.paid ? Infinity : Math.max(0, FREE_LIMIT - user.count);

    res.json({
      advice: result.text,
      usage: result.usage,
      remaining,
      isPaid: user.paid,
      totalAsked: user.count,
    });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: 'Failed to generate advice. Try again!' });
  }
});

/**
 * GET /api/paypal/config
 * Returns PayPal client ID and price for the frontend.
 */
router.get('/paypal/config', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    price: PRICE,
    mode: process.env.PAYPAL_MODE || 'sandbox',
  });
});

/**
 * POST /api/paypal/create-order
 * Body: { fingerprint: string }
 * Returns: { orderID, status, approvalUrl }
 */
router.post('/paypal/create-order', async (req, res) => {
  try {
    const { fingerprint } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ error: 'fingerprint is required' });
    }

    const result = await createOrder(fingerprint);

    // Map order to fingerprint for later lookup on capture
    orderMap.set(result.orderID, { fingerprint, ts: Date.now() });

    res.json(result);
  } catch (err) {
    console.error('PayPal create order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment' });
  }
});

/**
 * POST /api/paypal/capture-order
 * Body: { orderID: string }
 * Returns: { status, remaining: Infinity, isPaid: true }
 */
router.post('/paypal/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: 'orderID is required' });
    }

    const result = await captureOrder(orderID);

    // Mark user as paid
    const mapping = orderMap.get(orderID);
    if (mapping) {
      const users = loadUsers();
      const fp = mapping.fingerprint;
      if (!users[fp]) {
        users[fp] = { count: 0, paid: true, createdAt: new Date().toISOString() };
      } else {
        users[fp].paid = true;
      }
      saveUsers(users);
      orderMap.delete(orderID);
    }

    res.json({
      status: 'COMPLETED',
      isPaid: true,
      remaining: Infinity,
      message: 'Payment successful! You now have unlimited terrible advice.',
      payerEmail: result.payerEmail,
    });
  } catch (err) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ error: err.message || 'Failed to capture payment' });
  }
});

module.exports = router;
