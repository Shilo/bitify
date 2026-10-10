import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { hoverCapability } from './build/hover-capability.js';

export default defineConfig({
  base: './', // relative asset URLs, so the build works under /bitify/ on GitHub Pages
  plugins: [svelte()],
  css: { postcss: { plugins: [hoverCapability()] } },
});
