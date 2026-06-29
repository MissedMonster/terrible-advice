<template>
  <div class="advice-card">
    <!-- Simple Markdown-to-HTML rendering -->
    <div v-html="rendered"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  advice: String,
});

function mdToHTML(md) {
  return md
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Paragraphs (lines that aren't empty)
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

const rendered = computed(() => mdToHTML(props.advice));
</script>
