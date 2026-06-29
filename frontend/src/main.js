import { createApp } from 'vue';
import { inject } from '@vercel/analytics';
import App from './App.vue';
import './style.css';

// Vercel Analytics — page views, visitors, sources
inject();

createApp(App).mount('#app');
