<template>
  <div>
    <textarea
      ref="inputEl"
      v-model="question"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown.enter.exact="handleEnter"
      rows="2"
    ></textarea>
    <button
      class="btn-submit"
      :disabled="disabled || !canSubmit"
      @click="submit"
    >
      <span v-if="disabled && question" class="spinner"></span>
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  disabled: Boolean,
  placeholder: String,
});

const emit = defineEmits(['submit']);

const question = ref('');
const inputEl = ref(null);

const canSubmit = computed(() => question.value.trim().length >= 5);

const buttonText = computed(() => {
  if (props.disabled && question.value) return 'Consulting the oracle...';
  if (props.disabled) return 'Loading...';
  return '🃏 Get Terrible Advice';
});

function handleEnter(e) {
  // Submit on Enter, newline on Shift+Enter
  if (!e.shiftKey && canSubmit.value && !props.disabled) {
    e.preventDefault();
    submit();
  }
}

function submit() {
  if (!canSubmit.value || props.disabled) return;
  const q = question.value.trim();
  emit('submit', q);
  question.value = '';
}

// Auto-focus on mount
onMounted(() => {
  inputEl.value?.focus();
});
</script>
