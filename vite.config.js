import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset URLs, so the build works under /bitify/ on GitHub Pages
  plugins: [svelte()],
});
