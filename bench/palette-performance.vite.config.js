import base from '../vite.config.js';
import {resolve} from 'node:path';
export default {...base,build:{outDir:'.tmp/palette-phone-build',emptyOutDir:true,rollupOptions:{input:{app:resolve('index.html'),performance:resolve('bench/palette-performance-spike.html')}}}};
