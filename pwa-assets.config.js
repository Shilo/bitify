// Remakes the app icons in public/ from public/favicon.svg: npx @vite-pwa/assets-generator
export default {
  preset: {
    transparent: { sizes: [192, 512], favicons: [] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: '#eeaa30' } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background: '#eeaa30' } },
  },
  images: ['public/favicon.svg'],
};
