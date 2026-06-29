<template>
  <div class="app-shell">

    <!-- ── Header ── -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">🃏</span>
        <h1>Terrible Life Advice<span class="tm">&trade;</span></h1>
      </div>
      <p class="tagline">AI-powered worst decisions, delivered with unjustified confidence.</p>

      <!-- Usage badge -->
      <div v-if="isPaid" class="badge paid">⚡ Unlimited</div>
      <div v-else class="badge free">
        {{ remaining }} / {{ FREE_LIMIT }} free
      </div>
    </header>

    <!-- ── Loading state (returning from PayPal) ── -->
    <div v-if="captureLoading" class="capture-loading">
      <span class="spinner"></span>
      <p>Completing your payment...</p>
    </div>

    <!-- ── Advice History ── -->
    <div v-for="(item, i) in history" :key="i" class="advice-wrapper">
      <div class="question-bubble">
        <span class="q-label">You asked:</span>
        {{ item.question }}
      </div>
      <AdviceCard :advice="item.advice" />
    </div>

    <!-- ── Input Area ── -->
    <div class="input-area" v-if="!captureLoading">
      <QuestionInput
        :disabled="loading"
        :placeholder="currentPlaceholder"
        @submit="askQuestion"
      />
      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>

    <!-- ── Paywall Overlay ── -->
    <PaywallBanner
      v-if="showPaywall"
      :price="price"
      :loading="payLoading"
      @pay="initiatePayment"
      @close="showPaywall = false"
    />

    <!-- ── Footer ── -->
    <footer class="footer">
      <p>© 2026 Terrible Life Advice™ — Not responsible for any decisions you actually follow.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import QuestionInput from './components/QuestionInput.vue';
import AdviceCard from './components/AdviceCard.vue';
import PaywallBanner from './components/PaywallBanner.vue';

const FREE_LIMIT = 3;

// ── State ──
const history = ref([]);
const loading = ref(false);
const error = ref('');
const fingerprint = ref('');
const remaining = ref(FREE_LIMIT);
const isPaid = ref(false);
const totalAsked = ref(0);
const showPaywall = ref(false);
const payLoading = ref(false);
const captureLoading = ref(false);
const price = ref('2.99');

const currentPlaceholder = ref('e.g., Should I quit my job and become a professional turtle trainer?');

const funnyPlaceholders = [
  'e.g., Should I quit my job and become a professional turtle trainer?',
  'e.g., My roommate thinks the moon is following them. What do I do?',
  'e.g., Is it weird to bring a cantaloupe to a job interview as a "conversation starter"?',
  'e.g., How do I convince my cat to pay rent?',
  'e.g., Should I respond to my ex\'s LinkedIn endorsement of "Strategic Napping"?',
  'e.g., My boss wants me to "think outside the box" but I literally work in a cube. Help.',
  'e.g., Is "professional pillow fort architect" a viable career path?',
];

// ── Fingerprint (persist in localStorage) ──
function getFingerprint() {
  const key = 'tla_fingerprint';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = 'tla_' + crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

// ── Lifecycle ──
onMounted(async () => {
  fingerprint.value = getFingerprint();

  // Rotate placeholder
  const idx = Math.floor(Math.random() * funnyPlaceholders.length);
  currentPlaceholder.value = funnyPlaceholders[idx];

  // Check for PayPal return
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const savedOrderId = sessionStorage.getItem('tla_order_id');

  if (token && savedOrderId) {
    captureLoading.value = true;
    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: token }),
      });
      const data = await res.json();
      if (res.ok && data.isPaid) {
        isPaid.value = true;
        remaining.value = Infinity;
        showPaywall.value = false;
        sessionStorage.removeItem('tla_order_id');
        // Clean URL
        window.history.replaceState({}, '', '/');
      } else {
        error.value = data.error || 'Payment verification failed. Please try again.';
      }
    } catch (e) {
      error.value = 'Payment verification failed: ' + e.message;
    } finally {
      captureLoading.value = false;
    }
  }
});

// ── Ask question ──
async function askQuestion(question) {
  error.value = '';

  // Check if paywall should show
  if (!isPaid.value && remaining.value <= 0) {
    showPaywall.value = true;
    return;
  }

  loading.value = true;

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, fingerprint: fingerprint.value }),
    });

    const data = await res.json();

    if (res.status === 402) {
      // Free limit reached
      remaining.value = 0;
      showPaywall.value = true;
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    // Success
    history.value.push({ question, advice: data.advice });
    remaining.value = data.remaining;
    isPaid.value = data.isPaid;
    totalAsked.value = data.totalAsked;

    // Scroll to latest advice
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);

    // Rotate placeholder for next question
    const idx = Math.floor(Math.random() * funnyPlaceholders.length);
    currentPlaceholder.value = funnyPlaceholders[idx];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

// ── PayPal payment ──
async function initiatePayment() {
  payLoading.value = true;
  error.value = '';

  try {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fingerprint.value }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create payment');
    }

    // Save order ID before redirect
    sessionStorage.setItem('tla_order_id', data.orderID);

    // Redirect to PayPal
    window.location.href = data.approvalUrl;
  } catch (e) {
    error.value = e.message;
    payLoading.value = false;
  }
}
</script>
