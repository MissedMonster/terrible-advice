<template>
  <div class="paywall-overlay" @click.self="$emit('close')">
    <div class="paywall-card">
      <div class="paywall-icon">🔮</div>
      <h2>The Oracle Demands Tribute</h2>
      <p class="subtitle">
        You've used your 3 free questions. The wisdom well has dried up. But for a small offering, the terrible advice can flow forever.
      </p>
      <div class="price-tag">
        <span class="dollar">$</span>{{ price }}
      </div>
      <p class="price-note">One-time payment · Unlimited terrible advice · No subscription</p>

      <button class="btn-pay" :disabled="loading" @click="$emit('pay')">
        <span v-if="loading" class="spinner"></span>
        {{ loading ? 'Redirecting to PayPal...' : '🔮 Unlock Unlimited Advice' }}
      </button>

      <button class="btn-close" @click="$emit('close')">Maybe later (I'll make my own bad decisions)</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  price: String,
  loading: Boolean,
});

defineEmits(['pay', 'close']);
</script>
