import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { hoverCapability } from './build/hover-capability.js';

export default defineConfig({
  base: './', // relative asset URLs, so the build works under /bitify/ on GitHub Pages
  plugins: [svelte()],
  css: { postcss: { plugins: [hoverCapability()] } },
  // Archived QA checkouts are generated scratch files, never additional tests.
  // Keep default discovery everywhere else, including future test directories.
  test: { exclude: [...configDefaults.exclude, '.tmp/**'] },
});
